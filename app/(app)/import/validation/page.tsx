import { PageHeader } from "@/components/layout/page-header";
import { AuthRequired } from "@/components/layout/auth-required";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAppContext } from "@/lib/db/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ImportValidationPage() {
  const context = await getAppContext();
  if (!context.entity) return <AuthRequired />;
  const supabase = createSupabaseServerClient();
  const { data } = supabase
    ? await supabase.from("import_errors").select("*").eq("entity_id", context.entity.id).order("created_at", { ascending: false }).limit(100)
    : { data: [] };

  return (
    <>
      <PageHeader
        eyebrow="Import wizard"
        title="Validation Errors"
        description="Review row-level errors and warnings before committing staged import rows."
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wide text-text-subtle">
              <tr>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Field</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data ?? []).map((error: any) => (
                <tr key={error.id}>
                  <td className="px-4 py-3"><Badge status={error.severity === "warning" ? "pending" : "failed"}>{error.severity}</Badge></td>
                  <td className="px-4 py-3">{error.field_name ?? "row"}</td>
                  <td className="px-4 py-3">{error.error_code}</td>
                  <td className="px-4 py-3">{error.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

