import Link from "next/link";
import { getTodayKey } from "@/lib/today";
import { getBeerVisits, getPubs } from "@/lib/data/beer";
import { between, monthStarts, pintsIn, pubStats, totals } from "@/lib/beer/stats";
import { formatCurrency, formatDate, plural } from "@/lib/format";
import { describeSince } from "@/lib/reminders/routines";
import { PubMapLoader } from "@/components/beer/PubMapLoader";
import { LOG_BEER_HREF } from "@/components/beer/nav";

const TOP_PUBS = 5;
const RECENT = 5;

export default async function BeerPage() {
  const todayKey = await getTodayKey();
  const [visits, pubs] = await Promise.all([getBeerVisits(), getPubs()]);

  if (visits.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-foreground">Beer</h1>
        <p className="text-sm text-ink-muted">
          No beers yet. Log one on Add expense with a beer category (a category with a pint price) and pick the pub.
        </p>
        <Link href={LOG_BEER_HREF} className="btn btn-primary inline-flex self-start px-5 py-2.5 text-sm font-semibold">
          Log a beer
        </Link>
      </div>
    );
  }

  const { thisMonth, lastMonth, lastMonthEnd } = monthStarts(todayKey);
  const month = totals(between(visits, thisMonth, todayKey));
  const previous = totals(between(visits, lastMonth, lastMonthEnd));
  const stats = pubStats(pubs, visits).filter((p) => p.visits > 0);
  const mapped = stats.flatMap((p) =>
    p.latitude !== null && p.longitude !== null
      ? [{ id: p.id, name: p.name, latitude: p.latitude, longitude: p.longitude, visits: p.visits }]
      : []
  );
  const recent = visits.slice(-RECENT).reverse();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Beer</h1>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm text-ink-muted">This month</p>
        <p className="mt-1 font-mono text-4xl font-semibold tabular-nums text-foreground">
          {month.pints} <span className="text-lg text-ink-muted">{month.pints === 1 ? "pint" : "pints"}</span>
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {formatCurrency(month.spend)} spent
          {month.pricePerPint !== null && ` · ${formatCurrency(month.pricePerPint)} a pint`}
          {month.days > 0 && ` · ${plural(month.days, "day", "days")} out`}
        </p>
        <p className="mt-3 border-t border-border pt-3 text-sm text-ink-muted">
          Last month: {plural(previous.pints, "pint", "pints")} · {formatCurrency(previous.spend)}
          {previous.pricePerPint !== null && ` · ${formatCurrency(previous.pricePerPint)} a pint`}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <div className="h-56">
          <PubMapLoader pubs={mapped} />
        </div>
        {mapped.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No pubs on the map yet: pick one with Nearby when you log a beer, or open a pub and put it on the map.
          </p>
        ) : (
          <Link href="/beer/map" className="btn btn-ghost -mx-3 inline-flex min-h-11 self-start px-3 text-sm">
            Open the map ›
          </Link>
        )}
      </section>

      {stats.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium text-foreground">Your pubs</h2>
          <ul className="overflow-hidden rounded-xl border border-border bg-surface">
            {stats.slice(0, TOP_PUBS).map((p) => (
              <li key={p.id} className="border-b border-border last:border-b-0">
                <Link href={`/beer/pubs/${p.id}`} className="tap flex min-h-14 items-center justify-between gap-3 px-4 py-2">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-foreground">{p.name}</span>
                    <span className="text-xs text-ink-muted">
                      {plural(p.visits, "visit", "visits")} · {describeSince(p.lastVisit, todayKey).toLowerCase()}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-sm tabular-nums text-ink-muted">
                    {p.pricePerPint !== null ? `${formatCurrency(p.pricePerPint)}/pint` : plural(p.pints, "pint", "pints")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/beer/pubs" className="btn btn-ghost -mx-3 inline-flex min-h-11 self-start px-3 text-sm">
            All pubs ({stats.length}) ›
          </Link>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-medium text-foreground">Latest beers</h2>
        <ul className="overflow-hidden rounded-xl border border-border bg-surface">
          {recent.map((v) => {
            const pints = pintsIn(v);
            return (
              <li key={v.id} className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 py-2 last:border-b-0">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm text-foreground">{v.pubName ?? "No pub"}</span>
                  <span className="text-xs text-ink-muted">
                    {formatDate(v.date)}
                    {pints > 0 && ` · ${plural(pints, "pint", "pints")}${v.counted ? "" : " (guessed)"}`}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(v.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
