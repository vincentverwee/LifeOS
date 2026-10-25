/** A card that folds its content away: the deeper cuts on Insights pages, so the page stays calm. */
export function Disclosure({
  title,
  children,
  defaultOpen = false,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group min-w-0 rounded-xl border border-border bg-surface px-4 py-1">
      <summary className="tap -mx-4 flex min-h-12 cursor-pointer list-none items-center justify-between rounded-xl px-4 font-medium text-foreground [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden="true" className="text-ink-muted transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="mt-2 mb-3 flex flex-col gap-6">{children}</div>
    </details>
  );
}
