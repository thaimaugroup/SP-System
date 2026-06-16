import { NextResponse } from "next/server";
import { aiGenerateSchema } from "@/lib/validation/import";
import { runAiGeneration } from "@/lib/ai/generate";
import { requireEntityContext } from "@/lib/db/server-helpers";
import { WORKSPACE_BY_CODE } from "@/lib/workspaces/config";
import type { WorkspaceCode } from "@/types/workspace";

export async function POST(request: Request) {
  const payload = aiGenerateSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message ?? "Invalid AI generation payload." }, { status: 400 });
  }

  const workspace = WORKSPACE_BY_CODE[payload.data.workspaceCode as WorkspaceCode];
  if (!workspace) {
    return NextResponse.json({ error: "Unsupported workspace code." }, { status: 400 });
  }

  const contextResult = await requireEntityContext(payload.data.entityId);
  if ("error" in contextResult) {
    return NextResponse.json({ error: contextResult.error }, { status: contextResult.status });
  }

  const { supabase, context } = contextResult;

  try {
    const result = await runAiGeneration({
      supabase,
      entityId: payload.data.entityId,
      cycleId: context.cycle?.id ?? null,
      workspaceCode: payload.data.workspaceCode as WorkspaceCode,
      targetTable: payload.data.targetTable,
      profileId: context.profileId
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
