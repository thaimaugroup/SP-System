"use client";

import { useState } from "react";
import { BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AiPanel({
  entityId,
  workspaceCode,
  targetTable
}: {
  entityId: string;
  workspaceCode: string;
  targetTable: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityId, workspaceCode, targetTable })
    });
    const body = await response.json();
    setLoading(false);
    setMessage(response.ok ? `AI run saved with confidence ${body.confidence_score ?? "n/a"}.` : body.error ?? "AI generation failed.");
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-text">AI generation panel</h2>
          <p className="mt-1 text-sm leading-6 text-text-muted">
            Generates a reviewable draft from approved upstream records. Human approval is still required.
          </p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-primary-soft" aria-hidden="true">
          <BrainCircuit className="h-4 w-4 text-primary" />
        </span>
      </div>
      <Button onClick={generate} disabled={loading} className="mt-4">
        {loading ? "Generating..." : "Generate with AI"}
      </Button>
      {message ? <p className="mt-3 text-sm text-text-muted" role="status">{message}</p> : null}
    </section>
  );
}

