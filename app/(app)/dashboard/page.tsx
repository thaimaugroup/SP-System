import { AlertTriangle, CheckCircle2, Clock, Database } from "lucide-react";
import { AuthRequired } from "@/components/layout/auth-required";
import { PageHeader } from "@/components/layout/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { WorkspaceGrid } from "@/components/dashboard/workspace-grid";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiHealthChart } from "@/components/charts/kpi-health-chart";
import { getAppContext, getDashboardData } from "@/lib/db/queries";
import { formatDate } from "@/lib/utils";
import type { StatusDomain } from "@/lib/status";

export default async function DashboardPage() {
  const context = await getAppContext();
  if (!context.entity) return <AuthRequired />;

  const data = await getDashboardData(context.entity.id, context.cycle?.id ?? null);
  const completion =
    data.workspaceStatus.length === 0
      ? 0
      : data.workspaceStatus.reduce((sum, item) => sum + Number(item.completion_percent), 0) / data.workspaceStatus.length;
  const pendingApprovals = data.workspaceStatus.reduce((sum, item) => sum + Number(item.pending_approvals), 0);
  const staleLinks = data.workspaceStatus.reduce((sum, item) => sum + Number(item.stale_links), 0);

  return (
    <>
      <PageHeader
        eyebrow={`${context.entity.code} / ${context.cycle?.name ?? "No active cycle"}`}
        title="Executive Overview"
        description="Monitor strategic cycle progress, workspace readiness, AI activity, imports, approvals, memory, and KPI health for the selected entity."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Workspace completion" value={`${Math.round(completion)}%`} helper="Average completion across WS01-WS12." tone="success" />
        <MetricCard label="Pending approvals" value={`${pendingApprovals}`} helper="Open human review items." tone={pendingApprovals > 0 ? "warning" : "success"} />
        <MetricCard label="Data quality warnings" value={`${staleLinks}`} helper="Stale or missing linked data warnings." tone={staleLinks > 0 ? "danger" : "success"} />
        <MetricCard label="AI runs" value={`${data.aiRuns.length}`} helper="Latest logged AI generation runs." />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.8fr)]">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-text">Workspace completion</h2>
          </div>
          <WorkspaceGrid statuses={data.workspaceStatus} />
        </section>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Top strategic priorities</CardTitle>
                <CardDescription>Approved priorities from WS07.</CardDescription>
              </div>
            </CardHeader>
            <div className="space-y-3">
              {data.priorities.length === 0 ? <SmallEmpty text="No priorities approved yet." /> : null}
              {data.priorities.map((item) => (
                <MiniRecord key={item.id} title={item.title ?? "Priority"} description={item.description} status={item.status} domain="record" />
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Latest AI runs</CardTitle>
                <CardDescription>Generated outputs awaiting review or already approved.</CardDescription>
              </div>
            </CardHeader>
            <div className="space-y-3">
              {data.aiRuns.length === 0 ? <SmallEmpty text="No AI runs logged yet." /> : null}
              {data.aiRuns.map((run: any) => (
                <MiniRecord key={run.id} title={run.prompt_template ?? "AI run"} description={`${run.workspace_code ?? "Workspace"} / ${formatDate(run.created_at)}`} status={run.status} domain="ai" />
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>KPI health snapshot</CardTitle>
              <CardDescription>Line chart uses target and actual values from WS10 readings.</CardDescription>
            </div>
          </CardHeader>
          <KpiHealthChart readings={data.kpis} />
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent imports and memory</CardTitle>
              <CardDescription>Operational activity from import batches and WS12 memory.</CardDescription>
            </div>
          </CardHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-text">
                <Database className="h-4 w-4 text-primary" /> Recent imports
              </div>
              <div className="space-y-2">
                {data.imports.length === 0 ? <SmallEmpty text="No import batches yet." /> : null}
                {data.imports.map((batch) => (
                  <MiniRecord key={batch.id} title={batch.target_table ?? "Import batch"} description={`${batch.row_count} rows`} status={batch.status} domain="import" />
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-text">
                <Clock className="h-4 w-4 text-primary" /> Memory entries
              </div>
              <div className="space-y-2">
                {data.memory.length === 0 ? <SmallEmpty text="No memory entries yet." /> : null}
                {data.memory.map((memory) => (
                  <MiniRecord key={memory.id} title={memory.title ?? "Memory"} description={memory.description} status={memory.status} domain="record" />
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function MiniRecord({
  title,
  description,
  status,
  domain
}: {
  title: string;
  description?: string | null;
  status: string;
  domain: StatusDomain;
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-text">{title}</div>
        <Badge domain={domain} status={status} />
      </div>
      {description ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-muted">{description}</p> : null}
    </div>
  );
}

function SmallEmpty({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-border p-3 text-sm text-text-muted">
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      {text}
    </div>
  );
}
