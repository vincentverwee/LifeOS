/** A card that folds its content away: the deeper cuts on Insights pages, so the page stays calm. */
export function Disclosure({
  title,
  children,
  defaultOpen = false,
  id,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /** Lets other code find (and open) the underlying <details>, e.g. Add expense's "Edit categories". */
  id?: string;
}) {
  return (
    <details id={id} open={defaultOpen} className="group min-w-0 scroll-mt-4 rounded-2xl border border-border bg-surface px-4 py-1">
      <summary className="tap -mx-4 flex min-h-12 cursor-pointer list-none items-center justify-between rounded-2xl px-4 font-medium text-foreground [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden="true" className="text-ink-muted transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="mt-2 mb-3 flex flex-col gap-6">{children}</div>
    </details>
  );
}
