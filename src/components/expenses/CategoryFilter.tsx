import Link from "next/link";
import { formatCurrencyShort } from "@/lib/format";

export type FilterChip = { id: string; name: string; color: string; total: number };

type CategoryFilterProps = {
  chips: FilterChip[];
  activeId: string | null;
  /** link for a chip; null id = all categories */
  hrefFor: (id: string | null) => string;
};

/** A swipeable row of the period's categories; tap one to show only its expenses. Sticks to the
 *  top of the screen so the filter stays reachable down a long list. */
export function CategoryFilter({ chips, activeId, hrefFor }: CategoryFilterProps) {
  if (chips.length < 2) return null;

  const chip = "btn flex min-h-11 shrink-0 snap-start gap-1.5 border px-3.5 text-sm whitespace-nowrap";
  const on = "border-primary bg-primary text-primary-foreground";
  const off = "border-border bg-surface text-foreground hover:bg-surface-muted active:bg-surface-muted";

  return (
    <nav
      aria-label="Filter by category"
      className="sticky top-[env(safe-area-inset-top)] z-20 -mx-4 snap-x scroll-px-4 overflow-x-auto bg-background/95 px-4 py-2 backdrop-blur [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex gap-2">
        <li>
          <Link href={hrefFor(null)} className={`${chip} ${activeId === null ? on : off}`} scroll={false}>
            All
          </Link>
        </li>
        {chips.map((c) => (
          <li key={c.id}>
            <Link
              href={hrefFor(activeId === c.id ? null : c.id)}
              aria-current={activeId === c.id ? "true" : undefined}
              scroll={false}
              className={`${chip} ${activeId === c.id ? on : off}`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: `var(--color-tag-${c.color})` }}
                aria-hidden="true"
              />
              {c.name}
              <span className={activeId === c.id ? "opacity-80" : "text-ink-muted"}>
                {formatCurrencyShort(c.total)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
