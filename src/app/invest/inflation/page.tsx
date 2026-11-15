import { PageHeader } from "@/components/ui/PageHeader";
import { Disclosure } from "@/components/Disclosure";
import { FetchInflationButton } from "@/components/invest/FetchInflationButton";
import { YoYChart } from "@/components/invest/InvestChartsLazy";
import { getPortfolio } from "@/lib/data/invest";
import { getBudgetMonths, getCpi } from "@/lib/data/inflation";
import { getTodayKey } from "@/lib/today";
import { formatCurrency } from "@/lib/format";
import { formatMonth, formatPct, formatSignedPct } from "@/lib/invest/format";
import { budgetVsInflation, factor, inTodaysEuros, monthOf, yearOnYear } from "@/lib/invest/inflation";
import { sortTrades } from "@/lib/invest/stats";

export const metadata = { title: "Inflation" };


export default async function InflationPage() {
  const todayKey = await getTodayKey();
  const [cpi, portfolio, budget] = await Promise.all([getCpi(), getPortfolio(), getBudgetMonths(todayKey)]);
  const header = (subtitle?: string) => <PageHeader title="Inflation" subtitle={subtitle} back={{ href: "/invest", label: "Investments" }} />;

  // Without figures (before the first fetch) savings still show, so balances can be typed in.
  const latest = cpi.at(-1) ?? null;
  const yoy = yearOnYear(cpi);
  const inflation = yoy.at(-1)?.pct ?? null;
  const { trades } = portfolio;

  const firstTrade = trades.length > 0 ? sortTrades(trades)[0].date : null;

  // Budget vs inflation.
  const { rows, power } = budgetVsInflation(budget.months, cpi, budget.current);
  // Only months whose prices differ from today's say anything.
  const changed = rows.filter((r) => Math.abs(r.spentToday - r.spent) >= 1).slice(0, 12);

  // Facts.
  const thisYear = Number(todayKey.slice(0, 4));
  const facts = [
    { label: "2015", month: "2015-01" },
    { label: "2020", month: "2020-01" },
    ...(latest ? [{ label: "a year ago", month: `${Number(latest.month.slice(0, 4)) - 1}-${latest.month.slice(5)}` }] : []),
  ];
  const bars = yoy.slice(-36).map((p) => ({ month: p.month, label: formatMonth(p.month, true), pct: Math.round(p.pct * 1000) / 10 }));

  return (
    <div className="flex flex-col gap-6">
      {header(latest ? `Belgium · known up to ${formatMonth(latest.month)}` : "Belgium")}

      {latest ? (
        <section className="card p-5">
          <p className="text-sm text-ink-muted">Prices vs a year earlier</p>
          <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">{inflation !== null ? formatPct(inflation) : "?"}</p>
          <p className="text-sm text-ink-muted">Money that earns less than this loses buying power.</p>
        </section>
      ) : (
        <section className="card flex flex-col gap-3 p-5">
          <p className="text-sm text-ink-muted">
            The Belgian inflation figures haven&apos;t come in yet. They&apos;re fetched once a day by themselves, or get them now.
          </p>
          <FetchInflationButton />
        </section>
      )}

      {power && (
        <section className="flex flex-col gap-3">
          <h2 className="section-title">Your budget</h2>
          <div className="card p-5">
            <p className="text-sm text-ink-muted">
              Prices are up {formatPct(power.rise)} since {formatMonth(power.since)}. Your {formatCurrency(power.budget)} budget now buys what
            </p>
            <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">{formatCurrency(power.buys)}</p>
            <p className="text-sm text-ink-muted">did back then.</p>
          </div>
          {changed.length > 0 && (
            <Disclosure title="Spending in today's money">
              <ul className="divide-y divide-border">
                {changed.map((r) => (
                  <li key={r.start} className="flex min-h-12 items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">
                      {formatMonth(monthOf(r.start))}
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

      {latest && (
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
      )}
    </div>
  );
}
