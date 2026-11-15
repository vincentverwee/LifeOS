import Link from "next/link";
import { InflationChart } from "@/components/invest/InvestChartsLazy";
import { FundDot } from "@/components/invest/FundDot";
import type { SavingsAccountView } from "@/lib/data/inflation";
import { formatCurrency } from "@/lib/format";
import { formatMonth, formatPct, formatSignedCurrency, formatSignedPct, gainClass } from "@/lib/invest/format";
import { keepUpSeries, realRate, realResult, yearOnYear, type CpiPoint } from "@/lib/invest/inflation";
import { valueSeries, type Totals } from "@/lib/invest/stats";
import type { PricePoint, Trade } from "@/lib/invest/types";


/**
 * Insights' inflation section: Belgian inflation, the real gain (each trade grown with
 * prices from its own month), worth vs keep up vs mattress, and each savings account's
 * real interest. Typing balances and the Belgian price history live on /invest/inflation.
 */
export function InflationInsight({
  trades,
  prices,
  totals,
  cpi,
  accounts,
  todayKey,
}: {
  trades: Trade[];
  prices: Record<string, PricePoint[]>;
  totals: Totals;
  cpi: CpiPoint[];
  accounts: SavingsAccountView[];
  todayKey: string;
}) {
  const latest = cpi.at(-1) ?? null;
  const more = (
    <Link href="/invest/inflation" className="btn btn-ghost -mx-3 inline-flex min-h-11 self-start px-3 text-sm">
      Belgian prices and your budget ›
    </Link>
  );
  if (!latest) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="section-title">Compared with inflation</h2>
        <p className="text-sm text-ink-muted">The Belgian inflation figures haven&apos;t come in yet.</p>
        {more}
      </section>
    );
  }

  const yoy = yearOnYear(cpi).at(-1)?.pct ?? null;
  const hasTrades = trades.length > 0;
  const real = hasTrades ? realResult(trades, cpi, totals.value) : null;
  const points = hasTrades ? keepUpSeries(trades, cpi, valueSeries(trades, prices, todayKey)) : [];
  const yoyLine = (
    <>
      Belgian prices are up <span className="font-medium text-foreground">{yoy !== null ? formatPct(yoy) : "?"}</span> on a year earlier (known up to{" "}
      {formatMonth(latest.month)}).
    </>
  );
  const savings = accounts.filter((a) => !a.isArchived && a.balances.length > 0);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="section-title">Compared with inflation</h2>
      {real ? (
        <div className="card p-5">
          <p className={`font-mono text-3xl font-semibold tabular-nums ${gainClass(real.realGain)}`}>{formatSignedCurrency(real.realGain)}</p>
          <p className="text-sm text-ink-muted">
            real gain {real.realPct !== null && `(${formatSignedPct(real.realPct)})`} · every buy grown with prices since its month needs{" "}
            {formatCurrency(real.keepUp)}, you have {formatCurrency(totals.value)}
          </p>
          <div className="mt-3">
            <InflationChart points={points} />
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
          <p className="mt-3 border-t border-border pt-3 text-sm text-ink-muted">{yoyLine}</p>
        </div>
      ) : (
        <div className="card p-5">
          <p className="text-sm text-ink-muted">Prices vs a year earlier</p>
          <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">{yoy !== null ? formatPct(yoy) : "?"}</p>
          <p className="text-sm text-ink-muted">Money that earns less than this loses buying power. After your first buy, your real gain shows here.</p>
        </div>
      )}

      {savings.length > 0 && (
        <ul className="card-list">
          {savings.map((a) => {
            const balance = a.balances[0].balance;
            const r = a.ratePct !== null && yoy !== null ? realRate(a.ratePct / 100, yoy) : null;
            return (
              <li key={a.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <FundDot color={a.color} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{a.name}</span>
                  <span className="block truncate text-xs text-ink-muted">
                    {formatCurrency(balance)}
                    {a.ratePct !== null && ` · ${formatPct(a.ratePct / 100)} interest`}
                  </span>
                </span>
                {r !== null && (
                  <span className={`shrink-0 text-right text-sm tabular-nums ${gainClass(r)}`}>
                    {formatSignedPct(r)} real
                    <span className="block text-xs">{formatSignedCurrency(balance * r)} a year</span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {more}
    </section>
  );
}
