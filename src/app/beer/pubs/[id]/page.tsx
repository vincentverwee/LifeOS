import Link from "next/link";
import { notFound } from "next/navigation";
import { getTodayKey } from "@/lib/today";
import { getBeerVisits, getPub, getPubs } from "@/lib/data/beer";
import { pintsIn, pricesByMonth, pubStats } from "@/lib/beer/stats";
import { formatCurrency, formatDate } from "@/lib/format";
import { describeSince } from "@/lib/reminders/routines";
import { Disclosure } from "@/components/Disclosure";
import { PubMapLoader } from "@/components/beer/PubMapLoader";
import { PubEditor } from "@/components/beer/PubEditor";
import { PriceChart } from "@/components/beer/BeerCharts";

const RECENT = 8;

const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });

export default async function PubPage(props: PageProps<"/beer/pubs/[id]">) {
  const { id } = await props.params;
  const [todayKey, pub, visits, pubs] = await Promise.all([getTodayKey(), getPub(id), getBeerVisits({ pubId: id }), getPubs()]);
  if (!pub) notFound();

  const [stats] = pubStats([pub], visits);
  const prices = pricesByMonth(visits);
  const latestFirst = [...visits].reverse();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/beer/pubs" className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Pubs
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">{pub.name}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {stats.lastVisit ? `Last visit ${describeSince(stats.lastVisit, todayKey).toLowerCase()}` : "No beers here yet"}
          {stats.firstVisit && ` · first ${formatDate(stats.firstVisit)}`}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        {[
          ["Visits", String(stats.visits)],
          ["Pints", String(stats.pints)],
          ["Spent", formatCurrency(stats.spend)],
          ["A pint", stats.pricePerPint !== null ? formatCurrency(stats.pricePerPint) : "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-surface p-4">
            <dt className="text-sm text-ink-muted">{label}</dt>
            <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      {pub.latitude !== null && pub.longitude !== null && (
        <div className="h-48">
          <PubMapLoader
            pubs={[{ id: pub.id, name: pub.name, latitude: pub.latitude, longitude: pub.longitude, visits: stats.visits }]}
          />
        </div>
      )}

      {prices.length > 1 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium text-foreground">Price per pint</h2>
          <div className="rounded-xl border border-border bg-surface p-4">
            <PriceChart
              data={prices.map((m) => ({
                label: monthFormatter.format(new Date(`${m.month}-01T00:00:00Z`)),
                price: Math.round(m.pricePerPint * 100) / 100,
                pints: m.pints,
              }))}
            />
          </div>
        </section>
      )}

      {latestFirst.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium text-foreground">Visits</h2>
          <VisitList visits={latestFirst.slice(0, RECENT)} />
          {latestFirst.length > RECENT && (
            <Disclosure title={`Show all ${latestFirst.length}`}>
              <div className="pb-3">
                <VisitList visits={latestFirst.slice(RECENT)} />
              </div>
            </Disclosure>
          )}
        </section>
      )}

      <PubEditor
        pub={{
          id: pub.id,
          name: pub.name,
          position: pub.latitude !== null && pub.longitude !== null ? { latitude: pub.latitude, longitude: pub.longitude } : null,
        }}
        others={pubs.filter((p) => p.id !== pub.id).map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}

function VisitList({ visits }: { visits: Awaited<ReturnType<typeof getBeerVisits>> }) {
  return (
    <ul className="overflow-hidden rounded-xl border border-border bg-surface">
      {visits.map((v) => {
        const pints = pintsIn(v);
        return (
          <li key={v.id} className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 py-2 last:border-b-0">
            <span className="flex min-w-0 flex-col">
              <span className="text-sm text-foreground">{formatDate(v.date)}</span>
              <span className="truncate text-xs text-ink-muted">
                {pints > 0 ? `${pints} ${pints === 1 ? "pint" : "pints"}${v.counted ? "" : " (guessed)"}` : "Food"}
                {v.note && ` · ${v.note}`}
              </span>
            </span>
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-foreground">{formatCurrency(v.amount)}</span>
          </li>
        );
      })}
    </ul>
  );
}
