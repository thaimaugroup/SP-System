import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  helper,
  tone = "default"
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const valueTone = {
    default: "text-primary",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger"
  }[tone];

  const accentTone = {
    default: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger"
  }[tone];

  return (
    <Card className="relative overflow-hidden pl-5">
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", accentTone)} />
      <div className="text-xs font-semibold uppercase tracking-wide text-text-subtle">{label}</div>
      <div className={cn("mt-2 text-3xl font-bold tabular-nums tracking-tight", valueTone)}>{value}</div>
      <div className="mt-2 text-xs leading-5 text-text-muted">{helper}</div>
    </Card>
  );
}
