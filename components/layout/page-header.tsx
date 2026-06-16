export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <span aria-hidden="true" className="h-3 w-1 rounded-full bg-primary" />
            {eyebrow}
          </div>
        ) : null}
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-text lg:text-[28px]">{title}</h1>
        {description ? <p className="mt-2 text-sm leading-6 text-text-muted lg:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

