import { PageHeader } from "@/components/layout/page-header";
import { AuthRequired } from "@/components/layout/auth-required";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAppContext } from "@/lib/db/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function AiRunsPage() {
  const context = await getAppContext();
  if (!context.entity) return <AuthRequired />;
  const supabase = createSupabaseServerClient();
  const { data } = supabase
    ? await supabase.from("ai_runs").select("*").eq("entity_id", context.entity.id).order("created_at", { ascending: false }).limit(50)
    : { data: [] };

  return (
    <>
      <PageHeader
        eyebrow="AI governance"
        title="AI Run History"
        description="Audit prompt templates, input snapshots, output JSON, confidence, model, and review status."
      />
      <div className="grid gap-4">
        {(data ?? []).map((run: any) => (
          <Card key={run.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-text">{run.prompt_template ?? "AI run"}</div>
                <p className="mt-1 text-sm text-text-muted">{run.output_markdown ?? "No generated output markdown stored."}</p>
                <div className="mt-2 text-xs text-text-muted">{run.workspace_code} / {run.model} / {formatDate(run.created_at)}</div>
              </div>
              <Badge status={run.status}>{run.status}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

