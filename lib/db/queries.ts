import { cache } from "react";
import type {
  BusinessRecord,
  ImportBatch,
  SiosEntity,
  StrategicCycle,
  WorkspaceLink,
  WorkspaceStatusRow
} from "@/types/database";
import type { WorkspaceCode } from "@/types/workspace";
import { ALLOWED_TARGET_TABLES, WORKSPACE_BY_CODE, WORKSPACES } from "@/lib/workspaces/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppContext = {
  userId: string | null;
  profileId: string | null;
  profile: {
    email: string | null;
    full_name: string | null;
    title: string | null;
  } | null;
  entity: SiosEntity | null;
  cycle: StrategicCycle | null;
  role: string | null;
};

// Memoized per server request: the authenticated layout and each page both need
// the app context, but without this cache() each caller would re-run auth.getUser()
// (a network round-trip to Supabase Auth) plus the context RPC. Deduping halves the
// auth/RPC latency on every navigation. The cache is per-request, so it never leaks
// across users or requests.
export const getAppContext = cache(async (): Promise<AppContext> => {
  const supabase = createSupabaseServerClient();
  if (!supabase) return emptyContext();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return emptyContext();

  const { data: rpcContext, error: rpcError } = await supabase
    .rpc("get_current_app_context" as never)
    .maybeSingle();

  if (!rpcError && rpcContext) {
    const row = rpcContext as {
      profile_id: string | null;
      profile: AppContext["profile"];
      entity: SiosEntity | null;
      cycle: StrategicCycle | null;
      role: string | null;
    };

    return {
      userId: user.id,
      profileId: row.profile_id,
      profile: row.profile ?? null,
      entity: row.entity ?? null,
      cycle: row.cycle ?? null,
      role: row.role ?? null
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, default_entity_id, email, full_name, title")
    .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
    .maybeSingle();

  if (!profile) return { ...emptyContext(), userId: user.id };

  const { data: roleRow } = await supabase
    .from("user_entity_roles")
    .select("entity_id, role")
    .eq("user_id", profile.id)
    .limit(1)
    .maybeSingle();

  const entityId = profile.default_entity_id ?? roleRow?.entity_id;
  const profileContext = {
    email: profile.email ?? null,
    full_name: profile.full_name ?? null,
    title: profile.title ?? null
  };

  if (!entityId) return { userId: user.id, profileId: profile.id, profile: profileContext, entity: null, cycle: null, role: roleRow?.role ?? null };

  const [{ data: entity }, { data: cycle }] = await Promise.all([
    supabase.from("entities").select("*").eq("id", entityId).maybeSingle(),
    supabase
      .from("strategic_cycles")
      .select("*")
      .eq("entity_id", entityId)
      .eq("status", "active")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  return {
    userId: user.id,
    profileId: profile.id,
    profile: profileContext,
    entity: (entity as SiosEntity | null) ?? null,
    cycle: (cycle as StrategicCycle | null) ?? null,
    role: roleRow?.role ?? null
  };
});

function emptyContext(): AppContext {
  return { userId: null, profileId: null, profile: null, entity: null, cycle: null, role: null };
}

export async function getEntitiesForCurrentUser() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];

  const context = await getAppContext();
  if (!context.profileId) return [];

  const { data } = await supabase
    .from("user_entity_roles")
    .select("role, entities(*)")
    .eq("user_id", context.profileId);

  return data ?? [];
}

export async function getDashboardData(entityId: string, cycleId: string | null) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return {
      workspaceStatus: [],
      priorities: [],
      risks: [],
      aiRuns: [],
      imports: [],
      approvals: [],
      memory: [],
      kpis: []
    };
  }

  const cycleFilter = cycleId ? { strategic_cycle_id: cycleId } : {};

  const [
    workspaceStatus,
    priorities,
    risks,
    aiRuns,
    imports,
    approvals,
    memory,
    kpis
  ] = await Promise.all([
    supabase.from("workspace_status").select("*").eq("entity_id", entityId).order("workspace_code"),
    supabase.from("ws07_strategic_priorities").select("*").match({ entity_id: entityId, ...cycleFilter }).order("created_at", { ascending: false }).limit(5),
    supabase.from("ws07_risk_scores").select("*").match({ entity_id: entityId, ...cycleFilter }).order("created_at", { ascending: false }).limit(5),
    supabase.from("ai_runs").select("*").eq("entity_id", entityId).order("created_at", { ascending: false }).limit(5),
    supabase.from("import_batches").select("*").eq("entity_id", entityId).order("created_at", { ascending: false }).limit(5),
    supabase.from("approval_requests").select("*").eq("entity_id", entityId).eq("status", "pending").order("created_at", { ascending: false }).limit(5),
    supabase.from("ws12_memory_entries").select("*").match({ entity_id: entityId, ...cycleFilter }).order("created_at", { ascending: false }).limit(5),
    supabase.from("ws10_kpi_readings").select("*").match({ entity_id: entityId, ...cycleFilter }).order("created_at", { ascending: false }).limit(6)
  ]);

  return {
    workspaceStatus: (workspaceStatus.data ?? []) as WorkspaceStatusRow[],
    priorities: (priorities.data ?? []) as BusinessRecord[],
    risks: (risks.data ?? []) as BusinessRecord[],
    aiRuns: aiRuns.data ?? [],
    imports: (imports.data ?? []) as ImportBatch[],
    approvals: approvals.data ?? [],
    memory: (memory.data ?? []) as BusinessRecord[],
    kpis: (kpis.data ?? []) as BusinessRecord[]
  };
}

