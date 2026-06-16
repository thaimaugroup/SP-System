import Link from "next/link";
import { AlertCircle, Building2, CalendarRange, LogIn } from "lucide-react";
import type { AppContext } from "@/lib/db/queries";
import { ButtonLink } from "@/components/ui/button";
import { LogoutButton } from "@/components/layout/logout-button";

export function Topbar({ context }: { context: AppContext }) {
  const hasCycle = Boolean(context.cycle);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-surface/85 px-4 shadow-xs backdrop-blur-md lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-primary-soft" aria-hidden="true">
          <Building2 className="h-4 w-4 text-primary" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-text">
            {context.entity?.name ?? "No entity selected"}
          </div>
          {/* Cycle switcher — links to Settings where cycles are managed */}
          <Link
            href="/settings"
            className="group flex items-center gap-1 truncate text-xs transition"
            title="Manage strategic cycles in Settings"
          >
            {hasCycle ? (
              <>
                <CalendarRange className="h-3 w-3 shrink-0 text-primary opacity-70 group-hover:opacity-100" aria-hidden="true" />
                <span className="text-text-muted group-hover:text-primary">{context.cycle!.name}</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 shrink-0 text-warning" aria-hidden="true" />
                <span className="text-warning">No active cycle — click to create one</span>
              </>
            )}
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/entity-selector"
          className="hidden min-h-10 cursor-pointer rounded-md px-3 py-2 text-sm font-semibold text-text-muted transition duration-200 hover:bg-surface-muted hover:text-text sm:inline-flex"
        >
          Change entity
        </Link>
        {context.userId ? (
          <>
            <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold capitalize text-text-muted">
              {context.role ?? "signed in"}
            </span>
            <LogoutButton />
          </>
        ) : (
          <ButtonLink href="/login" variant="secondary">
            <LogIn className="h-4 w-4" />
            Sign in
          </ButtonLink>
        )}
      </div>
    </header>
  );
}
