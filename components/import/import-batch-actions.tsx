"use client";

import { useState } from "react";
import { CheckCircle2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ImportBatchActions({
  batchId,
  status,
  validRowCount
}: {
  batchId: string;
  status: string;
  validRowCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<null | "commit" | "rollback">(null);
  const [message, setMessage] = useState<string | null>(null);
  const canCommit = validRowCount > 0 && !["committed", "rolled_back", "failed"].includes(status);
  const canRollback = ["committed", "partially_committed"].includes(status);

  async function commit() {
    setLoading("commit");
    setMessage(null);
    const response = await fetch("/api/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId })
    });
    const body = await response.json();
    setLoading(null);

    if (!response.ok) {
      setMessage(body.error ?? "Commit failed.");
      return;
    }

    router.refresh();
  }

  async function rollback() {
    if (!window.confirm("Roll back this committed batch? Committed records will be removed. Approved or linked records will block the rollback.")) {
      return;
    }
    setLoading("rollback");
    setMessage(null);
    const response = await fetch("/api/import/rollback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId })
    });
    const body = await response.json();
    setLoading(null);

    if (!response.ok) {
      setMessage(body.error ?? "Rollback failed.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {canCommit ? (
        <Button type="button" variant="secondary" onClick={commit} disabled={loading !== null} className="min-h-9 px-3 py-1.5">
          <CheckCircle2 className="h-4 w-4" />
          {loading === "commit" ? "Committing..." : "Commit"}
        </Button>
      ) : null}
      {canRollback ? (
        <Button type="button" variant="secondary" onClick={rollback} disabled={loading !== null} className="min-h-9 px-3 py-1.5">
          <Undo2 className="h-4 w-4" />
          {loading === "rollback" ? "Rolling back..." : "Rollback"}
        </Button>
      ) : null}
      {!canCommit && !canRollback ? <span className="text-xs text-text-subtle">No actions</span> : null}
      {message ? <span className="text-xs text-danger" role="alert">{message}</span> : null}
    </div>
  );
}

