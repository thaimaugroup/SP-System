import { buildStrategicSynthesis } from "@/lib/ai/router";
import { safeAudit, updateWorkspaceStatus } from "@/lib/db/server-helpers";
import { WORKSPACE_BY_CODE, WORKSPACES } from "@/lib/workspaces/config";
import type { BusinessRecord } from "@/types/database";
import type { WorkspaceCode } from "@/types/workspace";
import type { SupabaseClient } from "@supabase/supabase-js";

type SourceRecord = BusinessRecord & { source_table: string; source_workspace_code: string };

// Shared AI generation core — called by both the /api/ai/generate route and
// request_regeneration in /api/approvals. Returns { aiRunId, generatedRecordId, confidence_score }
// or throws on failure.
export async function runAiGeneration({
  supabase,
  entityId,
  cycleId,
  workspaceCode,
  targetTable,
  profileId
}: {
  supabase: SupabaseClient;
  entityId: string;
  cycleId: string | null;
  workspaceCode: WorkspaceCode;
  targetTable: string;
  profileId: string | null;
}) {
  const workspace = WORKSPACE_BY_CODE[workspaceCode];
  if (!workspace) throw new Error("Unsupported workspace code.");

  const generationStart = Date.now();
  const upstreamRecords = await collectUpstreamRecords(supabase, entityId, cycleId, workspaceCode);
  const synthesis = buildStrategicSynthesis(upstreamRecords);
  const latencyMs = Date.now() - generationStart;
  const promptTemplate = `${workspaceCode}_strategic_synthesis_v1`;

  const { data: aiRun, error: aiRunError } = await supabase
    .from("ai_runs")
    .insert({
      entity_id: entityId,
      workspace_code: workspaceCode,
      target_table: targetTable,
      prompt_template: promptTemplate,
      prompt_version: 1,
      input_snapshot: {
        entity_id: entityId,
        cycle_id: cycleId,
        upstream_record_count: upstreamRecords.length,
        upstream_records: upstreamRecords.slice(0, 30)
      },
      output_json: synthesis,
      output_markdown: synthesis.summary,
      model: process.env.SIOS_LLM_MODEL ?? "sios-local-synthesis-v0",
      confidence_score: synthesis.confidence_score,
      latency_ms: latencyMs,
      token_usage: { input_tokens: upstreamRecords.length * 120, output_tokens: 180, note: "estimated-local-synthesis" },
      status: "ready_for_review",
      created_by: profileId
    })
    .select("*")
    .single();

  if (aiRunError) throw new Error(aiRunError.message);

  const { data: generatedRecord, error: recordError } = await supabase
    .from(targetTable)
    .insert({
      entity_id: entityId,
      strategic_cycle_id: cycleId,
      title: `AI draft - ${workspace.shortName}`,
      description: synthesis.summary,
      data: synthesis,
      source_type: "ai",
      ai_run_id: aiRun.id,
      status: "ai_draft",
      created_by: profileId
    })
    .select("*")
    .single();

  if (recordError) throw new Error(recordError.message);

  const citedRecords = upstreamRecords.filter((r) => r.status === "approved").slice(0, 8);
  if (citedRecords.length > 0) {
    await Promise.all([
      supabase.from("ai_run_sources").insert(
        citedRecords.map((r) => ({
          entity_id: entityId,
          ai_run_id: aiRun.id,
          source_workspace_code: r.source_workspace_code,
          source_table: r.source_table,
          source_record_id: r.id,
          source_record_version: r.version ?? 1,
          citation_label: r.title,
          citation_summary: r.description,
          relevance_score: 0.85,
          created_by: profileId
        }))
      ),
      supabase.from("workspace_data_links").insert(
        citedRecords.map((r) => ({
          entity_id: entityId,
          source_workspace_code: r.source_workspace_code,
          source_table: r.source_table,
          source_record_id: r.id,
          source_record_version: r.version ?? 1,
          target_workspace_code: workspaceCode,
          target_table: targetTable,
          target_record_id: generatedRecord.id,
          target_record_version: generatedRecord.version ?? 1,
          link_type: "ai_upstream_evidence",
          link_strength: 0.85,
          metadata: { ai_run_id: aiRun.id, prompt_template: promptTemplate },
          created_by: profileId
        }))
      ),
      supabase.from("data_lineage_edges").insert(
        citedRecords.map((r) => ({
          entity_id: entityId,
          source_type: "workspace_record",
          source_table: r.source_table,
          source_id: r.id,
          source_version: r.version ?? 1,
          target_type: "ai_generated_record",
          target_table: targetTable,
          target_id: generatedRecord.id,
          target_version: generatedRecord.version ?? 1,
          edge_type: "ai_generation_input",
          metadata: { ai_run_id: aiRun.id },
          created_by: profileId
        }))
      )
    ]);
  }

  await supabase.from("approval_requests").insert({
    entity_id: entityId,
    workspace_code: workspaceCode,
    record_table: targetTable,
    record_id: generatedRecord.id,
    record_version: generatedRecord.version ?? 1,
    request_type: "ai_review",
    status: "pending",
    requested_by: profileId,
    created_by: profileId
  });

  await supabase.from("version_history").insert({
    entity_id: entityId,
    record_table: targetTable,
    record_id: generatedRecord.id,
    version: generatedRecord.version ?? 1,
    snapshot: generatedRecord,
    change_summary: "AI draft generated from linked upstream records.",
    created_by: profileId
  });

  await updateWorkspaceStatus({
    client: supabase,
    entityId,
    cycleId,
    workspaceCode,
    completionPercent: 50,
    dataReadinessScore: citedRecords.length > 0 ? 80 : 45,
    pendingApprovalsDelta: 1,
    status: "in_progress"
  });

  await safeAudit({
    entityId,
    profileId,
    eventType: "ai.generated",
    resourceType: "ai_runs",
    resourceId: aiRun.id,
    afterState: { ai_run: aiRun, generated_record: generatedRecord },
    metadata: { workspace_code: workspaceCode, target_table: targetTable }
  });

  return { aiRunId: aiRun.id, generatedRecordId: generatedRecord.id, confidence_score: synthesis.confidence_score };
}

async function collectUpstreamRecords(
  supabase: SupabaseClient,
  entityId: string,
  cycleId: string | null,
  workspaceCode: WorkspaceCode
): Promise<SourceRecord[]> {
  const workspace = WORKSPACE_BY_CODE[workspaceCode];
  const upstreamWorkspaces = WORKSPACES.filter((w) => workspace.upstream.includes(w.code));
  const results: SourceRecord[] = [];

  for (const upstream of upstreamWorkspaces) {
    for (const mod of upstream.modules) {
      const query = supabase
        .from(mod.table)
        .select("*")
        .eq("entity_id", entityId)
        .eq("status", "approved")
        .order("updated_at", { ascending: false })
        .limit(10);

      const { data } = cycleId ? await query.eq("strategic_cycle_id", cycleId) : await query;
      results.push(
        ...((data ?? []) as BusinessRecord[]).map((r) => ({
          ...r,
          source_table: mod.table,
          source_workspace_code: upstream.code
        }))
      );
    }
  }

  return results;
}
