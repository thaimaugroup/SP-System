"use client";

import { useState } from "react";
import { Archive, Trash2 } from "lucide-react";
import type { BusinessRecord } from "@/types/database";

// Governed row actions. Archive is always offered (soft, lineage-preserving).
// Hard delete is only offered for disposable statuses; the API is the source of
// truth and will still reject a delete that has downstream consumers.
const DELETABLE_STATUSES = new Set(["draft", "import_staged", "ai_draft", "rejected"]);

export function RecordRowActions({
  record,
  entityId,
  table
}: {
  record: BusinessRecord;
  entityId: string;
  table: string;
}) {
  const [busy, setBusy] = useState<null | "archive" | "delete">(null);
  const [error, setError] = useState<string | null>(null);

  const isArchived = record.status === "archived";
  const canDelete = DELETABLE_STATUSES.has(record.status);

  async function run(action: "archive" | "delete") {
    if (action === "delete" && !window.confirm("Hard-delete this record? This cannot be undone. Approved or linked records are blocked.")) {
      return;
    }
    setBusy(action);
    setError(null);
    const response = await fetch("/api/records/lifecycle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_id: entityId, table, record_id: record.id, action })
    });
    const body = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) {
      setError(body.error ?? "Action failed.");
      return;
    }
    // Realtime UPDATE (archive) or DELETE (delete) reconciles the table automatically.
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {!isArchived ? (
        <button
          type="button"
          onClick={() => run("archive")}
          disabled={busy !== null}
          title="Archive (soft, keeps lineage)"
          aria-label="Archive record"
          className="inline-flex min-h-8 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-text-muted transition hover:bg-surface-muted hover:text-text disabled:opacity-50"
        >
          <Archive className="h-3.5 w-3.5" />
          {busy === "archive" ? "..." : "Archive"}
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          onClick={() => run("delete")}
          disabled={busy !== null}
          title="Hard delete (draft-only, blocked if linked)"
          aria-label="Delete record"
          className="inline-flex min-h-8 items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-danger transition hover:bg-danger-soft disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {busy === "delete" ? "..." : "Delete"}
        </button>
      ) : null}
      {error ? <span className="text-xs text-danger" role="alert">{error}</span> : null}
    </div>
  );
}
