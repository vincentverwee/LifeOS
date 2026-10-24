import type { Month, MonthStats } from "@/lib/monthStats";
import { cumulativeAtDay } from "@/lib/monthStats";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { WeekdayChart } from "@/components/insights/WeekdayChart";
import { MonthChart } from "@/components/month/MonthChart";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";

type MonthEntry = { month: Month; stats: MonthStats };

type MonthInsightsProps = {
  active: MonthEntry;
  /** Every month, oldest first (includes the active one). */
  all: MonthEntry[];
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 font-medium text-foreground">{title}</h3>
      {children}
    </div>
  );
}

export function MonthInsights({ active, all }: MonthInsightsProps) {
  const { month, stats } = active;
  const isMonth = month.kind === "month";
  const activeIndex = isMonth ? all.findIndex((entry) => entry.month.id === month.id) : -1;
  const previous = activeIndex > 0 ? all[activeIndex - 1] : null;
  const remaining = month.budget - stats.spent;

  // Same day-of-month comparison, like the "waar sta ik nu?" block in the sheet.
  const day = Math.max(1, stats.daysElapsed || stats.daysInMonth);
  const sameDayDelta = previous ? stats.spent - cumulativeAtDay(previous.stats, day) : null;

  return (
    <div className="flex flex-col gap-4">
      <SummaryCards
        cards={[
          {
            label: "Spent",
            value: formatCurrency(stats.spent),
            hint: `${formatPercent(stats.budgetUsedPercent)} of ${formatCurrency(month.budget)}`,
          },
          {
            label: remaining >= 0 ? "Left in budget" : "Over budget",
            value: formatCurrency(Math.abs(remaining)),
            tone: remaining >= 0 ? "positive" : "negative",
          },
          {
            label: "Average per day",
            value: formatCurrency(stats.avgPerDay),
            hint: `day ${stats.daysElapsed} of ${stats.daysInMonth}`,
          },
          {
            label: "Expected total",
            value: formatCurrency(stats.expectedTotal),
            tone: stats.expectedVsBudget < 0 ? "negative" : "neutral",
            hint:
              stats.expectedVsBudget < 0
                ? `${formatCurrency(-stats.expectedVsBudget)} over budget`
                : `${formatCurrency(stats.expectedVsBudget)} under budget`,
          },
        ]}
      />

      <Card title="Cumulative spend vs budget">
        <MonthChart daily={stats.daily} />
      </Card>

      <Card title="Spend by category">
        <CategoryBreakdown
          categories={stats.categories.map((c) => ({
            id: c.id,
            name: c.name,
            totalSpent: c.total,
            dailyAverage: c.avgPerDay,
            percentOfBudget: month.budget > 0 ? (c.total / month.budget) * 100 : 0,
          }))}
        />
      </Card>

      <SummaryCards
        cards={[
          {
            label: "Days with spending",
            value: `${stats.daysWithSpend}`,
            hint: `${formatCurrency(stats.avgPerSpendDay)} per spending day`,
          },
          {
            label: "Priciest day",
            value: stats.priciestDay ? formatCurrency(stats.priciestDay.total) : "—",
            hint: stats.priciestDay ? formatDate(stats.priciestDay.date) : undefined,
          },
          {
            label: previous ? `vs ${previous.month.name}, same day` : "vs previous month",
            value: sameDayDelta !== null ? formatCurrency(Math.abs(sameDayDelta)) : "—",
            tone: sameDayDelta === null ? "neutral" : sameDayDelta <= 0 ? "positive" : "negative",
            hint:
              sameDayDelta === null
                ? "no earlier month yet"
                : sameDayDelta <= 0
                  ? `less spent by day ${day}`
                  : `more spent by day ${day}`,
          },
          {
            label: "Beer share",
            value: formatPercent(stats.beer.percentOfSpend),
            hint: `~${stats.beer.pints} pints`,
          },
        ]}
      />

      <Card title="🍺 Beer">
        {stats.beer.pints === 0 ? (
          <p className="text-sm text-ink-muted">
            No beer counted yet. Give a category a pint price (Expenses → Categories → Edit) to
            count it as beer.
          </p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Beer spend" value={formatCurrency(stats.beer.spend)} />
            <Stat label="Estimated pints" value={`${stats.beer.pints}`} />
            <Stat
              label="Avg price / pint"
              value={stats.beer.avgPricePerPint !== null ? formatCurrency(stats.beer.avgPricePerPint) : "—"}
            />
            <Stat label="Pints / day" value={stats.beer.pintsPerDay.toFixed(1).replace(".", ",")} />
          </dl>
        )}
      </Card>

      <Card title="By category">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="text-xs text-ink-muted">
              <tr>
                <th className="pb-2 font-normal">Category</th>
                <th className="pb-2 text-right font-normal">Total</th>
                <th className="pb-2 text-right font-normal">%</th>
                <th className="pb-2 text-right font-normal">Days</th>
                <th className="pb-2 text-right font-normal">Avg / day</th>
                <th className="pb-2 text-right font-normal">Busiest day</th>
              </tr>
            </thead>
            <tbody>
              {stats.categories
                .filter((c) => c.total > 0)
                .map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="py-2 text-foreground">{c.name}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{formatCurrency(c.total)}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{formatPercent(c.percent)}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{c.daysWithSpend}</td>
                    <td className="py-2 text-right font-mono tabular-nums">
                      {formatCurrency(c.avgPerSpendDay)}
                    </td>
                    <td className="py-2 text-right text-ink-muted">
                      {c.busiestDay ? `${formatDate(c.busiestDay)} · ${formatCurrency(c.busiestDayAmount)}` : "—"}
                    </td>
                  </tr>
                ))}
              {stats.spent === 0 && (
                <tr>
                  <td colSpan={6} className="py-3 text-ink-muted">
                    No expenses this month yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Average per weekday">
          <WeekdayChart weekdays={stats.weekdays} />
        </Card>

        <Card title="Top 5 priciest days">
          {stats.topDays.length === 0 ? (
            <p className="text-sm text-ink-muted">Nothing yet.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {stats.topDays.map((d, i) => (
                <li key={d.date} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-foreground">
                    {i + 1}. {formatDate(d.date)}
                    <span className="ml-2 text-ink-muted">mostly {d.topCategory}</span>
                  </span>
                  <span className="font-mono tabular-nums text-foreground">{formatCurrency(d.total)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {isMonth && all.length > 1 && (
        <Card title="Month comparison">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-xs text-ink-muted">
                <tr>
                  <th className="pb-2 font-normal">Month</th>
                  <th className="pb-2 text-right font-normal">Budget</th>
                  <th className="pb-2 text-right font-normal">Spent</th>
                  <th className="pb-2 text-right font-normal">% used</th>
                  <th className="pb-2 text-right font-normal">Avg / day</th>
                  <th className="pb-2 text-right font-normal">Expected</th>
                  <th className="pb-2 text-right font-normal">Beer</th>
                </tr>
              </thead>
              <tbody>
                {[...all].reverse().map(({ month: m, stats: s }) => (
                  <tr
                    key={m.id}
                    className={`border-t border-border ${m.id === month.id ? "bg-surface-muted" : ""}`}
                  >
                    <td className="py-2 text-foreground">
                      {m.name}
                      {s.isCurrent && <span className="ml-1 text-xs text-ink-muted">(running)</span>}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">{formatCurrency(m.budget)}</td>
                    <td className="py-2 text-right font-mono tabular-nums">{formatCurrency(s.spent)}</td>
                    <td className="py-2 text-right font-mono tabular-nums">
                      {formatPercent(s.budgetUsedPercent)}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">{formatCurrency(s.avgPerDay)}</td>
                    <td
                      className={`py-2 text-right font-mono tabular-nums ${
                        s.expectedVsBudget < 0 ? "text-critical" : "text-positive-text"
                      }`}
                    >
                      {formatCurrency(s.expectedTotal)}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">{s.beer.pints} 🍺</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="font-mono text-lg font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
