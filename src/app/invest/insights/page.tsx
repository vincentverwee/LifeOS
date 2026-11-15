import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Disclosure } from "@/components/Disclosure";
import { FundDot } from "@/components/invest/FundDot";
import { DepositsChart } from "@/components/invest/InvestChartsLazy";
import { getPortfolio } from "@/lib/data/invest";
import { getCpi, getSavingsAccounts } from "@/lib/data/inflation";
import { InflationInsight } from "@/components/invest/InflationInsight";
import { getTodayKey } from "@/lib/today";
import { formatCurrency } from "@/lib/format";
import { formatSignedCurrency, gainClass } from "@/lib/invest/format";
import { allocation, depositsByMonth, sortTrades, yearResult } from "@/lib/invest/stats";

export const metadata = { title: "Investment insights" };

const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const pctFmt = (n: number) => `${n.toLocaleString("nl-BE", { maximumFractionDigits: 1 })}%`;

export default async function InvestInsightsPage() {
  const [todayKey, { trades, prices, positions, totals }, cpi, accounts] = await Promise.all([getTodayKey(), getPortfolio(), getCpi(), getSavingsAccounts()]);
  const header = <PageHeader title="Insights" back={{ href: "/invest", label: "Investments" }} />;
  if (trades.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <p className="text-sm text-ink-muted">Nothing to show until your first trade.</p>
        <Link href="/invest/inflation" className="card tap flex min-h-14 items-center justify-between gap-3 p-5">
          <span className="font-medium text-foreground">Savings and budget vs inflation</span>
          <span aria-hidden="true" className="text-xl text-ink-muted">
            ›
          </span>
        </Link>
      </div>
    );
  }

  const slices = allocation(positions);
  const hasTargets = slices.some((s) => s.target !== null);

  // The last 12 months, empty ones included, so the bars show the rhythm.
  const deposits = new Map(depositsByMonth(trades).map((d) => [d.month, d.net]));
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(`${todayKey.slice(0, 7)}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - (11 - i));
    const key = d.toISOString().slice(0, 7);
    return { month: key, label: monthLabel.format(d), net: Math.round((deposits.get(key) ?? 0) * 100) / 100 };
  });
  const firstMonth = sortTrades(trades)[0].date.slice(0, 7);
  const shownMonths = months.filter((m) => m.month >= firstMonth);
  const monthsActive = shownMonths.filter((m) => m.net > 0).length;
  const average = monthsActive > 0 ? shownMonths.reduce((s, m) => s + Math.max(m.net, 0), 0) / shownMonths.length : 0;

  const year = Number(todayKey.slice(0, 4));
  const firstYear = Number(sortTrades(trades)[0].date.slice(0, 4));
  const years = Array.from({ length: year - firstYear + 1 }, (_, i) => year - i).map((y) => ({ year: y, ...yearResult(trades, y) }));
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
        <h2 className="section-title">Put in per month</h2>
        <p className="text-sm text-ink-muted">
          {formatCurrency(average)} a month on average · {monthsActive} of the last {shownMonths.length} {shownMonths.length === 1 ? "month" : "months"}
        </p>
        <div className="mt-3">
          <DepositsChart months={shownMonths} />
        </div>
      </section>

      <Disclosure title="Per year">
        <ul className="card-list">
          {years.map((y) => (
            <li key={y.year} className="flex items-center justify-between gap-3 p-4 text-sm">
              <span className="font-medium text-foreground">{y.year}</span>
              <span className="text-right tabular-nums">
                <span className={gainClass(y.realised)}>{formatSignedCurrency(y.realised)}</span>
                <span className="text-ink-muted"> realised · {formatCurrency(y.dividends)} dividends</span>
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
