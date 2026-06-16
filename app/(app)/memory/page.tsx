import { PageHeader } from "@/components/layout/page-header";
import { AuthRequired } from "@/components/layout/auth-required";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAppContext } from "@/lib/db/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MemoryPage({ searchParams }: { searchParams: { q?: string } }) {
  const context = await getAppContext();
  if (!context.entity) return <AuthRequired />;
  const supabase = createSupabaseServerClient();
  const q = searchParams.q ?? "";
  const query = supabase?.from("ws12_memory_entries").select("*").eq("entity_id", context.entity.id).order("created_at", { ascending: false }).limit(50);
  const { data } = query ? await (q ? query.ilike("title", `%${q}%`) : query) : { data: [] };

  return (
    <>
      <PageHeader
        eyebrow="Strategic Memory"
        title="Memory Search"
        description="Search approved decision context, lessons, playbooks, and institutional memory scoped to the current entity."
      />
      <form className="mb-6 flex gap-2">
        <label className="sr-only" htmlFor="q">Search memory</label>
        <input id="q" name="q" defaultValue={q} placeholder="Search memory entries" className="min-h-10 flex-1 rounded-md border border-border px-3 py-2 text-sm" />
        <button className="min-h-10 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-primary-hover">Search</button>
      </form>
      <div className="grid gap-4">
        {(data ?? []).map((record: any) => (
          <Card key={record.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-text">{record.title}</h2>
                <p className="mt-1 text-sm leading-6 text-text-muted">{record.description}</p>
              </div>
              <Badge status={record.status}>{record.status}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

