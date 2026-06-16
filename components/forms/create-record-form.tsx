"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CreateRecordForm({
  entityId,
  cycleId,
  table,
  workspaceCode
}: {
  entityId: string;
  cycleId: string | null;
  table: string;
  workspaceCode: string;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const response = await fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_id: entityId,
        strategic_cycle_id: cycleId,
        table,
        workspace_code: workspaceCode,
        title,
        description,
        data: {},
        status
      })
    });

    const body = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(body.error ?? "Unable to create record.");
      return;
    }

    setTitle("");
    setDescription("");
    setMessage("Record created — it appears in the table above instantly via realtime.");
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-surface p-4 shadow-card">
      <h2 className="text-base font-semibold tracking-tight text-text">Create record</h2>
      <div className="mt-4 grid gap-4">
        <label className="grid gap-1 text-sm font-semibold text-text">
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            className="min-h-10 rounded-md border border-border px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-text">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-24 rounded-md border border-border px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-text">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="min-h-10 rounded-md border border-border px-3 py-2 text-sm font-normal"
          >
            <option value="draft">Draft</option>
            <option value="ready_for_review">Ready for review</option>
            <option value="approved">Approved</option>
          </select>
        </label>
        {message ? <p role="status" className="text-sm text-text-muted">{message}</p> : null}
        <Button type="submit" disabled={loading}>
          <Plus className="h-4 w-4" />
          {loading ? "Creating..." : "Create record"}
        </Button>
      </div>
    </form>
  );
}

