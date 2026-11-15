import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { FundDot } from "@/components/invest/FundDot";
import { RefreshPricesButton } from "@/components/invest/RefreshPricesButton";
import { RangeSwitch, readRange } from "@/components/invest/RangeSwitch";
import { SavingsCard } from "@/components/invest/SavingsCard";
import { ValueChart } from "@/components/invest/InvestChartsLazy";
import { getPortfolio } from "@/lib/data/invest";
import { getCpi, getSavingsAccounts } from "@/lib/data/inflation";
import { realResult, yearOnYear } from "@/lib/invest/inflation";
import { getTimeZone, getTodayKey } from "@/lib/today";
import { formatCurrency } from "@/lib/format";
import { formatDay, formatPrice, formatSignedCurrency, formatSignedPct, formatUnits, gainClass } from "@/lib/invest/format";
import { addDays, growthBetween, valueSeries } from "@/lib/invest/stats";

export const metadata = { title: "Investments" };

/** "today 14:05" / "13 Nov 14:05" in the viewer's time zone. */
function describeFetched(iso: string, tz: string, todayKey: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(d);
  return day === todayKey ? `today ${time}` : `${formatDay(day, todayKey)} ${time}`;
}

/** After inflation: the real gain (opens Insights) once there are trades, else the way to Belgian prices. */
function InflationLink({ real }: { real: { realGain: number; realPct: number | null } | null }) {
  return (
    <Link href={real ? "/invest/insights" : "/invest/inflation"} className="card tap flex min-h-14 items-center justify-between gap-3 p-5">
      <span className="min-w-0">
        <span className="block text-sm text-ink-muted">{real ? "Investments after inflation" : "Inflation"}</span>
        {real ? (
          <span className={`block font-medium tabular-nums ${gainClass(real.realGain)}`}>
            {formatSignedCurrency(real.realGain)} {real.realPct !== null && `(${formatSignedPct(real.realPct)})`}
          </span>
        ) : (
          <span className="block font-medium text-foreground">Belgian prices and your budget</span>
        )}
      </span>
      <span aria-hidden="true" className="text-xl text-ink-muted">
        ›
      </span>
    </Link>
  );
}

