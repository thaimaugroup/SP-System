import { PageHeader } from "@/components/layout/page-header";
import { AuthRequired } from "@/components/layout/auth-required";
import { ImportUploadForm } from "@/components/import/import-upload-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImportBatchActions } from "@/components/import/import-batch-actions";
import { getAppContext } from "@/lib/db/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ImportBatch } from "@/types/database";

export default async function ImportCenterPage() {
  const context = await getAppContext();
  if (!context.entity) return <AuthRequired />;
  const supabase = createSupabaseServerClient();
  const { data } = supabase
    ? await supabase.from("import_batches").select("*").eq("entity_id", context.entity.id).order("created_at", { ascending: false }).limit(10)
    : { data: [] };

  return (
    <>
      <PageHeader
        eyebrow="Data ingestion"
        title="Import Center"
        description="Upload files into Supabase Storage, stage rows for validation, then commit approved rows into workspace tables with lineage and audit logs."
      />
      <div className="grid gap-6">
        <ImportUploadForm entityId={context.entity.id} />
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent import batches</CardTitle>
              <CardDescription>Parsed and staged imports for the current entity.</CardDescription>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wide text-text-subtle">
                <tr>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Rows</th>
                  <th className="px-4 py-3">Valid</th>
                  <th className="px-4 py-3">Errors</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {((data ?? []) as ImportBatch[]).map((batch) => (
                  <tr key={batch.id}>
                    <td className="px-4 py-3 font-medium text-text">{batch.target_table ?? "Not mapped"}</td>
                    <td className="px-4 py-3"><Badge domain="import" status={batch.status} /></td>
                    <td className="px-4 py-3 tabular-nums">{batch.row_count}</td>
                    <td className="px-4 py-3 tabular-nums">{batch.valid_row_count}</td>
                    <td className="px-4 py-3 tabular-nums">{batch.error_row_count}</td>
                    <td className="px-4 py-3">
                      <ImportBatchActions batchId={batch.id} status={batch.status} validRowCount={batch.valid_row_count} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
