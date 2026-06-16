import { NextResponse } from "next/server";
import { cycleCreateSchema } from "@/lib/validation/import";
import { requireEntityContext, safeAudit } from "@/lib/db/server-helpers";

// GET /api/cycles?entityId=... — list all cycles for an entity (newest first).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entityId = searchParams.get("entityId");
  if (!entityId) return NextResponse.json({ error: "entityId is required." }, { status: 400 });

  const contextResult = await requireEntityContext(entityId);
  if ("error" in contextResult) return NextResponse.json({ error: contextResult.error }, { status: contextResult.status });

  const { supabase } = contextResult;
  const { data, error } = await supabase
    .from("strategic_cycles")
    .select("*")
    .eq("entity_id", entityId)
    .order("start_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cycles: data ?? [] });
}

// POST /api/cycles — create a new strategic cycle.
// If complete_current=true (default), the currently active cycle is set to 'completed'
// before the new one is created as 'active'. This ensures one active cycle per entity.
export async function POST(request: Request) {
  const payload = cycleCreateSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message ?? "Invalid cycle payload." }, { status: 400 });
  }

  const contextResult = await requireEntityContext(payload.data.entity_id);
  if ("error" in contextResult) return NextResponse.json({ error: contextResult.error }, { status: contextResult.status });

  const { supabase, context } = contextResult;

  if (payload.data.complete_current) {
    await supabase
      .from("strategic_cycles")
      .update({ status: "completed" })
      .eq("entity_id", payload.data.entity_id)
      .eq("status", "active");
  }

  const { data: cycle, error } = await supabase
    .from("strategic_cycles")
    .insert({
      entity_id: payload.data.entity_id,
      name: payload.data.name,
      cycle_type: payload.data.cycle_type,
      start_date: payload.data.start_date,
      end_date: payload.data.end_date,
      status: "active",
      created_by: context.profileId
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await safeAudit({
    entityId: payload.data.entity_id,
    profileId: context.profileId,
    eventType: "cycle.created",
    resourceType: "strategic_cycles",
    resourceId: cycle.id,
    afterState: cycle,
    metadata: { complete_current: payload.data.complete_current }
  });

  return NextResponse.json({ cycle });
}