export async function getWorkspaceData(code: WorkspaceCode, entityId: string, cycleId: string | null, table?: string) {
  const supabase = createSupabaseServerClient();
  const workspace = WORKSPACE_BY_CODE[code];
  const activeModule = workspace.modules.find((module) => module.table === table) ?? workspace.modules[0];

  if (!supabase) {
    return { workspace, activeModule, records: [], upstreamLinks: [], downstreamLinks: [] };
  }

  const cycleFilter = cycleId ? { strategic_cycle_id: cycleId } : {};
  const [records, upstreamLinks, downstreamLinks] = await Promise.all([
    supabase
      .from(activeModule.table)
      .select("*")
      .match({ entity_id: entityId, ...cycleFilter })
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("workspace_data_links")
      .select("*")
      .eq("entity_id", entityId)
      .eq("target_workspace_code", code)
      .limit(25),
    supabase
      .from("workspace_data_links")
      .select("*")
      .eq("entity_id", entityId)
      .eq("source_workspace_code", code)
      .limit(25)
  ]);

  const enrichedUpstream = await markStaleLinks(supabase, (upstreamLinks.data ?? []) as WorkspaceLink[]);

  return {
    workspace,
    activeModule,
    records: (records.data ?? []) as BusinessRecord[],
    upstreamLinks: enrichedUpstream,
    downstreamLinks: (downstreamLinks.data ?? []) as WorkspaceLink[]
  };
}

// Compares each link's captured source_record_version against the live version of
// the source record. When the upstream record has advanced, the link is flagged stale
// so the UI can warn that downstream work may rest on outdated evidence (PRD §13.2).
async function markStaleLinks(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  links: WorkspaceLink[]
): Promise<WorkspaceLink[]> {
  if (!supabase || links.length === 0) return links;

  const idsByTable = new Map<string, Set<string>>();
  for (const link of links) {
    if (!link.source_table || !link.source_record_id) continue;
    if (!ALLOWED_TARGET_TABLES.has(link.source_table)) continue;
    if (!idsByTable.has(link.source_table)) idsByTable.set(link.source_table, new Set());
    idsByTable.get(link.source_table)!.add(link.source_record_id);
  }

  const versionByRecord = new Map<string, number>();
  await Promise.all(
    Array.from(idsByTable.entries()).map(async ([table, ids]) => {
      const { data } = await supabase.from(table).select("id, version").in("id", Array.from(ids));
      for (const row of (data ?? []) as { id: string; version: number }[]) {
        versionByRecord.set(`${table}:${row.id}`, Number(row.version ?? 1));
      }
    })
  );

  return links.map((link) => {
    const currentVersion = versionByRecord.get(`${link.source_table}:${link.source_record_id}`) ?? null;
    const linkedVersion = Number(link.source_record_version ?? 1);
    return {
      ...link,
      current_source_version: currentVersion,
      is_stale: currentVersion !== null && currentVersion > linkedVersion
    };
  });
}

export async function getVersionHistory(entityId: string, table: string, limit = 20) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("version_history")
    .select("*")
    .eq("entity_id", entityId)
    .eq("record_table", table)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getCommandCenterData(entityId: string) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase.from("workspace_status").select("*").eq("entity_id", entityId).order("workspace_code");
  return WORKSPACES.map((workspace) => ({
    workspace,
    status: (data ?? []).find((row) => row.workspace_code === workspace.code) as WorkspaceStatusRow | undefined
  }));
}

export async function getLineageData(entityId: string) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { links: [], edges: [] };

  const [links, edges] = await Promise.all([
    supabase.from("workspace_data_links").select("*").eq("entity_id", entityId).order("created_at", { ascending: false }).limit(100),
    supabase.from("data_lineage_edges").select("*").eq("entity_id", entityId).order("created_at", { ascending: false }).limit(100)
  ]);

  return {
    links: (links.data ?? []) as WorkspaceLink[],
    edges: edges.data ?? []
  };
}
