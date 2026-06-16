"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type EntityRow = {
  id: string;
  name: string;
  industry: string | null;
  geography: string | null;
  role: string;
};

// Clickable entity switcher. Switching writes profiles.default_entity_id via
// /api/entities/switch, then navigates to the dashboard so every workspace
// re-scopes to the newly selected entity.
export function EntitySwitcher({ entities, activeEntityId }: { entities: EntityRow[]; activeEntityId: string | null }) {
  const router = useRouter();
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function switchTo(entityId: string) {
    if (entityId === activeEntityId) return;
    setSwitching(entityId);
    setError(null);

    const response = await fetch("/api/entities/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityId })
    });
    const body = await response.json();

    if (!response.ok) {
      setSwitching(null);
      setError(body.error ?? "Failed to switch entity.");
      return;
    }

    // Refresh server components (re-resolves active entity) then go to dashboard.
    router.push("/dashboard");
    router.refresh();
  }

  if (entities.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-muted">You are not assigned to any entity yet. Ask an admin to grant you a role.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {error ? (
        <p className="rounded-md border border-danger-soft bg-danger-soft p-3 text-sm text-danger" role="alert">{error}</p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {entities.map((entity) => {
          const isActive = entity.id === activeEntityId;
          return (
            <Card key={`${entity.id}-${entity.role}`} className={isActive ? "border-primary ring-1 ring-primary" : undefined}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft" aria-hidden="true">
                    <Building2 className="h-4 w-4 text-primary" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-text">{entity.name}</h2>
                    <p className="mt-1 text-sm text-text-muted">{entity.industry ?? "Industry not set"} / {entity.geography ?? "Geography not set"}</p>
                  </div>
                </div>
                <Badge status="active" dot={false}>{entity.role}</Badge>
              </div>
              <div className="mt-4">
                {isActive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Currently active
                  </span>
                ) : (
                  <Button type="button" variant="secondary" onClick={() => switchTo(entity.id)} disabled={switching !== null} className="min-h-9 px-3 py-1.5">
                    <Check className="h-4 w-4" />
                    {switching === entity.id ? "Switching..." : "Switch to this entity"}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
