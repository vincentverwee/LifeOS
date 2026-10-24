import Link from "next/link";
import type { MonthExpense } from "@/lib/monthStats";
import { formatCurrency } from "@/lib/format";

type TodayExpensesProps = {
  expenses: MonthExpense[];
  total: number;
  /** the expenses page of this period, where they can be edited */
  href: string;
};

/** What went out today, newest first. */
export function TodayExpenses({ expenses, total, href }: TodayExpensesProps) {
  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex items-baseline justify-between gap-2 px-4 pt-4 pb-2">
        <h2 className="font-medium text-foreground">Spent today</h2>
        <span className="font-mono text-sm tabular-nums text-ink-muted">{formatCurrency(total)}</span>
      </div>
      {expenses.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-ink-muted">Nothing logged today yet.</p>
      ) : (
        <ul>
          {[...expenses].reverse().map((e) => (
            <li key={e.id} className="border-t border-border first:border-t-0">
              <Link href={href} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2 active:bg-surface-muted">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: `var(--color-tag-${e.categoryColor})` }}
                    aria-hidden="true"
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm text-foreground">{e.categoryName}</span>
                    {e.note && <span className="truncate text-xs text-ink-muted">{e.note}</span>}
                  </span>
                </span>
                <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                  {formatCurrency(e.amount)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
