import Link from "next/link";
import { getTodayKey } from "@/lib/today";
import { getBeerVisits } from "@/lib/data/beer";
import { pricesByMonth, totals } from "@/lib/beer/stats";
import {
  biggestNights,
  byPub,
  comparisonDay,
  daysInMonth,
  everyMonth,
  inMonth,
  monthOf,
  monthTitle,
  runningPints,
  shiftMonth,
  toDate,
  usualMonth,
  weekdays,
} from "@/lib/beer/insights";
import { formatCurrency, formatDate, formatLiters, plural } from "@/lib/format";
import { Disclosure } from "@/components/Disclosure";
import { PintsBarChart, PintsCompareChart, PriceChart, type PintsPoint } from "@/components/beer/BeerCharts";
import { LOG_BEER_HREF } from "@/components/beer/nav";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const shortMonth = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-3 font-medium text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default async function BeerInsightsPage(props: PageProps<"/beer/insights">) {
  const { month: requested } = await props.searchParams;
  const [todayKey, visits] = await Promise.all([getTodayKey(), getBeerVisits()]);

  if (visits.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Insights</h1>
        <p className="text-sm text-ink-muted">Nothing to show yet: log a beer first.</p>
        <Link href={LOG_BEER_HREF} className="btn btn-primary inline-flex self-start px-5 py-2.5 text-sm font-semibold">
          Log a beer
        </Link>
      </div>
    );
  }

  // Any month from the first beer to now; anything else falls back to this month.
  const first = monthOf(visits[0].date);
  const current = monthOf(todayKey);
  const month =
    typeof requested === "string" && MONTH.test(requested) && requested >= first && requested <= current ? requested : current;
  const href = (m: string) => (m === current ? "/beer/insights" : `/beer/insights?month=${m}`);

  const monthVisits = inMonth(visits, month);
  const sum = totals(monthVisits);
  const day = comparisonDay(month, todayKey);
  const length = daysInMonth(month);
  const finished = day >= length;
  const run = runningPints(visits, month);
  const usual = usualMonth(visits, month, todayKey);
  const atDay = usual && day > 0 ? usual.byDay[day - 1] : null;
  const delta = atDay !== null ? Math.round((sum.pints - atDay) * 10) / 10 : null;

  const chart: PintsPoint[] = Array.from({ length }, (_, i) => ({
    day: i + 1,
    actual: i < day ? run[i] : null,
    usual: usual ? usual.byDay[i] : null,
  }));
  const pubs = byPub(monthVisits);
  const nights = biggestNights(monthVisits);
  const weekdayRows = weekdays(visits, month === current ? todayKey : `${month}-${String(length).padStart(2, "0")}`);
  const prices = pricesByMonth(visits).map((p) => ({
    label: shortMonth.format(toDate(p.month)),
    price: Math.round(p.pricePerPint * 100) / 100,
    pints: p.pints,
  }));
  const months = everyMonth(visits, current);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Insights</h1>
        <nav aria-label="Month" className="flex items-center">
          {month > first ? (
            <Link href={href(shiftMonth(month, -1))} aria-label="Previous month" className="btn btn-ghost flex h-11 w-11 text-lg">
              ‹
            </Link>
          ) : (
            <span className="h-11 w-11" />
          )}
          <span className="min-w-28 text-center text-sm font-medium text-foreground">{monthTitle.format(toDate(month))}</span>
          {month < current ? (
            <Link href={href(shiftMonth(month, 1))} aria-label="Next month" className="btn btn-ghost flex h-11 w-11 text-lg">
              ›
            </Link>
          ) : (
            <span className="h-11 w-11" />
          )}
        </nav>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <p className="text-sm text-ink-muted">{finished ? "Pints in total" : `Pints so far · day ${day} of ${length}`}</p>
        <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-foreground">
          {sum.pints} <span className="text-base text-ink-muted">{sum.pints === 1 ? "pint" : "pints"}</span>
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {formatLiters(sum.liters)} · {formatCurrency(sum.spend)}
          {sum.pricePerPint !== null && ` · ${formatCurrency(sum.pricePerPint)} a pint`}
          {sum.days > 0 && ` · ${plural(sum.days, "night", "nights")} out`}
        </p>
        {delta !== null && usual ? (
          <p className="mt-3 text-sm text-foreground">
            <span aria-hidden="true">{delta > 0 ? "▲ " : delta < 0 ? "▼ " : ""}</span>
            {finished ? "" : `By day ${day}: `}
            {delta === 0
              ? `the same as ${usual.label}`
              : `${plural(Math.abs(delta), "pint", "pints")} ${delta > 0 ? "more" : "less"} than ${usual.label}`}
            <span className="text-ink-muted"> ({plural(atDay!, "pint", "pints")})</span>
          </p>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">Your first month: nothing to compare with yet.</p>
        )}
      </section>

      <Section title="Pints by day">
        <PintsCompareChart data={chart} usualLabel={usual?.label ?? null} />
      </Section>

      <Section title="Pubs this month">
        {pubs.length === 0 ? (
          <p className="text-sm text-ink-muted">No beers this month.</p>
        ) : (
          <ul className="-mx-4 -mb-4">
            {pubs.map((p) => {
              const body = (
                <>
                  <span className="flex min-w-0 flex-col">
                    <span className={`truncate ${p.pubId ? "font-medium text-foreground" : "text-ink-muted"}`}>{p.name}</span>
                    <span className="text-xs text-ink-muted">
                      {plural(p.totals.pints, "pint", "pints")} · {plural(p.totals.days, "night", "nights")}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(p.totals.spend)}
                    </span>
                    {p.totals.pricePerPint !== null && (
                      <span className="font-mono text-xs tabular-nums text-ink-muted">
                        {formatCurrency(p.totals.pricePerPint)}/pint
                      </span>
                    )}
                  </span>
                </>
              );
              const row = "flex min-h-14 items-center justify-between gap-3 border-t border-border px-4 py-2";
              return (
                <li key={p.pubId ?? "none"}>
                  {p.pubId ? (
                    <Link href={`/beer/pubs/${p.pubId}`} className={`tap ${row}`}>
                      {body}
                    </Link>
                  ) : (
                    <div className={row}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Disclosure title="By weekday · past year">
        <div className="pb-3">
          <PintsBarChart data={weekdayRows.map((w) => ({ label: w.label, pints: w.pints, detail: plural(w.nights, "night", "nights") }))} />
        </div>
      </Disclosure>

      <Disclosure title="Price per pint">
        <div className="pb-3">
          {prices.length > 1 ? (
            <PriceChart data={prices} />
          ) : (
            <p className="text-sm text-ink-muted">
              {prices.length === 1
                ? `${formatCurrency(prices[0].price)} a pint in ${prices[0].label}. A line shows up from the second month.`
                : "Count pints when you log a beer to see real prices."}
            </p>
          )}
        </div>
      </Disclosure>

      {nights.length > 0 && (
        <Disclosure title="Biggest nights this month">
          <ul className="-mx-4 pb-1">
            {nights.map((n) => (
              <li key={n.date} className="flex min-h-12 items-center justify-between gap-3 border-t border-border px-4 py-2">
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm text-foreground">{formatDate(n.date)}</span>
                  <span className="truncate text-xs text-ink-muted">{n.pubs.join(", ") || "No pub"}</span>
                </span>
                <span className="shrink-0 font-mono text-sm tabular-nums text-foreground">
                  {plural(n.pints, "pint", "pints")} · {formatCurrency(n.spend)}
                </span>
              </li>
            ))}
          </ul>
        </Disclosure>
      )}

      <Disclosure title="Every month">
        <div className="flex flex-col gap-3 pb-3">
          {months.length > 1 && (
            <PintsBarChart
              height={160}
              data={months.map((m) => ({ label: shortMonth.format(toDate(m.month)), pints: m.totals.pints, detail: formatCurrency(m.totals.spend) }))}
            />
          )}
          <ul className="-mx-4">
            {[...months].reverse().map((m) => (
              <li key={m.month}>
                <Link
                  href={href(m.month)}
                  aria-current={m.month === month ? "true" : undefined}
                  className="tap flex min-h-11 items-center justify-between gap-3 border-t border-border px-4 py-2 text-sm"
                >
                  <span className={m.month === month ? "font-medium text-foreground" : "text-foreground"}>
                    {monthTitle.format(toDate(m.month))}
                  </span>
                  <span className="font-mono tabular-nums text-ink-muted">
                    {plural(m.totals.pints, "pint", "pints")} · {formatLiters(m.totals.liters)} · {formatCurrency(m.totals.spend)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Disclosure>
    </div>
  );
}
