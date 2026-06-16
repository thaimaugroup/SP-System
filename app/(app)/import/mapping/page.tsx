import { PageHeader } from "@/components/layout/page-header";
import { AuthRequired } from "@/components/layout/auth-required";
import { Card } from "@/components/ui/card";
import { getAppContext } from "@/lib/db/queries";

export default async function ImportMappingPage() {
  const context = await getAppContext();
  if (!context.entity) return <AuthRequired />;

  return (
    <>
      <PageHeader
        eyebrow="Import wizard"
        title="Column Mapping"
        description="Map source columns to workspace module fields. The API stores mapping definitions in import_mappings."
      />
      <Card>
        <div className="grid gap-3 text-sm text-text-muted">
          <p>Mapping implementation is represented by `import_mappings.source_column_map` and `transform_rules`.</p>
          <p>The upload API currently performs an automatic title/description/data mapping for MVP imports. Add saved mapping UI on top of this page in the next sprint.</p>
        </div>
      </Card>
    </>
  );
}

