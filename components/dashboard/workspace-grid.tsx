import { WORKSPACES } from "@/lib/workspaces/config";
import type { WorkspaceStatusRow } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ButtonLink } from "@/components/ui/button";

export function WorkspaceGrid({ statuses }: { statuses: WorkspaceStatusRow[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {WORKSPACES.map((workspace) => {
        const status = statuses.find((item) => item.workspace_code === workspace.code);
        return (
          <Card key={workspace.code} interactive className="flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center rounded border border-primary-soft bg-primary-soft px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-primary">
                  {workspace.code}
                </div>
                <h3 className="mt-2 text-base font-semibold tracking-tight text-text">{workspace.name}</h3>
              </div>
              <Badge domain="workspace" status={status?.status ?? "not_started"} />
            </div>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-text-muted">{workspace.purpose}</p>
            <div className="mt-4">
              <div className="mb-2 flex justify-between text-xs font-medium text-text-muted">
                <span>Completion</span>
                <span>{Math.round(status?.completion_percent ?? 0)}%</span>
              </div>
              <Progress value={status?.completion_percent ?? 0} />
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
              <span>{status?.pending_approvals ?? 0} approvals</span>
              <ButtonLink href={`/workspaces/${workspace.code}`} variant="ghost" className="min-h-9 px-2 py-1">
                Open
              </ButtonLink>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
