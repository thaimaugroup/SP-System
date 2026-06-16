import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

type VersionRow = {
  id: string;
  record_id: string;
  record_table: string;
  version: number;
  change_summary: string | null;
  snapshot: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
};

// Compact per-module version history. Shows who changed what and when, with the
// status at that snapshot — gives reviewers confidence that every edit is tracked
// and old versions remain accessible (PRD §8.3, §17.5).
export function VersionHistoryPanel({ rows, moduleLabel }: { rows: VersionRow[]; moduleLabel: string }) {
  if (rows.length === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <History className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 className="text-base font-semibold tracking-tight text-text">Version history — {moduleLabel}</h2>
        <span className="ml-auto text-xs text-text-subtle">{rows.length} snapshot{rows.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="divide-y divide-border">
        {rows.map((row) => {
          const snap = row.snapshot as any;
          return (
            <div key={row.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span className="mt-0.5 flex h-6 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-bold tabular-nums text-text-muted">
                v{row.version}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-text truncate">
                    {snap?.title ?? "Record"}
                  </span>
                  {snap?.status ? <Badge domain="record" status={snap.status} dot={false} /> : null}
                </div>
                <p className="mt-0.5 text-xs text-text-muted">{row.change_summary ?? "No summary"}</p>
                <p className="mt-0.5 text-xs text-text-subtle">{formatDate(row.created_at)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
