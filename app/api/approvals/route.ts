import { NextResponse } from "next/server";
import { approvalActionSchema } from "@/lib/validation/import";
import { runAiGeneration } from "@/lib/ai/generate";
import { requireEntityContext, safeAudit, updateWorkspaceStatus } from "@/lib/db/server-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WORKSPACE_BY_CODE } from "@/lib/workspaces/config";
import type { WorkspaceCode } from "@/types/workspace";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const payload = approvalActionSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message ?? "Invalid approval payload." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase environment variables are not configured." }, { status: 500 });
  }

  const { data: approval, error: approvalError } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("id", payload.data.approvalId)
    .maybeSingle();

  if (approvalError) return NextResponse.json({ error: approvalError.message }, { status: 500 });
  if (!approval) return NextResponse.json({ error: "Approval request was not found." }, { status: 404 });

  const contextResult = await requireEntityContext(approval.entity_id);
  if ("error" in contextResult) {
    return NextResponse.json({ error: contextResult.error }, { status: contextResult.status });
  }

  const { context } = contextResult;

  if (payload.data.action === "request_regeneration") {
    return handleRegeneration(supabase, approval, context, payload.data.notes);
  }

  const { data: beforeRecord } = await supabase.from(approval.record_table).select("*").eq("id", approval.record_id).maybeSingle();
  if (!beforeRecord) return NextResponse.json({ error: "Target record was not found." }, { status: 404 });

  if (payload.data.action === "edit_and_approve") {
    return handleEditAndApprove(supabase, approval, beforeRecord, context, {
      action: "edit_and_approve",
      notes: payload.data.notes,
      editedTitle: payload.data.editedTitle,
      editedDescription: payload.data.editedDescription
    });
  }

  // approve or reject
  return handleApproveReject(supabase, approval, beforeRecord, context, {
    action: payload.data.action as "approve" | "reject",
    notes: payload.data.notes
  });
}

// ─── citation guard (PRD §11.3, §17.4) ───────────────────────────────────────
// AI-generated records in evidence-based modules must have at least one cited
// source before they can be approved. If the ai_run_sources table has no rows for
// the ai_run linked to this record, the approval is blocked with a 409.
async function assertCitations(supabase: SupabaseClient, approval: any, beforeRecord: any): Promise<string | null> {
  if (approval.request_type !== "ai_review") return null;
  if (!beforeRecord.ai_run_id) return "AI draft is missing an ai_run_id — cannot verify citations.";

  const { count } = await supabase
    .from("ai_run_sources")
    .select("id", { count: "exact", head: true })
    .eq("ai_run_id", beforeRecord.ai_run_id);

  if (!count || count === 0) {
    return "This AI draft has no source citations. Add approved upstream records before running generation, or reject and regenerate with better upstream context.";
  }
  return null;
}

// ─── approve / reject ─────────────────────────────────────────────────────────
async function handleApproveReject(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  approval: any,
  beforeRecord: any,
  context: any,
  payload: { action: "approve" | "reject"; notes?: string }
) {
  // PRD §11.3: block approval of uncited AI drafts.
  if (payload.action === "approve") {
    const citationError = await assertCitations(supabase!, approval, beforeRecord);
    if (citationError) return NextResponse.json({ error: citationError }, { status: 409 });
  }

  const nextStatus = payload.action === "approve" ? "approved" : "rejected";
  const nextVersion = payload.action === "approve" ? Number(beforeRecord.version ?? 1) + 1 : Number(beforeRecord.version ?? 1);

  const { data: updatedRecord, error: updateError } = await supabase!
    .from(approval.record_table)
    .update({ status: nextStatus, version: nextVersion })
    .eq("id", approval.record_id)
    .select("*")
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await commitApprovalSideEffects({ supabase: supabase!, approval, beforeRecord, updatedRecord, context, payload, nextVersion });

  // When approving, mark any downstream workspace_data_links pointing to this record's
  // previous version as stale so the workspace_status.stale_links counter stays accurate.
  if (payload.action === "approve") {
    await refreshStaleLinkCounters(supabase!, approval.entity_id, approval.record_id, Number(beforeRecord.version ?? 1));
  }

  return NextResponse.json({ approvalId: approval.id, status: nextStatus, record: updatedRecord });
}

// ─── edit_and_approve ─────────────────────────────────────────────────────────
async function handleEditAndApprove(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  approval: any,
  beforeRecord: any,
  context: any,
  payload: { action: "edit_and_approve"; notes?: string; editedTitle?: string; editedDescription?: string }
) {
  const citationError = await assertCitations(supabase!, approval, beforeRecord);
  if (citationError) return NextResponse.json({ error: citationError }, { status: 409 });

  const nextVersion = Number(beforeRecord.version ?? 1) + 1;
  const updates: Record<string, unknown> = { status: "approved", version: nextVersion };
  if (payload.editedTitle !== undefined) updates.title = payload.editedTitle;
  if (payload.editedDescription !== undefined) updates.description = payload.editedDescription;

  const { data: updatedRecord, error: updateError } = await supabase!
    .from(approval.record_table)
    .update(updates)
    .eq("id", approval.record_id)
    .select("*")
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await commitApprovalSideEffects({
    supabase: supabase!,
    approval,
    beforeRecord,
    updatedRecord,
    context,
    payload: { action: "approve", notes: payload.notes },
    nextVersion
  });

  await refreshStaleLinkCounters(supabase!, approval.entity_id, approval.record_id, Number(beforeRecord.version ?? 1));

  return NextResponse.json({ approvalId: approval.id, status: "approved", record: updatedRecord });
}

