import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { FundDot } from "@/components/invest/FundDot";
import { RefreshPricesButton } from "@/components/invest/RefreshPricesButton";
import { ValueChart } from "@/components/invest/InvestChartsLazy";
import { getPortfolio } from "@/lib/data/invest";
import { getTimeZone, getTodayKey } from "@/lib/today";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatPrice, formatSignedCurrency, formatSignedPct, formatUnits, gainClass } from "@/lib/invest/format";
import { addDays, growthBetween, valueSeries } from "@/lib/invest/stats";

export const metadata = { title: "Investments" };

const RANGES = [
  { key: "1m", label: "1M", days: 30 },
  { key: "6m", label: "6M", days: 182 },
  { key: "1y", label: "1Y", days: 365 },
  { key: "all", label: "All", days: null },
] as const;

/** "today 14:05" / "13 Nov 14:05" in the viewer's time zone. */
function describeFetched(iso: string, tz: string, todayKey: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(d);
  return day === todayKey ? `today ${time}` : `${formatDate(day)} ${time}`;
}

export default async function InvestPage({ searchParams }: PageProps<"/invest">) {
  const [{ range: rangeParam }, todayKey, tz, portfolio] = await Promise.all([searchParams, getTodayKey(), getTimeZone(), getPortfolio()]);
  const { funds, trades, prices, positions, totals } = portfolio;
  const range = RANGES.find((r) => r.key === rangeParam) ?? RANGES[3];

  const newest = funds.map((f) => f.pricesFetchedAt).filter((x): x is string => x !== null).sort().at(-1) ?? null;
  const header = (
    <PageHeader title="Investments" section="invest" subtitle={trades.length > 0 ? `${positions.filter((p) => p.units > 0).length} funds · long term` : undefined} />
  );

  if (funds.length === 0 || trades.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <section className="card flex flex-col items-start gap-3 p-5">
          <h2 className="section-title">{funds.length === 0 ? "Add your first fund" : "Log your first buy"}</h2>
          <p className="text-sm text-ink-muted">
            {funds.length === 0
              ? "Search your ETF by name or ticker (e.g. VWCE.DE). Prices come in by themselves every few hours."
              : "Copy the numbers from Bolero's order confirmation: units, price, fee and TOB."}
          </p>
          <Link href={funds.length === 0 ? "/invest/settings" : "/invest/add"} className="btn btn-primary min-h-11 px-5 text-sm font-semibold">
            {funds.length === 0 ? "Add a fund" : "Log a buy"}
          </Link>
        </section>
      </div>
    );
  }

  const series = valueSeries(trades, prices, todayKey, { from: range.days ? addDays(todayKey, -range.days) : undefined });
  const growth = series.length > 1 ? growthBetween(series[0], series.at(-1)!) : null;
  const held = positions.filter((p) => p.units > 0);
  const sold = positions.filter((p) => p.units === 0);

  return (
    <div className="flex flex-col gap-6">
      {header}

      <section className="card p-5">
        <p className="text-sm text-ink-muted">Worth now</p>
        <p className="font-mono text-4xl font-semibold tracking-tight tabular-nums text-foreground">{formatCurrency(totals.value)}</p>
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
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="section-title">Value over time</h2>
          <nav aria-label="Range" className="flex gap-1">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={r.key === "all" ? "/invest" : `/invest?range=${r.key}`}
                aria-current={r.key === range.key ? "page" : undefined}
                className={`flex min-h-11 min-w-11 items-center justify-center rounded-full px-2 text-xs font-medium ${
                  r.key === range.key ? "bg-surface-muted text-foreground" : "text-ink-muted"
                }`}
              >
                {r.label}
              </Link>
            ))}
          </nav>
        </div>
        {growth !== null && (
          <p className="text-sm text-ink-muted">
            <span className={gainClass(growth)}>{formatSignedCurrency(growth)}</span> growth {range.days ? `in ${range.label}` : "since the start"}, new money left out
          </p>
        )}
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

      <section>
        <h2 className="section-title mb-2">Funds</h2>
        <ul className="card-list">
          {held.map((p) => (
            <li key={p.fund.id} className="flex items-start gap-3 p-4">
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
                  {p.priceDate ? ` · close ${formatDate(p.priceDate)}` : " · no price yet (last trade)"} · cost {formatCurrency(p.cost)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {sold.length > 0 && <p className="mt-2 text-xs text-ink-muted">Sold out: {sold.map((p) => p.fund.ticker).join(", ")}</p>}
      </section>

      <RefreshPricesButton updated={newest ? describeFetched(newest, tz, todayKey) : null} />
    </div>
  );
}
