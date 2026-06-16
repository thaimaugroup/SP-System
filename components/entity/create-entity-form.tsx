"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// Create a new legal entity / business unit. Visible only to owner/admin (gated by
// the parent). On success the new entity appears in the switcher and the creator is
// granted owner role on it.
export function CreateEntityForm({ canCreate }: { canCreate: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        code: form.get("code"),
        entity_type: form.get("entity_type"),
        industry: form.get("industry") || undefined,
        geography: form.get("geography") || undefined,
        base_currency: form.get("base_currency") || "VND",
        create_default_cycle: form.get("create_default_cycle") === "on"
      })
    });
    const body = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage({ kind: "error", text: body.error ?? "Failed to create entity." });
      return;
    }

    setMessage({ kind: "success", text: `Entity "${body.entity.name}" created. You are now its owner — switch to it from the cards above.` });
    (event.currentTarget as HTMLFormElement).reset();
    router.refresh();
  }

  if (!canCreate) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-surface-muted/40 p-4 text-sm text-text-muted">
        Only <strong>owner</strong> or <strong>admin</strong> roles can create new entities. Ask a group administrator if you need a new legal entity set up.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-card">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setMessage(null); }}
        className="flex w-full items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary-hover"
      >
        <Building2 className="h-4 w-4" aria-hidden="true" />
        Create new entity (legal entity / business unit)
        {open ? <ChevronUp className="ml-auto h-4 w-4" /> : <ChevronDown className="ml-auto h-4 w-4" />}
      </button>

      {open ? (
        <form onSubmit={submit} className="mt-4 grid gap-4">
          <p className="text-xs leading-5 text-text-muted">
            A new entity is a fully isolated strategic workspace: its own 12 workspaces, data, cycles, and access control. You will be granted owner role automatically.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-text">
              Entity name
              <input name="name" required placeholder="e.g. Demo Logistics Co." className="min-h-10 rounded-md border border-border px-3 py-2 text-sm font-normal" disabled={loading} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-text">
              Code
              <input name="code" required placeholder="e.g. DEMO-LOG" className="min-h-10 rounded-md border border-border px-3 py-2 text-sm font-normal uppercase" disabled={loading} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-text">
              Entity type
              <select name="entity_type" defaultValue="business_unit" className="min-h-10 rounded-md border border-border px-3 py-2 text-sm font-normal" disabled={loading}>
                <option value="business_unit">Business Unit</option>
                <option value="subsidiary">Subsidiary</option>
                <option value="division">Division</option>
                <option value="geography">Geography</option>
                <option value="portfolio">Portfolio</option>
                <option value="holding">Holding Company</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-text">
              Base currency
              <input name="base_currency" defaultValue="VND" maxLength={3} className="min-h-10 rounded-md border border-border px-3 py-2 text-sm font-normal uppercase" disabled={loading} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-text">
              Industry
              <input name="industry" placeholder="e.g. F&B / Logistics" className="min-h-10 rounded-md border border-border px-3 py-2 text-sm font-normal" disabled={loading} />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-text">
              Geography
              <input name="geography" placeholder="e.g. Vietnam - HCMC" className="min-h-10 rounded-md border border-border px-3 py-2 text-sm font-normal" disabled={loading} />
            </label>
          </div>

          <label className="flex items-start gap-2 text-sm text-text">
            <input type="checkbox" name="create_default_cycle" defaultChecked className="mt-0.5 h-4 w-4 rounded border-border" disabled={loading} />
            <span>Create a default annual strategic cycle (recommended — gives the entity an active planning period immediately).</span>
          </label>

          {message ? (
            <p className={message.kind === "error" ? "rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger" : "rounded-md border border-info-soft bg-info-soft p-3 text-sm text-info"} role={message.kind === "error" ? "alert" : "status"}>
              {message.text}
            </p>
          ) : null}

          <div>
            <Button type="submit" disabled={loading}>
              <Plus className="h-4 w-4" />
              {loading ? "Creating entity..." : "Create entity"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
