import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { getTodayKey } from "@/lib/today";
import { getBeerVisits, getPubOptions, getPubs } from "@/lib/data/beer";
import { getAllCategories, getLatestBeers } from "@/lib/data";
import { between, monthStarts, pubStats, totals } from "@/lib/beer/stats";
import { formatCurrency, formatLiters, plural } from "@/lib/format";
import { LatestBeers } from "@/components/beer/LatestBeers";
import { describeSince } from "@/lib/reminders/routines";
import { PubMapLoader } from "@/components/beer/PubMapLoader";
import { LOG_BEER_HREF } from "@/components/beer/nav";

const TOP_PUBS = 5;
const RECENT = 5;

export default async function BeerPage() {
  const todayKey = await getTodayKey();
  const [visits, pubs, latest, categories, pubOptions] = await Promise.all([
    getBeerVisits(),
    getPubs(),
    getLatestBeers(RECENT),
    getAllCategories(),
    getPubOptions(),
  ]);

  if (visits.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader section="beer" title="Beer" />
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-6 text-center text-ink-muted">
          <p>No beers yet. Log one on Add expense with a beer category (a category with a pint price) and pick the pub.</p>
          <Link href={LOG_BEER_HREF} className="btn btn-primary inline-flex min-h-11 px-5 text-sm font-semibold">
            Log a beer
          </Link>
        </div>
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader section="beer" title="Beer" />

      <section className="card p-5">
        <p className="text-sm text-ink-muted">This month</p>
        <p className="mt-1 font-mono text-4xl font-semibold tabular-nums text-foreground">
          {month.pints} <span className="text-lg text-ink-muted">{month.pints === 1 ? "pint" : "pints"}</span>
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {formatLiters(month.liters)} · {formatCurrency(month.spend)} spent
          {month.pricePerPint !== null && ` · ${formatCurrency(month.pricePerPint)} a pint`}
          {month.days > 0 && ` · ${plural(month.days, "day", "days")} out`}
        </p>
        <p className="mt-3 border-t border-border pt-3 text-sm text-ink-muted">
          Last month: {plural(previous.pints, "pint", "pints")} · {formatLiters(previous.liters)} · {formatCurrency(previous.spend)}
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
          <h2 className="section-title">Your pubs</h2>
          <ul className="card-list">
            {stats.slice(0, TOP_PUBS).map((p) => (
              <li key={p.id}>
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
        <h2 className="section-title">Latest beers</h2>
        <LatestBeers
          beers={latest}
          categories={categories.map(({ id, name, isArchived, pintPrice }) => ({ id, name, isArchived, pintPrice }))}
          pubs={pubOptions}
        />
      </section>
    </div>
  );
}
