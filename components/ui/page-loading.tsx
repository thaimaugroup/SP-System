import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading({ title = "Loading workspace data" }: { title?: string }) {
  return (
    <div className="grid gap-6" role="status" aria-live="polite">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-text-subtle">SIOS</div>
        <h1 className="mt-1 text-2xl font-bold text-text">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
          Preparing entity-scoped data, governance status, and linked workspace context.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
