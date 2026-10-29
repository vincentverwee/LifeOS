import Link from "next/link";
import { getTodayKey } from "@/lib/today";
import { getBeerVisits, getPubs } from "@/lib/data/beer";
import { pubStats, type PubStats } from "@/lib/beer/stats";
import { formatCurrency } from "@/lib/format";
import { describeSince } from "@/lib/reminders/routines";

const SORTS = {
  visits: { label: "Most visited", compare: (a: PubStats, b: PubStats) => b.visits - a.visits },
  recent: {
    label: "Latest",
    compare: (a: PubStats, b: PubStats) => (b.lastVisit ?? "").localeCompare(a.lastVisit ?? ""),
  },
  // Pubs without a counted price go last.
  price: {
    label: "Cheapest pint",
    compare: (a: PubStats, b: PubStats) => (a.pricePerPint ?? Infinity) - (b.pricePerPint ?? Infinity),
  },
} as const;
type Sort = keyof typeof SORTS;

export default async function PubsPage(props: PageProps<"/beer/pubs">) {
  const { sort: requested } = await props.searchParams;
  const sort: Sort = typeof requested === "string" && requested in SORTS ? (requested as Sort) : "visits";
  const [todayKey, visits, pubs] = await Promise.all([getTodayKey(), getBeerVisits(), getPubs()]);
  const stats = pubStats(pubs, visits).sort((a, b) => SORTS[sort].compare(a, b) || a.name.localeCompare(b.name));
  const untagged = visits.filter((v) => !v.pubId).length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Pubs</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {stats.length} {stats.length === 1 ? "pub" : "pubs"}
          {untagged > 0 && ` · ${untagged} ${untagged === 1 ? "beer" : "beers"} without a pub`}
        </p>
      </div>

      <div className="flex gap-1 rounded-full bg-surface-muted p-1" role="group" aria-label="Sort">
        {(Object.keys(SORTS) as Sort[]).map((key) => (
          <Link
            key={key}
            href={key === "visits" ? "/beer/pubs" : `/beer/pubs?sort=${key}`}
            aria-current={sort === key ? "true" : undefined}
            className={`btn flex min-h-11 flex-1 px-2 text-sm ${
              sort === key ? "bg-surface text-foreground shadow-sm" : "text-ink-muted hover:text-foreground"
            }`}
          >
            {SORTS[key].label}
          </Link>
        ))}
      </div>

      {stats.length === 0 ? (
        <p className="text-sm text-ink-muted">No pubs yet. Pick one when you log a beer.</p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border bg-surface">
          {stats.map((p) => (
            <li key={p.id} className="border-b border-border last:border-b-0">
              <Link href={`/beer/pubs/${p.id}`} className="tap flex min-h-14 items-center justify-between gap-3 px-4 py-2">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-foreground">{p.name}</span>
                  <span className="text-xs text-ink-muted">
                    {p.visits} {p.visits === 1 ? "visit" : "visits"} · {p.pints} {p.pints === 1 ? "pint" : "pints"} ·{" "}
                    {describeSince(p.lastVisit, todayKey).toLowerCase()}
                    {p.latitude === null && " · not on the map"}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-sm tabular-nums text-ink-muted">
                  {p.pricePerPint !== null ? `${formatCurrency(p.pricePerPint)}/pint` : "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
