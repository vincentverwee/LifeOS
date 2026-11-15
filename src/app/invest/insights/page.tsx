import { PageHeader } from "@/components/ui/PageHeader";
import { Disclosure } from "@/components/Disclosure";
import { FundDot } from "@/components/invest/FundDot";
import { DepositsChart } from "@/components/invest/InvestChartsLazy";
import { getPortfolio } from "@/lib/data/invest";
import { getCpi, getSavingsAccounts } from "@/lib/data/inflation";
import { InflationInsight } from "@/components/invest/InflationInsight";
import { getTodayKey } from "@/lib/today";
import { formatCurrency } from "@/lib/format";
import { formatPct, formatSignedCurrency, gainClass } from "@/lib/invest/format";
import { allocation, depositsByMonth, sortTrades, yearResult } from "@/lib/invest/stats";

export const metadata = { title: "Investment insights" };

/** Shares here are already in points (75 = 75 %). */
const pctFmt = (points: number) => formatPct(points / 100);

export default async function InvestInsightsPage() {
  const [todayKey, { trades, prices, positions, totals }, cpi, accounts] = await Promise.all([getTodayKey(), getPortfolio(), getCpi(), getSavingsAccounts()]);
  const header = <PageHeader title="Insights" back={{ href: "/invest", label: "Investments" }} />;
  if (trades.length === 0) {
    // Savings and prices don't need trades: only the investment part waits for the first one.
    return (
      <div className="flex flex-col gap-6">
        {header}
        <InflationInsight trades={trades} prices={prices} totals={totals} cpi={cpi} accounts={accounts} todayKey={todayKey} />
        <p className="text-sm text-ink-muted">How your money is split, money put in per month and costs show after your first trade.</p>
      </div>
    );
  }

  const slices = allocation(positions);
  const hasTargets = slices.some((s) => s.target !== null);

  // Buys come every few months or years, so money put in is shown per year (empty years included).
  const year = Number(todayKey.slice(0, 4));
  const firstYear = Number(sortTrades(trades)[0].date.slice(0, 4));
  const putIn = new Map<number, number>();
  for (const d of depositsByMonth(trades)) putIn.set(Number(d.month.slice(0, 4)), (putIn.get(Number(d.month.slice(0, 4))) ?? 0) + d.net);
  const years = Array.from({ length: year - firstYear + 1 }, (_, i) => firstYear + i).map((y) => ({
    year: y,
    putIn: Math.round((putIn.get(y) ?? 0) * 100) / 100,
    ...yearResult(trades, y),
  }));
  const bars = years.map((y) => ({ month: String(y.year), label: String(y.year), net: y.putIn }));
  const totalIn = years.reduce((s, y) => s + y.putIn, 0);
  const costs = trades.reduce((s, t) => s + (t.type === "dividend" ? 0 : t.fees + t.tax), 0);

  return (
    <div className="flex flex-col gap-6">
      {header}

      <section className="card p-5">
        <h2 className="section-title">How your money is split</h2>
        {hasTargets && <p className="text-sm text-ink-muted">The line is your target.</p>}
        <ul className="mt-3 flex flex-col gap-3">
          {slices.map((s) => (
            <li key={s.fund.id}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <FundDot color={s.fund.color} />
                  <span className="truncate font-medium text-foreground">{s.fund.ticker}</span>
                </span>
                <span className="shrink-0 tabular-nums text-foreground">
                  {pctFmt(s.share)}
                  {s.target !== null && <span className="text-ink-muted"> / {pctFmt(s.target)}</span>}
                </span>
              </div>
              <div className="relative mt-1 h-2 rounded-full bg-surface-muted">
                <div className="h-2 rounded-full" style={{ width: `${Math.min(s.share, 100)}%`, backgroundColor: `var(--color-tag-${s.fund.color})` }} />
                {s.target !== null && (
                  <span aria-hidden="true" className="absolute -top-1 h-4 w-0.5 rounded bg-foreground/60" style={{ left: `calc(${Math.min(s.target, 100)}% - 1px)` }} />
                )}
              </div>
              {s.diff !== null && Math.abs(s.diff) >= 2 && (
                <p className="mt-0.5 text-xs text-ink-muted">
                  {s.diff > 0 ? `${pctFmt(s.diff)} over target` : `${pctFmt(-s.diff)} under target: a good one for the next buy`}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <InflationInsight trades={trades} prices={prices} totals={totals} cpi={cpi} accounts={accounts} todayKey={todayKey} />

      <section className="card p-5">
        <h2 className="section-title">Bought − sold per year</h2>
        <p className="text-sm text-ink-muted">
          {formatCurrency(totalIn)} in {years.length} {years.length === 1 ? "year" : "years"}
          {totals.dividends !== 0 && " (dividends not counted)"}
        </p>
        <div className="mt-3">
          <DepositsChart months={bars} />
        </div>
      </section>

      <Disclosure title="Per year">
        <ul className="card-list">
          {[...years].reverse().map((y) => (
            <li key={y.year} className="flex items-start justify-between gap-3 p-4 text-sm">
              <span className="font-medium text-foreground">{y.year}</span>
              <span className="text-right tabular-nums">
                <span className="block text-foreground">Bought − sold {formatCurrency(y.putIn)}</span>
                <span className="block text-ink-muted">
                  <span className={gainClass(y.realised)}>{formatSignedCurrency(y.realised)}</span> realised · {formatCurrency(y.dividends)} dividends
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink-muted">
          Realised = what sells brought in above their average cost. Bolero handles the Belgian taxes on sales itself; this is only your own overview.
        </p>
      </Disclosure>

      <Disclosure title="Costs">
        <p className="text-sm text-ink-muted">
          Broker fees and TOB so far: <span className="font-medium text-foreground tabular-nums">{formatCurrency(costs)}</span>
          {totals.netDeposited > 0 && ` (${pctFmt((costs / totals.netDeposited) * 100)} of what you put in)`}.
        </p>
      </Disclosure>
    </div>
  );
}
