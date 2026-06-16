import { Inbox } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted/40 p-8 text-center">
      <Inbox className="mx-auto h-8 w-8 text-text-subtle" aria-hidden="true" />
      <h3 className="mt-3 text-base font-semibold text-text">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">{description}</p>
      {actionHref && actionLabel ? (
        <ButtonLink href={actionHref} className="mt-4">
          {actionLabel}
        </ButtonLink>
      ) : null}
    </div>
  );
}

