import { AlertTriangle } from "lucide-react";
import type { WorkspaceLink } from "@/types/database";
import { Badge } from "@/components/ui/badge";

export function LinkedDataPanel({ upstream, downstream }: { upstream: WorkspaceLink[]; downstream: WorkspaceLink[] }) {
  const staleCount = upstream.filter((link) => link.is_stale).length;

  return (
    <div className="grid gap-4">
      {staleCount > 0 ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-warning-soft p-3 text-sm text-warning"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>{staleCount} upstream source{staleCount > 1 ? "s have" : " has"} a newer version.</strong>{" "}
            Records below may rest on outdated evidence — review and re-approve before relying on them downstream.
          </span>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <LinkList title="Upstream inputs" links={upstream} empty="No upstream records linked yet." showStale />
        <LinkList title="Downstream consumers" links={downstream} empty="No downstream records consuming this workspace yet." />
      </div>
    </div>
  );
}

function LinkList({ title, links, empty, showStale }: { title: string; links: WorkspaceLink[]; empty: string; showStale?: boolean }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-card">
      <h2 className="text-base font-semibold tracking-tight text-text">{title}</h2>
      {links.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">{empty}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {links.map((link) => (
            <div
              key={link.id}
              className={link.is_stale && showStale ? "rounded-md border border-amber-200 bg-warning-soft/40 p-3" : "rounded-md border border-border p-3"}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-text">{link.link_type.replaceAll("_", " ")}</div>
                {link.is_stale && showStale ? (
                  <Badge domain="record" status="superseded">
                    v{link.source_record_version ?? 1} → v{link.current_source_version}
                  </Badge>
                ) : (
                  <Badge status="approved">v{link.source_record_version ?? 1}</Badge>
                )}
              </div>
              <div className="mt-1 text-xs text-text-muted">
                {link.source_table} {"->"} {link.target_table}
                {link.is_stale && showStale ? <span className="ml-1 font-semibold text-warning">· stale source</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
