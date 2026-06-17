import { NextResponse } from "next/server";
import { requireEntityContext, requireCapability, safeAudit } from "@/lib/db/server-helpers";

// PATCH /api/cycles/[cycleId]/activate — switch active cycle.
// Deactivates all other active cycles for the entity, then sets this one to 'active'.
// Workspace pages immediately reflect the switch because getAppContext() fetches
// the latest active cycle on every server render.
export async function PATCH(_request: Request, { params }: { params: { cycleId: string } }) {
  const { cycleId } = params;

  // Fetch the cycle first (without entity context so we can derive entityId).
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });

  const { data: cycle, error: fetchError } = await supabase
    .from("strategic_cycles")
    .select("*")
    .eq("id", cycleId)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!cycle) return NextResponse.json({ error: "Cycle not found." }, { status: 404 });

  const contextResult = await requireEntityContext(cycle.entity_id);
  if ("error" in contextResult) return NextResponse.json({ error: contextResult.error }, { status: contextResult.status });

  const { context } = contextResult;

  const capError = requireCapability(context.role, "admin");
  if (capError) return NextResponse.json({ error: capError.error }, { status: capError.status });

  // Deactivate all other active cycles for this entity.
  await supabase
    .from("strategic_cycles")
    .update({ status: "completed" })
    .eq("entity_id", cycle.entity_id)
    .eq("status", "active")
    .neq("id", cycleId);

  const { data: activated, error: activateError } = await supabase
    .from("strategic_cycles")
    .update({ status: "active" })
    .eq("id", cycleId)
    .select("*")
    .single();

  if (activateError) return NextResponse.json({ error: activateError.message }, { status: 500 });

  await safeAudit({
    entityId: cycle.entity_id,
    profileId: context.profileId,
    eventType: "cycle.activated",
    resourceType: "strategic_cycles",
    resourceId: cycleId,
    beforeState: cycle,
    afterState: activated,
    metadata: {}
  });

  return NextResponse.json({ cycle: activated });
}