export default async function InvestPage({ searchParams }: PageProps<"/invest">) {
  const [{ range: rangeParam }, todayKey, tz, portfolio, cpi, accounts] = await Promise.all([
    searchParams,
    getTodayKey(),
    getTimeZone(),
    getPortfolio(),
    getCpi(),
    getSavingsAccounts(),
  ]);
  const { funds, trades, prices, positions, totals } = portfolio;
  const range = readRange(rangeParam);
  const inflation = yearOnYear(cpi).at(-1)?.pct ?? null;
  const savings = accounts.filter((a) => !a.isArchived);
  const held = positions.filter((p) => p.units > 0);
  const sold = positions.filter((p) => p.units === 0);
  const newest = funds.map((f) => f.pricesFetchedAt).filter((x): x is string => x !== null).sort().at(-1) ?? null;

  // Savings first: it's what changes most often and matters most.
  const savingsSection = (
    <section className="flex flex-col gap-3">
      <h2 className="section-title">Savings</h2>
      {savings.length === 0 ? (
        <div className="card flex flex-col items-start gap-3 p-5">
          <p className="text-sm text-ink-muted">Add your savings account to see its balance and what it earns after inflation.</p>
          <Link href="/invest/settings" className="btn btn-primary inline-flex min-h-11 px-5 text-sm font-semibold">
            Add an account
          </Link>
        </div>
      ) : (
        savings.map((a) => <SavingsCard key={a.id} account={a} cpi={cpi} inflation={inflation} todayKey={todayKey} />)
      )}
    </section>
  );

  const header = <PageHeader title="Investments" section="invest" subtitle={held.length > 0 ? `${held.length} ${held.length === 1 ? "fund" : "funds"}` : undefined} />;

  if (funds.length === 0 || trades.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        {savingsSection}
        <section className="flex flex-col gap-3">
          <h2 className="section-title">Investments</h2>
          <div className="card flex flex-col items-start gap-3 p-5">
            <p className="text-sm text-ink-muted">
              {funds.length === 0
                ? "Add the ETF you buy (search by name or ticker, e.g. VWCE.DE). Prices come in by themselves."
                : "Log your first buy: copy units, price, fee and TOB from Bolero's confirmation."}
            </p>
            <Link href={funds.length === 0 ? "/invest/settings" : "/invest/add"} className="btn btn-outline inline-flex min-h-11 px-5 text-sm">
              {funds.length === 0 ? "Add a fund" : "Log a buy"}
            </Link>
          </div>
        </section>
        <InflationLink real={null} />
      </div>
    );
  }

  const series = valueSeries(trades, prices, todayKey, { from: range.days ? addDays(todayKey, -range.days) : undefined });
  const growth = series.length > 1 ? growthBetween(series[0], series.at(-1)!) : null;
  const real = cpi.length > 0 ? realResult(trades, cpi, totals.value) : null;

  return (
    <div className="flex flex-col gap-6">
      {header}

      {savingsSection}

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Investments</h2>
        <div className="card p-5">
          <p className="text-sm text-ink-muted">Worth now</p>
          <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">{formatCurrency(totals.value)}</p>
          <p className={`mt-1 text-sm font-medium ${gainClass(totals.gain)}`}>
            {formatSignedCurrency(totals.gain)} {totals.gainPct !== null && `(${formatSignedPct(totals.gainPct)})`}
            <span className="font-normal text-ink-muted"> on what you hold</span>
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
            <div>
              <dt className="text-ink-muted">Put in</dt>
              <dd className="font-medium tabular-nums text-foreground">{formatCurrency(totals.netDeposited)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Last day</dt>
              <dd className={`font-medium tabular-nums ${gainClass(totals.dayChange)}`}>{formatSignedCurrency(totals.dayChange)}</dd>
            </div>
            {(totals.realised !== 0 || totals.dividends !== 0) && (
              <>
                <div>
                  <dt className="text-ink-muted">Realised</dt>
                  <dd className={`font-medium tabular-nums ${gainClass(totals.realised)}`}>{formatSignedCurrency(totals.realised)}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">Dividends</dt>
                  <dd className="font-medium tabular-nums text-foreground">{formatCurrency(totals.dividends)}</dd>
                </div>
              </>
            )}
          </dl>
        </div>

        <ul className="card-list">
          {held.map((p) => (
            <li key={p.fund.id}>
              <Link href={`/invest/trades?fund=${p.fund.id}`} className="tap flex items-start gap-3 p-4">
                <FundDot color={p.fund.color} className="mt-1.5 h-2.5 w-2.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-medium text-foreground">{p.fund.ticker}</p>
                    <p className="font-medium tabular-nums text-foreground">{formatCurrency(p.value)}</p>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <p className="truncate text-ink-muted">{p.fund.name}</p>
                    <p className={`shrink-0 tabular-nums ${gainClass(p.gain)}`}>{formatSignedPct(p.gainPct)}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted tabular-nums">
                    {formatUnits(p.units)} × {p.price !== null ? formatPrice(p.price) : "?"}
                    {p.priceDate ? ` · close ${formatDay(p.priceDate, todayKey)}` : " · no price yet (last trade)"} · cost {formatCurrency(p.cost)}
                  </p>
                </div>
                <span aria-hidden="true" className="self-center text-xl text-ink-muted">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {sold.length > 0 && <p className="text-xs text-ink-muted">Sold out: {sold.map((p) => p.fund.ticker).join(", ")}</p>}
      </section>

      <InflationLink real={real} />

      <section className="card p-5">
        <h2 className="section-title">Value over time</h2>
        {growth !== null && (
          <p className="text-sm text-ink-muted">
            <span className={gainClass(growth)}>{formatSignedCurrency(growth)}</span> growth {range.days ? `in ${range.label}` : "since the start"}, new money left out
          </p>
        )}
        <div className="mt-3">
          <RangeSwitch base="/invest" current={range} />
        </div>
        <div className="mt-3">
          <ValueChart points={series} />
        </div>
        <p className="mt-2 flex items-center gap-4 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-primary" aria-hidden="true" /> Worth
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-dashed border-ink-muted" aria-hidden="true" /> Put in
          </span>
        </p>
      </section>

      <RefreshPricesButton updated={newest ? describeFetched(newest, tz, todayKey) : null} />
    </div>
  );
}
