import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Disclosure } from "@/components/Disclosure";
import { RangeSwitch, readRange } from "@/components/invest/RangeSwitch";
import { SavingsCard } from "@/components/invest/SavingsCard";
import { InflationChart, YoYChart } from "@/components/invest/InvestChartsLazy";
import { getPortfolio } from "@/lib/data/invest";
import { getBudgetMonths, getCpi, getSavingsAccounts } from "@/lib/data/inflation";
import { getTodayKey } from "@/lib/today";
import { formatCurrency } from "@/lib/format";
import { formatSignedCurrency, formatSignedPct, gainClass } from "@/lib/invest/format";
import { budgetVsInflation, factor, inTodaysEuros, keepUpSeries, monthOf, realResult, yearOnYear } from "@/lib/invest/inflation";
import { addDays, sortTrades, valueSeries } from "@/lib/invest/stats";

export const metadata = { title: "Inflation" };

const monthLong = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const monthShort = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const labelOf = (month: string, f = monthLong) => f.format(new Date(`${month}-01T00:00:00Z`));
const pct = (share: number) => `${(share * 100).toLocaleString("nl-BE", { maximumFractionDigits: 1 })}%`;

export default async function InflationPage({ searchParams }: PageProps<"/invest/inflation">) {
  const [{ range: rangeParam }, todayKey, cpi, portfolio, accounts] = await Promise.all([
    searchParams,
    getTodayKey(),
    getCpi(),
    getPortfolio(),
    getSavingsAccounts(),
  ]);
  const budget = await getBudgetMonths(todayKey);
  const range = readRange(rangeParam);
  const header = (subtitle?: string) => <PageHeader title="Inflation" subtitle={subtitle} back={{ href: "/invest", label: "Investments" }} />;

  if (cpi.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header()}
        <p className="text-sm text-ink-muted">The Belgian inflation figures haven&apos;t come in yet. They&apos;re fetched once a day; check back in a little while.</p>
      </div>
    );
  }

  const latest = cpi.at(-1)!;
  const yoy = yearOnYear(cpi);
  const inflation = yoy.at(-1)?.pct ?? null;
  const { trades, prices, totals } = portfolio;
  const activeAccounts = accounts.filter((a) => !a.isArchived);

  // Investments vs inflation.
  const series = trades.length > 0 ? valueSeries(trades, prices, todayKey, { from: range.days ? addDays(todayKey, -range.days) : undefined }) : [];
  const keepUp = keepUpSeries(trades, cpi, series);
  const real = trades.length > 0 ? realResult(trades, cpi, totals.value) : null;
  const firstTrade = trades.length > 0 ? sortTrades(trades)[0].date : null;

  // Budget vs inflation.
  const { rows, first } = budgetVsInflation(budget.months, cpi, budget.current);

  // Facts.
  const thisYear = Number(todayKey.slice(0, 4));
  const facts = [
    { label: "2015", month: "2015-01" },
    { label: "2020", month: "2020-01" },
    { label: "a year ago", month: `${Number(latest.month.slice(0, 4)) - 1}-${latest.month.slice(5)}` },
  ];
  const bars = yoy.slice(-36).map((p) => ({ month: p.month, label: labelOf(p.month, monthShort), pct: Math.round(p.pct * 1000) / 10 }));

  return (
    <div className="flex flex-col gap-6">
      {header(`Belgium · known up to ${labelOf(latest.month)}`)}

      <section className="card p-5">
        <p className="text-sm text-ink-muted">Prices vs a year earlier</p>
        <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">{inflation !== null ? pct(inflation) : "?"}</p>
        <p className="text-sm text-ink-muted">Money that earns less than this loses buying power.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Investments</h2>
        {real ? (
          <div className="card p-5">
            <p className={`font-mono text-3xl font-semibold tabular-nums ${gainClass(real.realGain)}`}>{formatSignedCurrency(real.realGain)}</p>
            <p className="text-sm text-ink-muted">
              after inflation {real.realPct !== null && `(${formatSignedPct(real.realPct)})`} · worth {formatCurrency(totals.value)}, to keep up you needed{" "}
              {formatCurrency(real.keepUp)}
            </p>
            <div className="mt-3">
              <RangeSwitch base="/invest/inflation" current={range} />
            </div>
            <div className="mt-3">
              <InflationChart points={keepUp} />
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-primary" aria-hidden="true" /> Worth
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-dashed border-warning" aria-hidden="true" /> To keep up
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-ink-muted" aria-hidden="true" /> Under the mattress
              </span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            Log a buy and this shows whether your investments beat inflation.{" "}
            <Link href="/invest/add" className="btn btn-ghost -mx-1 inline-flex min-h-11 px-3">
              Log a trade
            </Link>
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Savings</h2>
        {activeAccounts.length === 0 ? (
          <p className="text-sm text-ink-muted">
            Add your savings account to compare its interest with inflation.{" "}
            <Link href="/invest/settings" className="btn btn-ghost -mx-1 inline-flex min-h-11 px-3">
              Add an account
            </Link>
          </p>
        ) : (
          activeAccounts.map((a) => <SavingsCard key={a.id} account={a} cpi={cpi} inflation={inflation} todayKey={todayKey} />)
        )}
      </section>

      {budget.current && (
        <section className="flex flex-col gap-3">
          <h2 className="section-title">Budget</h2>
          <div className="card p-5">
            {first ? (
              <>
                <p className="text-sm text-ink-muted">
                  Your first {budget.current.label ?? ""} month ({labelOf(monthOf(first.start))}) had {formatCurrency(first.budget)}. In today&apos;s money that&apos;s
                </p>
                <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">{formatCurrency(first.keepUp)}</p>
                <p className="text-sm text-ink-muted">
                  Your budget now is {formatCurrency(budget.current.budget)}
                  {budget.current.budget + 0.5 < first.keepUp
                    ? `: ${formatCurrency(first.keepUp - budget.current.budget)} short of keeping up.`
                    : ": it keeps up with prices."}
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-muted">Once a {budget.current.label ?? ""} month has finished, this compares your budget with prices.</p>
            )}
          </div>
          {rows.length > 0 && (
            <Disclosure title="Spending in today's money">
              <ul className="divide-y divide-border">
                {rows.slice(0, 12).map((r) => (
                  <li key={r.start} className="flex min-h-12 items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">
                      {labelOf(monthOf(r.start))}
                      {r.label && <span className="text-ink-muted"> · {r.label}</span>}
                    </span>
                    <span className="text-right tabular-nums">
                      <span className="text-foreground">{formatCurrency(r.spentToday)}</span>
                      <span className="text-ink-muted"> (was {formatCurrency(r.spent)})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Disclosure>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Prices in Belgium</h2>
        <div className="card p-5">
          <p className="text-sm text-ink-muted">Year on year, the last {bars.length} months. The line is the ECB&apos;s 2 % target.</p>
          <div className="mt-3">
            <YoYChart months={bars} />
          </div>
          <ul className="mt-4 flex flex-col gap-1 border-t border-border pt-3 text-sm">
            {facts.map((f) => (
              <li key={f.label} className="flex justify-between gap-3">
                <span className="text-ink-muted">€100 from {f.label}</span>
                <span className="tabular-nums text-foreground">{formatCurrency(inTodaysEuros(100, f.month, cpi))} today</span>
              </li>
            ))}
            {firstTrade && (
              <li className="flex justify-between gap-3">
                <span className="text-ink-muted">Prices since your first trade</span>
                <span className="tabular-nums text-foreground">{formatSignedPct(factor(cpi, monthOf(firstTrade), latest.month) - 1)}</span>
              </li>
            )}
          </ul>
          {thisYear > Number(latest.month.slice(0, 4)) && <p className="mt-2 text-xs text-ink-muted">This year&apos;s figures aren&apos;t out yet.</p>}
        </div>
      </section>
    </div>
  );
}
