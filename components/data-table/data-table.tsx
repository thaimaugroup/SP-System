import type { BusinessRecord } from "@/types/database";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RecordRowActions } from "@/components/data-table/record-row-actions";

export function DataTable({ records, entityId, table }: { records: BusinessRecord[]; entityId?: string; table?: string }) {
  const showActions = Boolean(entityId && table);

  if (records.length === 0) {
    return (
      <EmptyState
        title="No records yet"
        description="Create a record, import a file, or generate an AI draft to start this module."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-card">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="border-b border-border bg-surface-muted text-xs uppercase tracking-wide text-text-subtle">
          <tr>
            <th className="px-4 py-3 font-semibold">Title</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Version</th>
            <th className="px-4 py-3 font-semibold">Source</th>
            <th className="px-4 py-3 font-semibold">Updated</th>
            {showActions ? <th className="px-4 py-3 text-right font-semibold">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {records.map((record) => (
            <tr key={record.id} className="transition duration-200 hover:bg-surface-muted/70">
              <td className="max-w-md px-4 py-3">
                <div className="font-medium text-text">{record.title ?? "Untitled record"}</div>
                <div className="line-clamp-1 text-xs text-text-muted">{record.description ?? "No description"}</div>
              </td>
              <td className="px-4 py-3">
                <Badge domain="record" status={record.status} />
              </td>
              <td className="px-4 py-3 tabular-nums text-text-muted">v{record.version}</td>
              <td className="px-4 py-3 text-text-muted">{record.source_type}</td>
              <td className="px-4 py-3 text-text-muted">{formatDate(record.updated_at)}</td>
              {showActions ? (
                <td className="px-4 py-3">
                  <RecordRowActions record={record} entityId={entityId!} table={table!} />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
