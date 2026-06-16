import { CheckCircle2, CircleAlert } from "lucide-react";
import type { WorkspaceDefinition } from "@/types/workspace";

export function DependencyChecklist({ workspace }: { workspace: WorkspaceDefinition }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-card">
      <h2 className="text-base font-semibold tracking-tight text-text">Dependency checklist</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Upstream</div>
          <ul className="mt-2 space-y-2">
            {(workspace.upstream.length ? workspace.upstream : ["No required upstream workspace"]).map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-text-muted">
                {workspace.upstream.length ? <CheckCircle2 className="h-4 w-4 text-success" /> : <CircleAlert className="h-4 w-4 text-text-subtle" />}
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Downstream</div>
          <ul className="mt-2 space-y-2">
            {(workspace.downstream.length ? workspace.downstream : ["No downstream consumer configured"]).map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-text-muted">
                {workspace.downstream.length ? <CheckCircle2 className="h-4 w-4 text-info" /> : <CircleAlert className="h-4 w-4 text-text-subtle" />}
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

