import { NextResponse } from "next/server";
import { recordCreateSchema } from "@/lib/validation/import";
import { requireEntityContext, requireCapability, safeAudit, updateWorkspaceStatus, workspaceCodeForTable } from "@/lib/db/server-helpers";

export async function POST(request: Request) {
  const payload = recordCreateSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message ?? "Invalid record payload." }, { status: 400 });
  }

  const contextResult = await requireEntityContext(payload.data.entity_id);
  if ("error" in contextResult) {
    return NextResponse.json({ error: contextResult.error }, { status: contextResult.status });
  }

  const { supabase, context } = contextResult;

  const capError = requireCapability(context.role, "create");
  if (capError) return NextResponse.json({ error: capError.error }, { status: capError.status });

  const workspaceCode = payload.data.workspace_code ?? workspaceCodeForTable(payload.data.table);

  const { data: record, error } = await supabase
    .from(payload.data.table)
    .insert({
      entity_id: payload.data.entity_id,
      strategic_cycle_id: payload.data.strategic_cycle_id ?? context.cycle?.id ?? null,
      title: payload.data.title,
      description: payload.data.description ?? null,
      data: payload.data.data,
      source_type: "manual",
      status: payload.data.status,
      created_by: context.profileId
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("version_history").insert({
    entity_id: payload.data.entity_id,
    record_table: payload.data.table,
    record_id: record.id,
    version: record.version ?? 1,
    snapshot: record,
    change_summary: "Manual record created.",
    created_by: context.profileId
  });

  if (workspaceCode && payload.data.status === "ready_for_review") {
    await supabase.from("approval_requests").insert({
      entity_id: payload.data.entity_id,
      workspace_code: workspaceCode,
      record_table: payload.data.table,
      record_id: record.id,
      record_version: record.version ?? 1,
      request_type: "manual_review",
      status: "pending",
      requested_by: context.profileId,
      created_by: context.profileId
    });
  }

  if (workspaceCode) {
    await updateWorkspaceStatus({
      client: supabase,
      entityId: payload.data.entity_id,
      cycleId: payload.data.strategic_cycle_id ?? context.cycle?.id ?? null,
      workspaceCode,
      completionPercent: payload.data.status === "approved" ? 65 : 35,
      dataReadinessScore: 70,
      pendingApprovalsDelta: payload.data.status === "ready_for_review" ? 1 : 0
    });
  }

  await safeAudit({
    entityId: payload.data.entity_id,
    profileId: context.profileId,
    eventType: "record.created",
    resourceType: payload.data.table,
    resourceId: record.id,
    afterState: record,
    metadata: { workspace_code: workspaceCode }
  });

  return NextResponse.json({ record });
}

