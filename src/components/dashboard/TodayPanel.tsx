import type { Month, MonthStats } from "@/lib/monthStats";
import { formatCurrency } from "@/lib/format";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { BalancesCard } from "@/components/month/BalancesCard";

type TodayPanelProps = {
  month: Month;
  stats: MonthStats;
};

/** "Today at a glance" for one running period (the current month or a trip). */
export function TodayPanel({ month, stats }: TodayPanelProps) {
  const today = stats.today;
  if (!today) return null;

  const isMonth = month.kind === "month";
  const over = today.leftToday < 0;

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="text-sm text-ink-muted">
          {isMonth ? "Left to spend today" : `${month.name} — left to spend today`}
        </p>
        <p
          className={`mt-1 font-mono text-4xl font-semibold tabular-nums ${
            over ? "text-critical" : "text-foreground"
          }`}
        >
          {formatCurrency(Math.abs(today.leftToday))}
          {over && <span className="ml-2 text-base font-medium">over</span>}
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          {formatCurrency(today.spentToday)} spent of today&apos;s {formatCurrency(today.allowanceToday)}{" "}
          allowance
        </p>
      </div>

      <SummaryCards
        cards={[
          {
            label: isMonth ? "Left this month" : "Left on this trip",
            value: formatCurrency(Math.abs(today.budgetLeft)),
            tone: today.budgetLeft >= 0 ? "positive" : "negative",
            hint:
              today.budgetLeft >= 0
                ? `${today.daysLeftInclToday} days to go (today included)`
                : "over budget",
          },
          {
            label: "Pace",
            value: formatCurrency(Math.abs(today.vsBudgetLine)),
            tone: today.vsBudgetLine >= 0 ? "positive" : "negative",
            hint: today.vsBudgetLine >= 0 ? "under the budget line" : "over the budget line",
          },
          {
            label: "Average per day",
            value: formatCurrency(stats.avgPerDay),
            hint: `expected total ${formatCurrency(stats.expectedTotal)}`,
            tone: stats.expectedVsBudget < 0 ? "negative" : "neutral",
          },
          ...(isMonth
            ? [
                {
                  label: stats.outlook.rentStillDue > 0 ? "Available after rent" : "Available",
                  value: formatCurrency(stats.outlook.available),
                  tone: stats.outlook.available < 0 ? ("negative" as const) : ("neutral" as const),
                  hint:
                    stats.outlook.safePerDay !== null
                      ? `${formatCurrency(stats.outlook.safePerDay)} safe per day`
                      : undefined,
                },
              ]
            : []),
        ]}
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
          outlook={stats.outlook}
        />
      )}
    </section>
  );
}
