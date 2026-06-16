import { PageHeader } from "@/components/layout/page-header";
import { AuthRequired } from "@/components/layout/auth-required";
import { EntitySwitcher } from "@/components/entity/entity-switcher";
import { CreateEntityForm } from "@/components/entity/create-entity-form";
import { getAppContext, getEntitiesForCurrentUser } from "@/lib/db/queries";

export default async function EntitySelectorPage() {
  const context = await getAppContext();
  if (!context.userId) return <AuthRequired />;
  const rows = await getEntitiesForCurrentUser();

  const entities = (rows as any[])
    .filter((row) => row.entities)
    .map((row) => ({
      id: row.entities.id as string,
      name: row.entities.name as string,
      industry: (row.entities.industry ?? null) as string | null,
      geography: (row.entities.geography ?? null) as string | null,
      role: row.role as string
    }));

  const canCreate = context.role === "owner" || context.role === "admin";

  return (
    <>
      <PageHeader
        eyebrow="Access scope"
        title="Entities"
        description="SIOS is multi-entity: choose which legal entity / business unit's strategic data you are working on, or create a new one. All workspaces, dashboards, imports, and approvals re-scope to the selected entity. Access is enforced by user_entity_roles and PostgreSQL RLS."
      />
      <div className="grid gap-6">
        <EntitySwitcher entities={entities} activeEntityId={context.entity?.id ?? null} />
        <CreateEntityForm canCreate={canCreate} />
      </div>
    </>
  );
}
