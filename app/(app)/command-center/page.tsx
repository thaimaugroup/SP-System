import { PageHeader } from "@/components/layout/page-header";
import { AuthRequired } from "@/components/layout/auth-required";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ButtonLink } from "@/components/ui/button";
import { getAppContext, getCommandCenterData } from "@/lib/db/queries";

export default async function CommandCenterPage() {
  const context = await getAppContext();
  if (!context.entity) return <AuthRequired />;
  const rows = await getCommandCenterData(context.entity.id);

  return (
    <>
      <PageHeader
        eyebrow="Workspace graph"
        title="Workspace Command Center"
        description="Manage readiness, dependencies, approval load, and downstream flow across WS01-WS12."
      />
      <div className="grid gap-4">
        {rows.map(({ workspace, status }) => (
          <Card key={workspace.code} className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_220px] lg:items-center">
            <div>
              <div className="text-xs font-semibold text-primary">{workspace.code}</div>
              <h2 className="text-base font-semibold text-text">{workspace.name}</h2>
              <Badge domain="workspace" status={status?.status ?? "not_started"} className="mt-2" />
            </div>
            <div>
              <p className="text-sm leading-6 text-text-muted">{workspace.purpose}</p>
              <div className="mt-3">
                <Progress value={status?.completion_percent ?? 0} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 lg:justify-end">
              <div className="text-right text-xs text-text-muted">
                <div>{status?.pending_approvals ?? 0} approvals</div>
                <div>{status?.stale_links ?? 0} stale links</div>
              </div>
              <ButtonLink href={`/workspaces/${workspace.code}`} variant="secondary">Open</ButtonLink>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
