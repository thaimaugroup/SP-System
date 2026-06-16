import { NextResponse } from "next/server";
import { entityCreateSchema } from "@/lib/validation/import";
import { getAppContext } from "@/lib/db/queries";
import { safeAudit } from "@/lib/db/server-helpers";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const WORKSPACE_CODES = ["WS01","WS02","WS03","WS04","WS05","WS06","WS07","WS08","WS09","WS10","WS11","WS12"];

// POST /api/entities — create a new legal entity / business unit (PRD §8.1).
// Only owner/admin of an existing entity (i.e. within the same group) may create one.
// Uses the service-role client because creating an entity touches several RLS-guarded
// tables (entities, user_entity_roles, workspace_status) in one transaction-like flow,
// and the creator has no role on the new entity until we grant it.
export async function POST(request: Request) {
  const payload = entityCreateSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message ?? "Invalid entity payload." }, { status: 400 });
  }

  const context = await getAppContext();
  if (!context.profileId || !context.entity) {
    return NextResponse.json({ error: "Authentication and an active entity are required." }, { status: 401 });
  }
  if (context.role !== "owner" && context.role !== "admin") {
    return NextResponse.json({ error: "Only owner and admin roles can create new entities." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required on the server to create entities." }, { status: 503 });
  }

  const groupId = (context.entity as any).group_id;
  if (!groupId) {
    return NextResponse.json({ error: "Current entity has no group; cannot derive group for the new entity." }, { status: 400 });
  }

  // Unique code check within the group.
  const { data: existing } = await admin
    .from("entities")
    .select("id")
    .eq("group_id", groupId)
    .ilike("code", payload.data.code)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: `An entity with code "${payload.data.code}" already exists in this group.` }, { status: 409 });
  }

  // 1. Create the entity.
  const { data: entity, error: entityError } = await admin
    .from("entities")
    .insert({
      group_id: groupId,
      name: payload.data.name,
      code: payload.data.code.toUpperCase(),
      entity_type: payload.data.entity_type,
      industry: payload.data.industry ?? null,
      geography: payload.data.geography ?? null,
      base_currency: payload.data.base_currency.toUpperCase(),
      status: "active",
      created_by: context.profileId
    })
    .select("*")
    .single();

  if (entityError) return NextResponse.json({ error: entityError.message }, { status: 500 });

  // 2. Grant the creator owner role on the new entity.
  const { error: roleError } = await admin.from("user_entity_roles").insert({
    user_id: context.profileId,
    entity_id: entity.id,
    role: "owner",
    created_by: context.profileId
  });
  if (roleError) return NextResponse.json({ error: roleError.message }, { status: 500 });

  // 3. Optional initial strategic cycle (active).
  let cycleId: string | null = null;
  if (payload.data.create_default_cycle) {
    const year = new Date().getFullYear();
    const { data: cycle } = await admin
      .from("strategic_cycles")
      .insert({
        entity_id: entity.id,
        name: `FY${year} Strategic Cycle`,
        cycle_type: "annual",
        start_date: `${year}-01-01`,
        end_date: `${year}-12-31`,
        status: "active",
        created_by: context.profileId
      })
      .select("id")
      .single();
    cycleId = cycle?.id ?? null;
  }

  // 4. Seed 12 workspace_status rows so Command Center & Dashboard render.
  await admin.from("workspace_status").insert(
    WORKSPACE_CODES.map((code) => ({
      entity_id: entity.id,
      strategic_cycle_id: cycleId,
      workspace_code: code,
      status: "not_started",
      completion_percent: 0,
      data_readiness_score: 0,
      pending_approvals: 0,
      stale_links: 0,
      owner_user_id: context.profileId,
      created_by: context.profileId
    }))
  );

  await safeAudit({
    entityId: entity.id,
    profileId: context.profileId,
    eventType: "entity.created",
    resourceType: "entities",
    resourceId: entity.id,
    afterState: entity,
    metadata: { group_id: groupId, created_default_cycle: payload.data.create_default_cycle }
  });

  return NextResponse.json({ entity, cycleId });
}
