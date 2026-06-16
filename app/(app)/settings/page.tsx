import { Building2, CalendarRange, MonitorCog, ShieldCheck, UserRound } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AuthRequired } from "@/components/layout/auth-required";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CycleManager } from "@/components/settings/cycle-manager";
import { getAppContext } from "@/lib/db/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { StrategicCycle } from "@/types/database";

export default async function SettingsPage() {
  const context = await getAppContext();
  if (!context.entity) return <AuthRequired />;

  const supabase = createSupabaseServerClient();
  const [{ data: profile }, { data: cycles }] = await Promise.all([
    supabase
      ? supabase.from("profiles").select("email, full_name, title, status, default_entity_id").eq("id", context.profileId!).maybeSingle()
      : { data: null },
    supabase
      ? supabase.from("strategic_cycles").select("*").eq("entity_id", context.entity.id).order("start_date", { ascending: false })
      : { data: [] }
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Application settings"
        title="Settings"
        description="Manage your account context, entity defaults, strategic cycles, and security session information."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsCard
          icon={<UserRound className="h-5 w-5 text-primary" aria-hidden="true" />}
          title="Profile"
          description="Your signed-in SIOS profile."
        >
          <InfoRow label="Name" value={profile?.full_name ?? "Not set"} />
          <InfoRow label="Email" value={profile?.email ?? "Not set"} />
          <InfoRow label="Title" value={profile?.title ?? "Not set"} />
          <div className="flex items-center justify-between gap-4 py-2">
            <span className="text-sm text-text-muted">Profile status</span>
            <Badge status={profile?.status ?? "active"} />
          </div>
        </SettingsCard>

        <SettingsCard
          icon={<Building2 className="h-5 w-5 text-primary" aria-hidden="true" />}
          title="Entity context"
          description="Current strategic entity and active cycle."
        >
          <InfoRow label="Entity" value={context.entity.name} />
          <InfoRow label="Code" value={context.entity.code} />
          <InfoRow label="Currency" value={context.entity.base_currency} />
          <InfoRow label="Active cycle" value={context.cycle?.name ?? "None"} />
          <InfoRow label="Your role" value={context.role ?? "Not assigned"} />
        </SettingsCard>

        {/* Strategic Cycle Management — full width so the list + form have space */}
        <div className="xl:col-span-2">
          <SettingsCard
            icon={<CalendarRange className="h-5 w-5 text-primary" aria-hidden="true" />}
            title="Strategic cycles"
            description="Create a new planning cycle to start fresh, or switch the active cycle to change the workspace context for all users. Records from past cycles remain available via Version History."
          >
            <CycleManager
              entityId={context.entity.id}
              cycles={(cycles ?? []) as StrategicCycle[]}
              activeCycleId={context.cycle?.id ?? null}
            />
          </SettingsCard>
        </div>

        <SettingsCard
          icon={<MonitorCog className="h-5 w-5 text-primary" aria-hidden="true" />}
          title="App preferences"
          description="Workspace display preferences for the current user."
        >
          <InfoRow label="Theme" value="Light mode" />
          <InfoRow label="Density" value="Executive dashboard density" />
          <InfoRow label="Navigation" value="Workspace sidebar with prefetch" />
          <p className="pt-2 text-sm leading-6 text-text-muted">
            Preference editing will be added after the core governance and import flows are stable.
          </p>
        </SettingsCard>

        <SettingsCard
          icon={<ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />}
          title="Security and session"
          description="Authentication and access model."
        >
          <InfoRow label="Auth model" value="Invite-only" />
          <InfoRow label="Current role" value={context.role ?? "No role assigned"} />
          <InfoRow label="Access scope" value="Entity-scoped by RLS" />
          <p className="pt-2 text-sm leading-6 text-text-muted">
            Use the logout button in the top bar to end the current Supabase session.
          </p>
        </SettingsCard>
      </div>
    </>
  );
}

function SettingsCard({
  icon,
  title,
  description,
  children
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <div className="divide-y divide-border">{children}</div>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-right text-sm font-semibold text-text">{value}</span>
    </div>
  );
}
