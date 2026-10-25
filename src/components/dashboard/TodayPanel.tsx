import Link from "next/link";
import type { Month, MonthStats } from "@/lib/monthStats";
import { encodePeriodKey } from "@/lib/period";
import { formatCurrency, formatCurrencyShort } from "@/lib/format";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { PaceComparison, type PaceRow } from "@/components/dashboard/PaceComparison";
import { TodayExpenses } from "@/components/dashboard/TodayExpenses";
import { BalancesCard } from "@/components/month/BalancesCard";

type TodayPanelProps = {
  month: Month;
  stats: MonthStats;
  todayKey: string;
  /** same-day comparisons (last month, typical month); empty for trips */
  comparisons: PaceRow[];
  /** days since bank/tricount/cash were last updated (null = never) */
  balancesAge: number | null;
  /** only the allowance hero: for a second running period (a trip during a month) */
  compact?: boolean;
};

/** "Today at a glance" for one running period (the current month or a trip). */
export function TodayPanel({ month, stats, todayKey, comparisons, balancesAge, compact = false }: TodayPanelProps) {
  const today = stats.today;
  if (!today) return null;

  const isMonth = month.kind === "month";
  const over = today.leftToday < 0;
  const key = encodeURIComponent(encodePeriodKey({ type: isMonth ? "cycle" : "trip", id: month.id }));
  const todaysExpenses = month.expenses.filter((e) => e.date === todayKey);

  // Today's allowance as a bar: how much of it is gone.
  const usedToday = today.allowanceToday > 0 ? Math.min(1, today.spentToday / today.allowanceToday) : 1;

  return (
    <section className="flex flex-col gap-4">
      {today.budgetGoneBeforeToday ? (
        // No allowance left to show: say how far over the month is instead.
        <div className="rounded-xl border border-critical/40 bg-surface p-5">
          <p className="text-sm text-ink-muted">
            {isMonth ? "Over budget this month" : `${month.name} · over budget`}
          </p>
          <p className="mt-1 font-mono text-4xl font-semibold tabular-nums text-critical sm:text-5xl">
            {formatCurrency(-today.budgetLeft)}
          </p>
          <div className="mt-3 h-2 rounded-full bg-critical" aria-hidden="true" />
          <p className="mt-2 text-sm text-ink-muted">
            {today.spentToday > 0
              ? `${formatCurrency(today.spentToday)} of that spent today`
              : "Nothing spent today, so it's not growing."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-sm text-ink-muted">
            {isMonth ? "Left to spend today" : `${month.name} · left to spend today`}
          </p>
          <p
            className={`mt-1 font-mono text-4xl font-semibold tabular-nums sm:text-5xl ${
              over ? "text-critical" : "text-foreground"
            }`}
          >
            {formatCurrency(Math.abs(today.leftToday))}
            {over && <span className="ml-2 text-base font-medium">over</span>}
          </p>
          <div className="mt-3 h-2 rounded-full bg-surface-muted" aria-hidden="true">
            <div
              className={`h-full rounded-full ${over ? "bg-critical" : "bg-accent"}`}
              style={{ width: `${usedToday * 100}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            {formatCurrency(today.spentToday)} spent of today&apos;s {formatCurrency(today.allowanceToday)}
          </p>
        </div>
      )}

      {compact ? (
        <Link
          href={`/budget/expenses?period=${key}`}
          className="btn btn-ghost -mt-2 inline-flex min-h-11 self-start px-3 text-sm"
        >
          {month.name} expenses ›
        </Link>
      ) : (
        <>
          <PaceComparison
            day={stats.daysElapsed}
            daysInMonth={stats.daysInMonth}
            spent={stats.spent}
            rows={comparisons}
            insightsHref={`/budget/insights?period=${key}`}
          />

          <SummaryCards
            cards={[
              {
                label: isMonth ? "Left this month" : "Left on this trip",
                value: formatCurrencyShort(Math.abs(today.budgetLeft)),
                tone: today.budgetLeft >= 0 ? "positive" : "negative",
                icon: null,
                hint:
                  today.budgetLeft >= 0
                    ? `${today.daysLeftInclToday} ${today.daysLeftInclToday === 1 ? "day" : "days"} to go`
                    : "over budget",
              },
              {
                label: "Budget line",
                value: formatCurrencyShort(Math.abs(today.vsBudgetLine)),
                tone: today.vsBudgetLine >= 0 ? "positive" : "negative",
                icon: today.vsBudgetLine >= 0 ? "▼" : "▲",
                hint: today.vsBudgetLine >= 0 ? "under the line" : "over the line",
              },
              {
                label: "Average per day",
                value: formatCurrencyShort(stats.avgPerDay),
                icon: null,
                hint: `on track for ${formatCurrencyShort(stats.expectedTotal)}`,
                tone: stats.expectedVsBudget < 0 ? "negative" : "neutral",
              },
              // Spent so far is in the pace card above; balances, available and safe-per-day
              // live in the card below.
            ]}
          />

          <TodayExpenses
            expenses={todaysExpenses}
            total={today.spentToday}
            href={`/budget/expenses?period=${key}`}
          />

          {isMonth && (
            <BalancesCard
              key={`${month.id}:${month.balancesUpdatedAt ?? ""}:${month.budget}:${month.rent}:${month.rentDay ?? ""}`}
              cycleId={month.id}
              budget={month.budget}
              bank={month.bank}
              tricount={month.tricount}
              cash={month.cash}
              rent={month.rent}
              rentDay={month.rentDay}
              updatedDaysAgo={balancesAge}
              outlook={stats.outlook}
            />
          )}
        </>
      )}
    </section>
  );
}
