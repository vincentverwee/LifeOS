import Link from "next/link";
import { connection } from "next/server";
import { getBeerVisits, getPubs } from "@/lib/data/beer";
import { pubStats } from "@/lib/beer/stats";
import { PubMapLoader } from "@/components/beer/PubMapLoader";

export default async function BeerMapPage() {
  await connection();
  const [visits, pubs] = await Promise.all([getBeerVisits(), getPubs()]);
  const stats = pubStats(pubs, visits);
  const mapped = stats.flatMap((p) =>
    p.latitude !== null && p.longitude !== null
      ? [{ id: p.id, name: p.name, latitude: p.latitude, longitude: p.longitude, visits: p.visits }]
      : []
  );
  const missing = stats.length - mapped.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Map</h1>
        {missing > 0 && (
          <Link href="/beer/pubs" className="text-sm text-ink-muted underline-offset-2 hover:underline">
            {missing} not on the map
          </Link>
        )}
      </div>
      {mapped.length === 0 && (
        <p className="text-sm text-ink-muted">
          No pubs on the map yet. Pick one with Nearby when you log a beer, or open a pub and put it on the map.
        </p>
      )}
      {/* Full height between the header and the tab bar; one finger pans here (no page to scroll). */}
      <div className="h-[calc(100dvh-15rem-env(safe-area-inset-bottom))] min-h-80 sm:h-[36rem]">
        <PubMapLoader pubs={mapped} cooperativeGestures={false} />
      </div>
    </div>
  );
}
