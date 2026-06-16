"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { WORKSPACES } from "@/lib/workspaces/config";
import { Button } from "@/components/ui/button";

export function ImportUploadForm({ entityId }: { entityId: string }) {
  const [workspaceCode, setWorkspaceCode] = useState("WS01");
  const [targetTable, setTargetTable] = useState(WORKSPACES[0].modules[0].table);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const workspace = WORKSPACES.find((item) => item.code === workspaceCode) ?? WORKSPACES[0];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    form.set("entityId", entityId);
    form.set("workspaceCode", workspaceCode);
    form.set("targetTable", targetTable);

    const response = await fetch("/api/import/upload", {
      method: "POST",
      body: form
    });
    const body = await response.json();
    setLoading(false);
    setMessage(response.ok ? `Import batch ${body.batchId} parsed with ${body.rowCount} rows.` : body.error ?? "Import failed.");
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-surface p-4 shadow-card">
      <h2 className="text-base font-semibold tracking-tight text-text">Upload CSV/XLSX</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <label className="grid gap-1 text-sm font-semibold text-text">
          Workspace
          <select
            value={workspaceCode}
            onChange={(event) => {
              const next = event.target.value;
              const nextWorkspace = WORKSPACES.find((item) => item.code === next) ?? WORKSPACES[0];
              setWorkspaceCode(next);
              setTargetTable(nextWorkspace.modules[0].table);
            }}
            className="min-h-10 rounded-md border border-border px-3 py-2 text-sm font-normal"
          >
            {WORKSPACES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-text">
          Target module
          <select
            value={targetTable}
            onChange={(event) => setTargetTable(event.target.value)}
            className="min-h-10 rounded-md border border-border px-3 py-2 text-sm font-normal"
          >
            {workspace.modules.map((module) => (
              <option key={module.table} value={module.table}>
                {module.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-text">
          File
          <input
            required
            name="file"
            type="file"
            accept=".csv,.xlsx"
            className="min-h-10 rounded-md border border-border bg-white px-3 py-2 text-sm font-normal"
          />
        </label>
      </div>
      <Button type="submit" disabled={loading} className="mt-4">
        <UploadCloud className="h-4 w-4" />
        {loading ? "Uploading..." : "Upload and parse"}
      </Button>
      {message ? <p className="mt-3 text-sm text-text-muted" role="status">{message}</p> : null}
    </form>
  );
}

