import { BrainCircuit, FileUp, PenLine } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AuthRequired } from "@/components/layout/auth-required";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ApprovalActions } from "@/components/approvals/approval-actions";
import { getAppContext } from "@/lib/db/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WORKSPACES } from "@/lib/workspaces/config";
import { formatDate } from "@/lib/utils";

const STATUS_FILTERS = ["pending", "approved", "rejected"] as const;

// Source-type icons so reviewers can spot AI drafts vs manual vs import at a glance.
function SourceIcon({ type }: { type: string }) {
  if (type === "ai_review") return <BrainCircuit className="h-3.5 w-3.5 text-primary" aria-label="AI draft" />;
  if (type === "import_review") return <FileUp className="h-3.5 w-3.5 text-info" aria-label="Import" />;
  return <PenLine className="h-3.5 w-3.5 text-text-subtle" aria-label="Manual" />;
}

export default async function ApprovalsPage({
  searchParams
}: {
  searchParams: { status?: string; ws?: string; type?: string };
}) {
  const context = await getAppContext();
  if (!context.entity) return <AuthRequired />;
  const supabase = createSupabaseServerClient();

  const activeStatus = STATUS_FILTERS.includes(searchParams.status as any) ? searchParams.status : "pending";
  const activeWs = searchParams.ws ?? "all";
  const activeType = searchParams.type ?? "all"; // all | ai | import | manual

  let query = supabase
    ? supabase
        .from("approval_requests")
        .select("*")
        .eq("entity_id", context.entity.id)
        .eq("status", activeStatus)
        .order("created_at", { ascending: false })
        .limit(50)
    : null;

  if (query && activeWs !== "all") query = query.eq("workspace_code", activeWs);
  if (query && activeType === "ai") query = query.eq("request_type", "ai_review");
  if (query && activeType === "import") query = query.eq("request_type", "import_review");
  if (query && activeType === "manual") query = query.eq("request_type", "manual_review");

  const { data } = query ? await query : { data: [] };

  // Build filter URLs preserving other active filters.
  function filterUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams({
      status: activeStatus ?? "pending",
      ws: activeWs,
      type: activeType,
      ...overrides
    });
    return `/approvals?${params.toString()}`;
  }

  return (
    <>
      <PageHeader
        eyebrow="Human review"
        title="Approval Center"
        description="Govern AI drafts, imported data, and strategic changes before they become trusted graph data for downstream workspaces."
      />

      {/* Filter bar — status / workspace / source type (PRD §8.6) */}
      <div className="mb-6 space-y-3">
        {/* Status */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <ButtonLink key={s} href={filterUrl({ status: s })} variant={activeStatus === s ? "primary" : "secondary"} className="min-h-9 px-3 py-1.5 capitalize">
              {s}
            </ButtonLink>
          ))}
        </div>
        {/* Workspace */}
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={filterUrl({ ws: "all" })} variant={activeWs === "all" ? "secondary" : "secondary"} className={`min-h-8 px-2.5 py-1 text-xs ${activeWs === "all" ? "border-primary text-primary" : ""}`}>All workspaces</ButtonLink>
          {WORKSPACES.map((w) => (
            <ButtonLink key={w.code} href={filterUrl({ ws: w.code })} variant="secondary" className={`min-h-8 px-2.5 py-1 text-xs ${activeWs === w.code ? "border-primary text-primary" : ""}`}>
              {w.code}
            </ButtonLink>
          ))}
        </div>
        {/* Source type */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "All types" },
            { key: "ai", label: "AI drafts" },
            { key: "import", label: "Imports" },
            { key: "manual", label: "Manual" }
          ].map(({ key, label }) => (
            <ButtonLink key={key} href={filterUrl({ type: key })} variant="secondary" className={`min-h-8 px-2.5 py-1 text-xs ${activeType === key ? "border-primary text-primary" : ""}`}>
              {label}
            </ButtonLink>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {(data ?? []).length === 0 ? (
          <Card>
            <p className="text-sm text-text-muted">No {activeStatus} approval requests matching the current filters.</p>
          </Card>
        ) : null}
        {(data ?? []).map((request: any) => (
          <Card key={request.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SourceIcon type={request.request_type} />
                  <span className="text-sm font-semibold text-text">{request.workspace_code ?? "Workspace"} review</span>
                  <Badge domain="approval" status={request.status} dot={false} />
                  {request.request_type === "ai_review" ? (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">AI draft</span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-sm text-text-muted">
                  {request.record_table} · Record <span className="font-mono text-xs">{request.record_id?.slice(0, 8)}…</span> · v{request.record_version}
                </p>
                <div className="mt-3 grid gap-2 text-xs text-text-muted sm:grid-cols-2 xl:grid-cols-4">
                  <span><strong className="text-text">Source:</strong> {request.request_type?.replaceAll("_", " ")}</span>
                  <span><strong className="text-text">Created:</strong> {formatDate(request.created_at)}</span>
                  <span><strong className="text-text">Requested by:</strong> {request.requested_by?.slice(0, 8) ?? "Unknown"}…</span>
                  <span><strong className="text-text">Impact:</strong> approved records feed downstream workspaces</span>
                </div>
                {request.reviewer_notes ? (
                  <p className="mt-3 rounded-md bg-surface-muted px-3 py-2 text-sm text-text-muted">
                    <strong>Notes:</strong> {request.reviewer_notes}
                  </p>
                ) : null}
              </div>
            </div>
            {request.status === "pending" ? (
              <ApprovalActions approvalId={request.id} requestType={request.request_type} />
            ) : null}
          </Card>
        ))}
      </div>
    </>
  );
}
