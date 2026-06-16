"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CheckSquare,
  Database,
  Home,
  History,
  Settings,
  Shield,
  UploadCloud
} from "lucide-react";
import { WORKSPACES } from "@/lib/workspaces/config";
import { WorkspaceIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const topItems = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/command-center", label: "Workspace Command Center", icon: BarChart3 }
];

const bottomItems = [
  { href: "/import", label: "Import Center", icon: UploadCloud },
  { href: "/lineage", label: "Data Lineage", icon: Database },
  { href: "/ai-runs", label: "AI Run History", icon: History },
  { href: "/approvals", label: "Approval Center", icon: CheckSquare },
  { href: "/admin/users", label: "Admin Center", icon: Shield },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <aside className="hidden h-dvh w-[280px] shrink-0 border-r border-border bg-surface shadow-xs lg:sticky lg:top-0 lg:block">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link
          href="/dashboard"
          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md py-2 focus-visible:outline-primary"
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-mark text-sm font-bold text-white shadow-primary"
          >
            S
          </span>
          <span>
            <span className="block text-base font-bold tracking-tight text-text">SIOS</span>
            <span className="block text-xs font-medium text-text-muted">Strategic Intelligence OS</span>
          </span>
        </Link>
      </div>
      <nav className="sios-scrollbar h-[calc(100dvh-4rem)] overflow-y-auto px-3 py-4" aria-label="Main navigation">
        <div className="space-y-1">
          {topItems.map((item) => (
            <SidebarLink key={item.href} active={pathname === item.href} pending={pendingHref === item.href} href={item.href} label={item.label} icon={<item.icon className="h-4 w-4" />} onNavigate={setPendingHref} />
          ))}
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-text-subtle">Workspaces</div>
          <div className="space-y-1">
            {WORKSPACES.map((workspace) => (
              <SidebarLink
                key={workspace.code}
                active={pathname.startsWith(`/workspaces/${workspace.code}`)}
                pending={pendingHref === `/workspaces/${workspace.code}`}
                href={`/workspaces/${workspace.code}`}
                label={`${workspace.code} ${workspace.name}`}
                icon={<WorkspaceIcon name={workspace.iconName} className="h-4 w-4" />}
                onNavigate={setPendingHref}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <div className="space-y-1">
            {bottomItems.map((item) => (
              <SidebarLink
                key={item.href}
                active={pathname.startsWith(item.href)}
                pending={pendingHref === item.href}
                href={item.href}
                label={item.label}
                icon={<item.icon className="h-4 w-4" />}
                onNavigate={setPendingHref}
              />
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}

function SidebarLink({
  href,
  label,
  icon,
  active,
  pending,
  onNavigate
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  pending?: boolean;
  onNavigate?: (href: string) => void;
}) {
  return (
    <Link
      href={href}
      prefetch
      onClick={() => onNavigate?.(href)}
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border-l-4 px-3 py-2 text-sm font-medium transition duration-200",
        active
          ? "border-primary bg-primary-soft font-semibold text-primary shadow-xs"
          : "border-transparent text-text-muted hover:bg-surface-muted hover:text-text",
        pending && !active ? "bg-surface-muted text-text" : null
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="leading-5">{label}</span>
      {pending && !active ? <span className="ml-auto h-2 w-2 rounded-full bg-primary" aria-hidden="true" /> : null}
    </Link>
  );
}
