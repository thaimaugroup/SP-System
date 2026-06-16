"use client";

import { useState } from "react";
import { CalendarPlus, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { StrategicCycle } from "@/types/database";

// Strategic Cycle Manager — create new cycles and switch active context.
// Lives in Settings so that owners/admins can manage the planning timeline without
// cluttering the workspace shell. All workspace views re-scope automatically after
// switching because getAppContext() resolves the active cycle on every server render.
export function CycleManager({
  entityId,
  cycles,
  activeCycleId
}: {
  entityId: string;
  cycles: StrategicCycle[];
  activeCycleId: string | null;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState<null | "create" | string>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [cycleType, setCycleType] = useState("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [completeCurrentCycle, setCompleteCurrentCycle] = useState(true);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setLoading("create");
    setError(null);

    const response = await fetch("/api/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_id: entityId,
        name,
        cycle_type: cycleType,
        start_date: startDate,
        end_date: endDate,
        complete_current: completeCurrentCycle
      })
    });
    const body = await response.json();
    setLoading(null);

    if (!response.ok) {
      setError(body.error ?? "Failed to create cycle.");
      return;
    }

    setShowForm(false);
    setName("");
    setStartDate("");
    setEndDate("");
    router.refresh();
  }

  async function activate(cycleId: string) {
    setLoading(cycleId);
    setError(null);

    const response = await fetch(`/api/cycles/${cycleId}/activate`, { method: "PATCH" });
    const body = await response.json();
    setLoading(null);

    if (!response.ok) {
      setError(body.error ?? "Failed to activate cycle.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="divide-y divide-border">
      {/* Cycle list */}
      {cycles.length === 0 ? (
        <p className="py-3 text-sm text-text-muted">No strategic cycles configured for this entity yet.</p>
      ) : (
        cycles.map((cycle) => {
          const isActive = cycle.id === activeCycleId || cycle.status === "active";
          return (
            <div key={cycle.id} className="flex items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text truncate">{cycle.name}</span>
                  <Badge domain="workspace" status={isActive ? "in_progress" : "approved"} dot={false}>
                    {isActive ? "Active" : cycle.status}
                  </Badge>
                </div>
                <div className="mt-0.5 text-xs text-text-muted">
                  {cycle.cycle_type} · {cycle.start_date} → {cycle.end_date}
                </div>
              </div>
              {!isActive ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => activate(cycle.id)}
                  disabled={loading !== null}
                  className="min-h-8 shrink-0 px-2.5 py-1.5 text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {loading === cycle.id ? "Switching..." : "Set active"}
                </Button>
              ) : (
                <span className="shrink-0 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
                  Current
                </span>
              )}
            </div>
          );
        })
      )}

      {/* Error banner */}
      {error ? (
        <p className="py-2 text-sm text-danger" role="alert">{error}</p>
      ) : null}

      {/* Create form toggle */}
      <div className="pt-3">
        <button
          type="button"
          onClick={() => { setShowForm((v) => !v); setError(null); }}
          className="flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary-hover"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          New strategic cycle
          {showForm ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {showForm ? (
          <form onSubmit={create} className="mt-4 grid gap-4 rounded-lg border border-border bg-surface-muted p-4">
            <p className="text-xs text-text-muted leading-5">
              Creating a new cycle moves all workspace records into a fresh context. The previous cycle is archived (unless you uncheck the option below) and its data remains accessible via Version History.
            </p>

            <label className="grid gap-1 text-sm font-semibold text-text">
              Cycle name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. FY2027 Strategic Plan"
                className="min-h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm font-normal"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-1 text-sm font-semibold text-text">
                Type
                <select
                  value={cycleType}
                  onChange={(e) => setCycleType(e.target.value)}
                  className="min-h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm font-normal"
                >
                  <option value="annual">Annual</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semi_annual">Semi-annual</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold text-text">
                Start date
                <input
                  required
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="min-h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-text">
                End date
                <input
                  required
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="min-h-10 rounded-md border border-border bg-surface px-3 py-2 text-sm font-normal"
                />
              </label>
            </div>

            <label className="flex items-start gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={completeCurrentCycle}
                onChange={(e) => setCompleteCurrentCycle(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border"
              />
              <span>
                <strong>Complete current active cycle</strong> — marks it as completed and makes this the only active cycle. Uncheck to run cycles in parallel (advanced).
              </span>
            </label>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading !== null}>
                <CalendarPlus className="h-4 w-4" />
                {loading === "create" ? "Creating..." : "Create cycle"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
