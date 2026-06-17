"use client";

import { cn } from "@/lib/utils";
import { useLiveRecords } from "@/lib/realtime/use-live-records";
import { DataTable } from "@/components/data-table/data-table";
import type { BusinessRecord } from "@/types/database";

export function LiveModuleRecords({
  table,
  entityId,
  moduleLabel,
  moduleDescription,
  initialRecords,
  canMutate = false
}: {
  table: string;
  entityId: string;
  moduleLabel: string;
  moduleDescription: string;
  initialRecords: BusinessRecord[];
  canMutate?: boolean;
}) {
  const { records, connection, lastEventAt } = useLiveRecords(table, entityId, initialRecords);

  const recentlyChanged = lastEventAt !== null && Date.now() - lastEventAt < 2500;

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-text">{moduleLabel}</h2>
          <p className="mt-1 text-sm text-text-muted">{moduleDescription}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LiveIndicator connection={connection} pulsing={recentlyChanged} />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-semibold tabular-nums text-text-muted">
            {records.length} records
          </span>
        </div>
      </div>
      <DataTable records={records} entityId={canMutate ? entityId : undefined} table={canMutate ? table : undefined} />
    </div>
  );
}

function LiveIndicator({ connection, pulsing }: { connection: string; pulsing: boolean }) {
  const meta =
    connection === "live"
      ? { dot: "bg-success", text: "Live", tone: "text-success border-green-200 bg-success-soft" }
      : connection === "error"
        ? { dot: "bg-danger", text: "Offline", tone: "text-danger border-red-200 bg-danger-soft" }
        : { dot: "bg-warning", text: "Connecting", tone: "text-warning border-amber-200 bg-warning-soft" };

  return (
    <span
      title={
        connection === "live"
          ? "Realtime connected — new and updated records appear instantly."
          : connection === "error"
            ? "Realtime disconnected — reload to refresh."
            : "Connecting to realtime..."
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        meta.tone
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {connection === "live" && pulsing ? (
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", meta.dot)} />
        ) : null}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", meta.dot)} />
      </span>
      {meta.text}
    </span>
  );
}
