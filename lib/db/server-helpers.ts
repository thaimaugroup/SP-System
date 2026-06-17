import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/db/queries";
import { getWorkspaceByTable } from "@/lib/workspaces/config";
import { roleCan, roleLabel, type Capability } from "@/lib/permissions/roles";

// Asserts the context role holds a capability (PRD §10.2). Returns an error
// descriptor (403) when not permitted, or null when allowed. Used by API routes
// to enforce fine-grained RBAC on top of RLS tenant isolation.
export function requireCapability(role: string | null | undefined, capability: Capability) {
  if (roleCan(role, capability)) return null;
  return {
    error: `Your role (${roleLabel(role)}) does not have permission to ${capability} in this workspace.`,
    status: 403 as const
  };
}

export type ServerEntityContext = Awaited<ReturnType<typeof getAppContext>> & {
  entity: NonNullable<Awaited<ReturnType<typeof getAppContext>>["entity"]>;
  profileId: string;
};

export async function requireEntityContext(entityId: string) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase environment variables are not configured.", status: 500 as const };
  }

  const context = await getAppContext();
  if (!context.userId || !context.profileId || !context.entity) {
    return { error: "Authentication and entity access are required.", status: 401 as const };
  }

  if (context.entity.id !== entityId) {
    const { data: role } = await supabase
      .from("user_entity_roles")
      .select("role")
      .eq("user_id", context.profileId)
      .eq("entity_id", entityId)
      .maybeSingle();

    if (!role) {
      return { error: "You do not have access to this entity.", status: 403 as const };
    }
  }

  return { supabase, context: context as ServerEntityContext };
}

export async function safeAudit({
  entityId,
  profileId,
  eventType,
  resourceType,
  resourceId,
  beforeState,
  afterState,
  metadata
}: {
  entityId: string;
  profileId: string | null;
  eventType: string;
  resourceType: string;
  resourceId?: string | null;
  beforeState?: unknown;
  afterState?: unknown;
  metadata?: Record<string, unknown>;
}) {
  const client = createSupabaseAdminClient() ?? createSupabaseServerClient();
  if (!client) return;

  await client.from("audit_logs").insert({
    entity_id: entityId,
    actor_user_id: profileId,
    event_type: eventType,
    resource_type: resourceType,
    resource_id: resourceId ?? null,
    before_state: beforeState ?? null,
    after_state: afterState ?? null,
    metadata: metadata ?? {}
  });
}

export async function updateWorkspaceStatus({
  client,
  entityId,
  cycleId,
  workspaceCode,
  completionPercent,
  dataReadinessScore,
  pendingApprovalsDelta = 0,
  status = "in_progress"
}: {
  client: SupabaseClient;
  entityId: string;
  cycleId: string | null;
  workspaceCode: string;
  completionPercent?: number;
  dataReadinessScore?: number;
  pendingApprovalsDelta?: number;
  status?: string;
}) {
  const { data: existing } = await client
    .from("workspace_status")
    .select("*")
    .eq("entity_id", entityId)
    .eq("workspace_code", workspaceCode)
    .maybeSingle();

  if (!existing) return;

  const nextPending = Math.max(0, Number(existing.pending_approvals ?? 0) + pendingApprovalsDelta);
  await client
    .from("workspace_status")
    .update({
      status,
      completion_percent: completionPercent ?? existing.completion_percent,
      data_readiness_score: dataReadinessScore ?? existing.data_readiness_score,
      pending_approvals: nextPending,
      strategic_cycle_id: existing.strategic_cycle_id ?? cycleId
    })
    .eq("id", existing.id);
}

export function workspaceCodeForTable(table: string) {
  return getWorkspaceByTable(table)?.code ?? null;
}

