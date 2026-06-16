import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppContext } from "@/lib/db/queries";
import { safeAudit } from "@/lib/db/server-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const switchSchema = z.object({ entityId: z.string().uuid() });

// POST /api/entities/switch — change the active entity for the signed-in user.
// SIOS is multi-entity (PRD §8.1): a user may be assigned to several entities and
// switches which one's strategic data they work on. The active entity is stored on
// profiles.default_entity_id and resolved by getAppContext() on every server render.
// Switching is only allowed to entities the user has a user_entity_roles row for —
// RLS would block the data anyway, but we verify up front for a clean error.
export async function POST(request: Request) {
  const payload = switchSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "A valid entityId is required." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });

  const context = await getAppContext();
  if (!context.profileId) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  // Verify the user actually has a role in the target entity.
  const { data: role } = await supabase
    .from("user_entity_roles")
    .select("role")
    .eq("user_id", context.profileId)
    .eq("entity_id", payload.data.entityId)
    .maybeSingle();

  if (!role) {
    return NextResponse.json({ error: "You do not have access to that entity." }, { status: 403 });
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ default_entity_id: payload.data.entityId })
    .eq("id", context.profileId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await safeAudit({
    entityId: payload.data.entityId,
    profileId: context.profileId,
    eventType: "entity.switched",
    resourceType: "profiles",
    resourceId: context.profileId,
    metadata: { from_entity: context.entity?.id ?? null, to_entity: payload.data.entityId }
  });

  return NextResponse.json({ entityId: payload.data.entityId, role: role.role });
}