// ─── request_regeneration ─────────────────────────────────────────────────────
async function handleRegeneration(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  approval: any,
  context: any,
  notes?: string
) {
  if (approval.request_type !== "ai_review") {
    return NextResponse.json({ error: "Regeneration is only available for AI-generated drafts." }, { status: 400 });
  }

  const workspaceCode = approval.workspace_code as WorkspaceCode;
  if (!workspaceCode || !WORKSPACE_BY_CODE[workspaceCode]) {
    return NextResponse.json({ error: "Cannot determine workspace for this approval." }, { status: 400 });
  }

  // Mark the old draft as superseded so version history is preserved.
  await supabase!.from(approval.record_table).update({ status: "superseded" }).eq("id", approval.record_id);

  await supabase!.from("approval_requests").update({
    status: "cancelled",
    reviewer_notes: notes ?? "Reviewer requested a new AI generation run."
  }).eq("id", approval.id);

  await safeAudit({
    entityId: approval.entity_id,
    profileId: context.profileId,
    eventType: "approval.regeneration_requested",
    resourceType: approval.record_table,
    resourceId: approval.record_id,
    metadata: { approval_id: approval.id, workspace_code: workspaceCode, notes: notes ?? null }
  });

  // Run a fresh AI generation with the same target.
  try {
    const result = await runAiGeneration({
      supabase: supabase!,
      entityId: approval.entity_id,
      cycleId: context.cycle?.id ?? null,
      workspaceCode,
      targetTable: approval.record_table,
      profileId: context.profileId
    });

    return NextResponse.json({ approvalId: approval.id, status: "regenerating", newAiRunId: result.aiRunId, newRecordId: result.generatedRecordId });
  } catch (error: any) {
    return NextResponse.json({ error: `Regeneration failed: ${error.message}` }, { status: 500 });
  }
}

// ─── shared side-effects ──────────────────────────────────────────────────────
async function commitApprovalSideEffects({
  supabase,
  approval,
  beforeRecord,
  updatedRecord,
  context,
  payload,
  nextVersion
}: {
  supabase: SupabaseClient;
  approval: any;
  beforeRecord: any;
  updatedRecord: any;
  context: any;
  payload: { action: "approve" | "reject"; notes?: string };
  nextVersion: number;
}) {
  const isApprove = payload.action === "approve";
  const nextStatus = isApprove ? "approved" : "rejected";

  await supabase.from("approval_requests").update({
    status: nextStatus,
    reviewer_notes: payload.notes ?? null
  }).eq("id", approval.id);

  await supabase.from("version_history").insert({
    entity_id: approval.entity_id,
    record_table: approval.record_table,
    record_id: approval.record_id,
    version: nextVersion,
    snapshot: updatedRecord,
    change_summary: isApprove ? "Approved through Approval Center." : "Rejected through Approval Center.",
    created_by: context.profileId
  });

  if (beforeRecord.ai_run_id) {
    await supabase.from("ai_runs").update({
      status: nextStatus,
      reviewed_by: context.profileId,
      approved_record_id: isApprove ? approval.record_id : null
    }).eq("id", beforeRecord.ai_run_id);
  }

  if (approval.workspace_code) {
    await updateWorkspaceStatus({
      client: supabase,
      entityId: approval.entity_id,
      cycleId: updatedRecord.strategic_cycle_id ?? null,
      workspaceCode: approval.workspace_code,
      completionPercent: isApprove ? 75 : undefined,
      dataReadinessScore: isApprove ? 85 : undefined,
      pendingApprovalsDelta: -1,
      status: isApprove ? "approved" : "in_progress"
    });
  }

  await safeAudit({
    entityId: approval.entity_id,
    profileId: context.profileId,
    eventType: `approval.${payload.action}`,
    resourceType: approval.record_table,
    resourceId: approval.record_id,
    beforeState: beforeRecord,
    afterState: updatedRecord,
    metadata: { approval_id: approval.id, notes: payload.notes ?? null }
  });
}

// ─── stale_links counter ──────────────────────────────────────────────────────
// When a record version advances (on approve), workspace_data_links that still
// reference the old version become stale. Tally those per downstream workspace
// and write the count to workspace_status.stale_links (PRD §13.2).
async function refreshStaleLinkCounters(
  supabase: SupabaseClient,
  entityId: string,
  recordId: string,
  oldVersion: number
) {
  const { data: staleLinks } = await supabase
    .from("workspace_data_links")
    .select("target_workspace_code")
    .eq("entity_id", entityId)
    .eq("source_record_id", recordId)
    .eq("source_record_version", oldVersion);

  if (!staleLinks || staleLinks.length === 0) return;

  // Count stale links per target workspace.
  const countByWorkspace = new Map<string, number>();
  for (const link of staleLinks) {
    if (!link.target_workspace_code) continue;
    countByWorkspace.set(link.target_workspace_code, (countByWorkspace.get(link.target_workspace_code) ?? 0) + 1);
  }

  // Fetch current stale_links values and increment.
  await Promise.all(
    Array.from(countByWorkspace.entries()).map(async ([workspaceCode, delta]) => {
      const { data: row } = await supabase
        .from("workspace_status")
        .select("id, stale_links")
        .eq("entity_id", entityId)
        .eq("workspace_code", workspaceCode)
        .maybeSingle();

      if (!row) return;
      await supabase
        .from("workspace_status")
        .update({ stale_links: Math.max(0, Number(row.stale_links ?? 0) + delta) })
        .eq("id", row.id);
    })
  );
}
