import { ShieldAlert, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AuthRequired } from "@/components/layout/auth-required";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserInviteForm } from "@/components/admin/user-invite-form";
import { getAppContext } from "@/lib/db/queries";
import { roleCan } from "@/lib/permissions/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type UserRoleRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  title: string | null;
  role: string;
};

export default async function AdminUsersPage() {
  const context = await getAppContext();
  if (!context.entity) return <AuthRequired />;

  const isAdmin = roleCan(context.role, "admin");
  const serviceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const supabase = createSupabaseServerClient();
  const { data } = isAdmin && supabase
    ? await supabase.rpc("list_entity_user_roles" as never, { target_entity_id: context.entity.id } as never)
    : { data: [] };
  const rows = (data ?? []) as UserRoleRow[];

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Admin Center"
        description="Manage invited users, entity role assignments, and access governance for the current entity."
      />

      {!isAdmin ? (
        <Card>
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-warning" aria-hidden="true" />
            <div>
              <h2 className="font-semibold text-text">Admin access required</h2>
              <p className="mt-1 text-sm leading-6 text-text-muted">Only owner and admin roles can review or assign entity users.</p>
            </div>
          </div>
        </Card>
      ) : null}

      {isAdmin ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Users and roles</CardTitle>
                <CardDescription>These assignments drive RLS access for {context.entity.name}.</CardDescription>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-text-subtle">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.user_id}>
                      <td className="px-4 py-3 font-medium text-text">{row.full_name}</td>
                      <td className="px-4 py-3 text-text-muted">{row.email}</td>
                      <td className="px-4 py-3 text-text-muted">{row.title}</td>
                      <td className="px-4 py-3"><Badge status={row.role} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
                <div>
                  <CardTitle>Create or invite user</CardTitle>
                  <CardDescription>Invite-only access; no public signup is enabled.</CardDescription>
                </div>
              </div>
            </CardHeader>
            {!serviceRoleConfigured ? (
              <div className="mb-4 rounded-md border border-warning-soft bg-warning-soft p-3 text-sm leading-6 text-warning">
                Set `SUPABASE_SERVICE_ROLE_KEY` in the server environment to enable user creation through Supabase Admin API.
              </div>
            ) : null}
            <UserInviteForm entityId={context.entity.id} disabled={!serviceRoleConfigured} />
          </Card>
        </div>
      ) : null}
    </>
  );
}
