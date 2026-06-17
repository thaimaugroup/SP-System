import { NextResponse } from "next/server";
import { requireEntityContext, requireCapability, safeAudit, updateWorkspaceStatus, workspaceCodeForTable } from "@/lib/db/server-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { batchId?: string };
  if (!body.batchId) {
    return NextResponse.json({ error: "batchId is required." }, { status: 400 });
  }

  const bootstrap = await requireBatchContext(body.batchId);
  if ("error" in bootstrap || !("batch" in bootstrap)) {
    return NextResponse.json({ error: bootstrap.error ?? "Import batch context could not be loaded." }, { status: bootstrap.status ?? 500 });
  }

  const { supabase, context, batch } = bootstrap;

  const capError = requireCapability(context.role, "import");
  if (capError) return NextResponse.json({ error: capError.error }, { status: capError.status });

  if (!batch.target_table) {
    return NextResponse.json({ error: "Import batch is missing target_table." }, { status: 400 });
  }

  const { data: rows, error: rowsError } = await supabase
    .from("import_rows")
    .select("*")
    .eq("import_batch_id", batch.id)
    .eq("validation_status", "valid")
    .is("target_record_id", null)
    .order("row_number", { ascending: true });

  if (rowsError) {
    return NextResponse.json({ error: rowsError.message }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: "No valid uncommitted rows are available." }, { status: 400 });
  }

  const inserts = rows.map((row: any) => ({
    entity_id: batch.entity_id,
    strategic_cycle_id: batch.strategic_cycle_id,
    title: row.mapped_data?.title ?? "Imported record",
    description: row.mapped_data?.description ?? null,
    data: row.normalized_data ?? row.raw_data ?? {},
    source_type: "import",
    import_batch_id: batch.id,
    status: "ready_for_review",
    created_by: context.profileId
  }));

  const { data: records, error: insertError } = await supabase.from(batch.target_table).insert(inserts).select("*");
  if (insertError) {
    await supabase.from("import_commit_logs").insert({
      entity_id: batch.entity_id,
      import_batch_id: batch.id,
      action: "commit",
      target_table: batch.target_table,
      row_count: rows.length,
      status: "failed",
      error_message: insertError.message,
      created_by: context.profileId
    });
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const workspaceCode = batch.workspace_code ?? workspaceCodeForTable(batch.target_table);
  const committedRecords = records ?? [];

  await Promise.all(
    committedRecords.map((record: any, index: number) =>
      supabase.from("import_rows").update({ target_record_id: record.id }).eq("id", rows[index].id)
    )
  );

  await supabase.from("version_history").insert(
    committedRecords.map((record: any) => ({
      entity_id: batch.entity_id,
      record_table: batch.target_table,
      record_id: record.id,
      version: record.version ?? 1,
      snapshot: record,
      change_summary: "Record committed from import staging.",
      created_by: context.profileId
    }))
  );

  await supabase.from("approval_requests").insert(
    committedRecords.map((record: any) => ({
      entity_id: batch.entity_id,
      workspace_code: workspaceCode,
      record_table: batch.target_table,
      record_id: record.id,
      record_version: record.version ?? 1,
      request_type: "import_review",
      status: "pending",
      requested_by: context.profileId,
      created_by: context.profileId
    }))
  );

  await supabase.from("workspace_data_links").insert(
    committedRecords.map((record: any, index: number) => ({
      entity_id: batch.entity_id,
      source_workspace_code: null,
      source_table: "import_rows",
      source_record_id: rows[index].id,
      source_record_version: 1,
      target_workspace_code: workspaceCode,
      target_table: batch.target_table,
      target_record_id: record.id,
      target_record_version: record.version ?? 1,
      link_type: "import_to_workspace_record",
      link_strength: 1,
      metadata: { import_batch_id: batch.id, row_number: rows[index].row_number },
      created_by: context.profileId
    }))
  );

  await supabase.from("data_lineage_edges").insert(
    committedRecords.map((record: any, index: number) => ({
      entity_id: batch.entity_id,
      source_type: "import_row",
      source_table: "import_rows",
      source_id: rows[index].id,
      source_version: 1,
      target_type: "workspace_record",
      target_table: batch.target_table,
      target_id: record.id,
      target_version: record.version ?? 1,
      edge_type: "import_commit",
      metadata: { import_batch_id: batch.id },
      created_by: context.profileId
    }))
  );

  await supabase.from("import_commit_logs").insert({
    entity_id: batch.entity_id,
    import_batch_id: batch.id,
    action: "commit",
    target_table: batch.target_table,
    target_record_ids: committedRecords.map((record: any) => record.id),
    row_count: committedRecords.length,
    status: "committed",
    created_by: context.profileId
  });

  await supabase
    .from("import_batches")
    .update({
      status: "committed",
      committed_row_count: committedRecords.length,
      committed_by: context.profileId,
      committed_at: new Date().toISOString()
    })
    .eq("id", batch.id);

  if (workspaceCode) {
    await updateWorkspaceStatus({
      client: supabase,
      entityId: batch.entity_id,
      cycleId: batch.strategic_cycle_id,
      workspaceCode,
      completionPercent: 55,
      dataReadinessScore: 75,
      pendingApprovalsDelta: committedRecords.length,
      status: "in_progress"
    });
  }

  await safeAudit({
    entityId: batch.entity_id,
    profileId: context.profileId,
    eventType: "import.committed",
    resourceType: "import_batches",
    resourceId: batch.id,
    afterState: { committed_row_count: committedRecords.length },
    metadata: { target_table: batch.target_table, workspace_code: workspaceCode }
  });

  return NextResponse.json({ batchId: batch.id, committedRowCount: committedRecords.length });
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
