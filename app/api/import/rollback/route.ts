import { NextResponse } from "next/server";
import { importRollbackSchema } from "@/lib/validation/import";
import { requireEntityContext, safeAudit, updateWorkspaceStatus, workspaceCodeForTable } from "@/lib/db/server-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Reverse a committed import batch (PRD §8.4, §17.2).
// Rollback is BLOCKED when any committed record has been superseded/locked — i.e. it
// is now approved or already has downstream consumers — so we never orphan trusted
// strategic data. Otherwise we undo the commit's side effects in dependency order:
// links -> lineage -> approvals -> records -> staging pointers -> batch status.
export async function POST(request: Request) {
  const payload = importRollbackSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message ?? "Invalid rollback payload." }, { status: 400 });
  }

  const bootstrap = await requireBatchContext(payload.data.batchId);
  if ("error" in bootstrap || !("batch" in bootstrap)) {
    return NextResponse.json({ error: bootstrap.error ?? "Import batch context could not be loaded." }, { status: bootstrap.status ?? 500 });
  }

  const { supabase, context, batch } = bootstrap;
  if (!["committed", "partially_committed"].includes(batch.status)) {
    return NextResponse.json({ error: `Only committed batches can be rolled back (current status: ${batch.status}).` }, { status: 400 });
  }
  if (!batch.target_table) {
    return NextResponse.json({ error: "Import batch is missing target_table." }, { status: 400 });
  }

  const { data: committedRows, error: rowsError } = await supabase
    .from("import_rows")
    .select("id, target_record_id")
    .eq("import_batch_id", batch.id)
    .not("target_record_id", "is", null);

  if (rowsError) {
    return NextResponse.json({ error: rowsError.message }, { status: 500 });
  }

  const recordIds = (committedRows ?? []).map((row: any) => row.target_record_id).filter(Boolean) as string[];
  if (recordIds.length === 0) {
    return NextResponse.json({ error: "No committed records found for this batch." }, { status: 400 });
  }

  // Locked-dependency probe: approved records, or records consumed downstream.
  const [{ data: approvedRecords }, { data: downstreamLinks }] = await Promise.all([
    supabase.from(batch.target_table).select("id, status").in("id", recordIds).eq("status", "approved"),
    supabase
      .from("workspace_data_links")
      .select("id, source_record_id")
      .eq("entity_id", batch.entity_id)
      .in("source_record_id", recordIds)
  ]);

  const lockedCount = (approvedRecords ?? []).length;
  const consumedCount = (downstreamLinks ?? []).length;
  if (lockedCount > 0 || consumedCount > 0) {
    return NextResponse.json(
      {
        error: `Rollback blocked: ${lockedCount} record(s) are approved and ${consumedCount} have downstream consumers. Archive superseded records instead.`
      },
      { status: 409 }
    );
  }

  const workspaceCode = batch.workspace_code ?? workspaceCodeForTable(batch.target_table);

  // Undo side effects (reverse of commit).
  await supabase
    .from("workspace_data_links")
    .delete()
    .eq("entity_id", batch.entity_id)
    .eq("target_table", batch.target_table)
    .in("target_record_id", recordIds);

  await supabase
    .from("data_lineage_edges")
    .delete()
    .eq("entity_id", batch.entity_id)
    .eq("target_table", batch.target_table)
    .in("target_id", recordIds);

  await supabase
    .from("approval_requests")
    .update({ status: "cancelled", reviewer_notes: "Cancelled by import rollback." })
    .eq("record_table", batch.target_table)
    .in("record_id", recordIds)
    .eq("status", "pending");

  const { error: deleteError } = await supabase.from(batch.target_table).delete().eq("entity_id", batch.entity_id).in("id", recordIds);
  if (deleteError) {
    await supabase.from("import_commit_logs").insert({
      entity_id: batch.entity_id,
      import_batch_id: batch.id,
      action: "rollback",
      target_table: batch.target_table,
      target_record_ids: recordIds,
      row_count: recordIds.length,
      status: "failed",
      error_message: deleteError.message,
      created_by: context.profileId
    });
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Free the staging pointers so the batch could be re-committed if needed.
  await supabase
    .from("import_rows")
    .update({ target_record_id: null })
    .eq("import_batch_id", batch.id)
    .not("target_record_id", "is", null);

  await supabase.from("import_commit_logs").insert({
    entity_id: batch.entity_id,
    import_batch_id: batch.id,
    action: "rollback",
    target_table: batch.target_table,
    target_record_ids: recordIds,
    row_count: recordIds.length,
    status: "rolled_back",
    created_by: context.profileId
  });

  await supabase
    .from("import_batches")
    .update({
      status: "rolled_back",
      committed_row_count: 0,
      rolled_back_by: context.profileId,
      rolled_back_at: new Date().toISOString()
    })
    .eq("id", batch.id);

  if (workspaceCode) {
    await updateWorkspaceStatus({
      client: supabase,
      entityId: batch.entity_id,
      cycleId: batch.strategic_cycle_id,
      workspaceCode,
      pendingApprovalsDelta: -recordIds.length,
      status: "in_progress"
    });
  }

  await safeAudit({
    entityId: batch.entity_id,
    profileId: context.profileId,
    eventType: "import.rolled_back",
    resourceType: "import_batches",
    resourceId: batch.id,
    beforeState: { committed_row_count: recordIds.length },
    afterState: { rolled_back_row_count: recordIds.length },
    metadata: { target_table: batch.target_table, workspace_code: workspaceCode }
  });

  return NextResponse.json({ batchId: batch.id, rolledBackRowCount: recordIds.length });
}

async function requireBatchContext(batchId: string) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase environment variables are not configured.", status: 500 as const };
  }

  const { data: batch, error } = await supabase.from("import_batches").select("*").eq("id", batchId).maybeSingle();
  if (error) return { error: error.message, status: 500 as const };
  if (!batch) return { error: "Import batch was not found.", status: 404 as const };

  const contextResult = await requireEntityContext(batch.entity_id);
  if ("error" in contextResult) return contextResult;
  return { ...contextResult, batch };
}
