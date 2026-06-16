import { cn } from "@/lib/utils";
import { getAnyStatusMeta, getStatusMeta, type StatusDomain } from "@/lib/status";

const statusClass: Record<string, string> = {
  success: "bg-success-soft text-success border-green-200",
  info: "bg-info-soft text-info border-blue-200",
  warning: "bg-warning-soft text-warning border-amber-200",
  danger: "bg-danger-soft text-danger border-red-200",
  neutral: "bg-surface-muted text-text-muted border-border"
};

const dotClass: Record<string, string> = {
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-text-subtle"
};

export function Badge({
  children,
  status,
  domain,
  className,
  dot = true
}: {
  children?: React.ReactNode;
  status?: string | null;
  domain?: StatusDomain;
  className?: string;
  dot?: boolean;
}) {
  const meta = domain ? getStatusMeta(domain, status) : getAnyStatusMeta(status);
  return (
    <span
      title={meta.description}
      aria-label={`${meta.label}: ${meta.description}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize",
        statusClass[meta.tone],
        className
      )}
    >
      {dot ? (
        <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass[meta.tone])} />
      ) : null}
      {children ?? meta.label}
    </span>
  );
}
