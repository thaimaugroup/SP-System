import { NextResponse } from "next/server";
import { recordLifecycleSchema } from "@/lib/validation/import";
import { requireEntityContext, safeAudit, updateWorkspaceStatus, workspaceCodeForTable } from "@/lib/db/server-helpers";

// Governed record lifecycle (PRD §8.3, §8.7):
//   - archive: soft-delete via status='archived'. Allowed for any status, preserves
//     lineage and version history. The reusable, non-destructive path.
//   - delete: hard delete. BLOCKED for approved records or any record that still has
//     downstream consumers — those must be archived instead so lineage stays intact.
//     Permitted only for disposable rows (draft / ai_draft / rejected / staged) with
//     no downstream links.
export async function POST(request: Request) {
  const payload = recordLifecycleSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message ?? "Invalid lifecycle payload." }, { status: 400 });
  }

  const { entity_id, table, record_id, action, reason } = payload.data;
  const contextResult = await requireEntityContext(entity_id);
  if ("error" in contextResult) {
    return NextResponse.json({ error: contextResult.error }, { status: contextResult.status });
  }

  const { supabase, context } = contextResult;
  const workspaceCode = workspaceCodeForTable(table);

  const { data: record, error: fetchError } = await supabase
    .from(table)
    .select("*")
    .eq("id", record_id)
    .eq("entity_id", entity_id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!record) {
    return NextResponse.json({ error: "Record was not found in this entity." }, { status: 404 });
  }

  // Downstream dependency probe — a record is "locked" if anything consumes it.
  const { data: downstream } = await supabase
    .from("workspace_data_links")
    .select("id, target_table, target_workspace_code")
    .eq("entity_id", entity_id)
    .eq("source_record_id", record_id)
    .limit(1);

  const hasDownstream = (downstream ?? []).length > 0;
  const wasPendingReview = record.status === "ready_for_review" || record.status === "ai_draft";

  if (action === "delete") {
    if (record.status === "approved") {
      return NextResponse.json(
        { error: "Approved records cannot be hard-deleted. Archive it instead to preserve lineage." },
        { status: 409 }
      );
    }
    if (hasDownstream) {
      return NextResponse.json(
        { error: "This record has downstream consumers. Archive it instead of deleting to keep the lineage graph intact." },
        { status: 409 }
      );
    }

    // Cancel any pending approval request so it does not dangle.
    await supabase
      .from("approval_requests")
      .update({ status: "cancelled", reviewer_notes: reason ?? "Record hard-deleted." })
      .eq("record_table", table)
      .eq("record_id", record_id)
      .eq("status", "pending");

    const { error: deleteError } = await supabase.from(table).delete().eq("id", record_id).eq("entity_id", entity_id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (workspaceCode && wasPendingReview) {
      await updateWorkspaceStatus({
        client: supabase,
        entityId: entity_id,
        cycleId: record.strategic_cycle_id ?? null,
        workspaceCode,
        pendingApprovalsDelta: -1
      });
    }

    await safeAudit({
      entityId: entity_id,
      profileId: context.profileId,
      eventType: "record.deleted",
      resourceType: table,
      resourceId: record_id,
      beforeState: record,
      metadata: { workspace_code: workspaceCode, reason: reason ?? null }
    });

    return NextResponse.json({ recordId: record_id, action: "deleted" });
  }

  // action === "archive" — soft, governed, lineage-preserving.
  if (record.status === "archived") {
    return NextResponse.json({ error: "Record is already archived." }, { status: 409 });
  }

  const { data: archived, error: archiveError } = await supabase
    .from(table)
    .update({ status: "archived" })
    .eq("id", record_id)
    .eq("entity_id", entity_id)
    .select("*")
    .single();

  if (archiveError) {
    return NextResponse.json({ error: archiveError.message }, { status: 500 });
  }

  await supabase
    .from("approval_requests")
    .update({ status: "cancelled", reviewer_notes: reason ?? "Record archived." })
    .eq("record_table", table)
    .eq("record_id", record_id)
    .eq("status", "pending");

  await supabase.from("version_history").insert({
    entity_id,
    record_table: table,
    record_id,
    version: archived.version ?? 1,
    snapshot: archived,
    change_summary: reason ? `Archived: ${reason}` : "Record archived through governed lifecycle.",
    created_by: context.profileId
  });

  if (workspaceCode && wasPendingReview) {
    await updateWorkspaceStatus({
      client: supabase,
      entityId: entity_id,
      cycleId: record.strategic_cycle_id ?? null,
      workspaceCode,
      pendingApprovalsDelta: -1
    });
  }

  await safeAudit({
    entityId: entity_id,
    profileId: context.profileId,
    eventType: "record.archived",
    resourceType: table,
    resourceId: record_id,
    beforeState: record,
    afterState: archived,
    metadata: { workspace_code: workspaceCode, had_downstream: hasDownstream, reason: reason ?? null }
  });

  return NextResponse.json({ recordId: record_id, action: "archived", record: archived });
}
