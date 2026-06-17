import { notFound } from "next/navigation";
import { Import, ShieldCheck } from "lucide-react";
import { AuthRequired } from "@/components/layout/auth-required";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LiveModuleRecords } from "@/components/workspaces/live-module-records";
import { DependencyChecklist } from "@/components/workspaces/dependency-checklist";
import { LinkedDataPanel } from "@/components/workspaces/linked-data-panel";
import { VersionHistoryPanel } from "@/components/workspaces/version-history-panel";
import { CreateRecordForm } from "@/components/forms/create-record-form";
import { AiPanel } from "@/components/workspaces/ai-panel";
import { getAppContext, getWorkspaceData, getVersionHistory } from "@/lib/db/queries";
import { WORKSPACE_BY_CODE } from "@/lib/workspaces/config";
import { roleCan } from "@/lib/permissions/roles";
import type { WorkspaceCode } from "@/types/workspace";

export default async function WorkspacePage({
  params,
  searchParams
}: {
  params: { workspaceCode: WorkspaceCode };
  searchParams: { table?: string };
}) {
  const workspace = WORKSPACE_BY_CODE[params.workspaceCode];
  if (!workspace) notFound();

  const context = await getAppContext();
  if (!context.entity) return <AuthRequired />;

  const [{ activeModule, records, upstreamLinks, downstreamLinks }, versionRows] = await Promise.all([
    getWorkspaceData(params.workspaceCode, context.entity.id, context.cycle?.id ?? null, searchParams.table),
    getVersionHistory(context.entity.id, searchParams.table ?? workspace.modules[0].table, 15)
  ]);

  // RBAC (PRD §10.2) — gate authoring UI by the signed-in role's capabilities.
  const canCreate = roleCan(context.role, "create");
  const canEdit = roleCan(context.role, "edit") || roleCan(context.role, "delete");
  const canRunAi = roleCan(context.role, "ai");

  return (
    <>
      <PageHeader
        eyebrow={`${workspace.code} / ${context.entity.name}`}
        title={workspace.name}
        description={workspace.purpose}
        actions={
          <>
            <ButtonLink href={`/import?workspace=${workspace.code}&table=${activeModule.table}`} variant="secondary">
              <Import className="h-4 w-4" /> Import
            </ButtonLink>
            <ButtonLink href="/approvals" variant="secondary">
              <ShieldCheck className="h-4 w-4" /> Review queue
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-6">
        <DependencyChecklist workspace={workspace} />

        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {workspace.modules.map((module) => (
              <ButtonLink
                key={module.table}
                href={`/workspaces/${workspace.code}?table=${module.table}`}
                variant={module.table === activeModule.table ? "primary" : "secondary"}
                className="min-h-9 px-3 py-1.5"
              >
                {module.label}
              </ButtonLink>
            ))}
          </div>
          <LiveModuleRecords
            table={activeModule.table}
            entityId={context.entity.id}
            moduleLabel={activeModule.label}
            moduleDescription={activeModule.description}
            initialRecords={records}
            canMutate={canEdit}
          />
        </Card>

        {canCreate || canRunAi ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            {canCreate ? (
              <CreateRecordForm
                entityId={context.entity.id}
                cycleId={context.cycle?.id ?? null}
                table={activeModule.table}
                workspaceCode={workspace.code}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-surface-muted/40 p-4 text-sm text-text-muted">
                Your role ({context.role}) is read/review only — record creation is disabled for this workspace.
              </div>
            )}
            {canRunAi ? (
              <AiPanel entityId={context.entity.id} workspaceCode={workspace.code} targetTable={activeModule.table} />
            ) : null}
          </div>
        ) : null}

        <LinkedDataPanel upstream={upstreamLinks} downstream={downstreamLinks} />
        <VersionHistoryPanel rows={versionRows as any} moduleLabel={activeModule.label} />
      </div>
    </>
  );
}

