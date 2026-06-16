import { PageHeader } from "@/components/layout/page-header";
import { AuthRequired } from "@/components/layout/auth-required";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAppContext, getLineageData } from "@/lib/db/queries";

export default async function LineagePage() {
  const context = await getAppContext();
  if (!context.entity) return <AuthRequired />;
  const data = await getLineageData(context.entity.id);

  return (
    <>
      <PageHeader
        eyebrow="Strategic data graph"
        title="Data Lineage"
        description="Trace source records, target records, link types, versions, and import/AI/workspace lineage edges."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-text">Workspace links</h2>
          <div className="mt-4 space-y-3">
            {data.links.map((link) => (
              <div key={link.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-text">{link.source_table} {"->"} {link.target_table}</div>
                  <Badge status="approved">{link.link_type.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-1 text-xs text-text-muted">Source v{link.source_record_version ?? 1} / Target v{link.target_record_version ?? 1}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="text-base font-semibold text-text">Lineage edges</h2>
          <div className="mt-4 space-y-3">
            {data.edges.map((edge: any) => (
              <div key={edge.id} className="rounded-md border border-border p-3">
                <div className="text-sm font-semibold text-text">{edge.edge_type}</div>
                <p className="mt-1 text-xs text-text-muted">{edge.source_table} {"->"} {edge.target_table}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
