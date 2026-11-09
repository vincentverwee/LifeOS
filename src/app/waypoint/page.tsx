import { connection } from 'next/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { StatsGrid } from '@/components/waypoint/dashboard/StatsGrid';
import { RecentTrips } from '@/components/waypoint/dashboard/RecentTrips';
import { MapWrapper } from '@/components/waypoint/map/MapWrapper';
import { TripFilter } from '@/components/waypoint/map/TripFilter';
import { PageHeader } from '@/components/ui/PageHeader';
import { getAllTrips, getAllLocations } from '@/lib/data/waypoint';
import { getTripCompanions } from '@/lib/data/people';
import { getDashboardStats } from '@/lib/waypoint/stats';
import { assignTripColors } from '@/lib/waypoint/tripColors';
import { routeLines } from '@/lib/waypoint/routing/lines';
import {
  describeTripFilter,
  keepTrip,
  readTripFilter,
  TRIP_FILTER_COOKIE,
  tripFilterQuery,
  tripFilterValue,
} from '@/lib/waypoint/tripFilter';
import { ImageDown, Sticker } from 'lucide-react';
import { countStickers } from '@/lib/data/stickers';

export default async function DashboardPage({ searchParams }: PageProps<'/waypoint'>) {
  await connection();
  const [params, allTrips, allLocations, companions, stickerCount] = await Promise.all([
    searchParams,
    getAllTrips({ simplify: 0.0005 }),
    getAllLocations(),
    getTripCompanions(),
    countStickers(),
  ]);
  // Everything follows the choice shared by every Waypoint page (?trip= / ?person=, else
  // the last one picked on this device, else the van trips): van-first.
  const anyVan = allTrips.some((t) => t.with_van);
  const saved = (await cookies()).get(TRIP_FILTER_COOKIE)?.value;
  const filter = readTripFilter(params, companions, { anyVan, saved });
  const trips = allTrips.filter((t) => keepTrip(filter, t));
  const shownIds = new Set(trips.map((t) => t.id));
  const locations = allLocations.filter((l) => shownIds.has(l.trip_id));
  const stats = getDashboardStats(trips, locations);
  const recentTrips = trips.slice(0, 5);
  const tripLabels = Object.fromEntries(trips.map((t) => [t.id, t.title]));
  const tripColors = assignTripColors(trips);
  const routes = trips.flatMap((t) => routeLines(t.route_geometry).map((geometry) => ({ tripId: t.id, geometry })));
  const hasFilter = companions.length > 0 || anyVan;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader section="waypoint"
        title="Waypoint"
        subtitle={`${filter.kind === 'van' ? 'Your van at a glance' : 'Your travels at a glance'} · ${describeTripFilter(filter, trips.length)}`}
        action={
          <Link href="/waypoint/stickers" className="btn btn-outline inline-flex min-h-11 shrink-0 px-4 text-sm">
            <Sticker size={15} aria-hidden="true" />
            Stickers{stickerCount > 0 && <span className="text-ink-muted tabular-nums">{stickerCount}</span>}
          </Link>
        }
      />

      <StatsGrid stats={stats} van={filter.kind === 'van'} />

      <section className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          {hasFilter ? (
            <TripFilter
              companions={companions}
              value={tripFilterValue(filter)}
              showVan={anyVan}
              basePath="/waypoint"
            />
          ) : (
            <h2 className="section-title">All trips</h2>
          )}
          {/* Exports what the map shows as one post. */}
          <Link
            href={`/waypoint/map/export${tripFilterQuery(filter)}`}
            title="Export this map as an image"
            className="btn btn-outline inline-flex min-h-11 shrink-0 px-4 text-sm"
          >
            <ImageDown size={15} aria-hidden="true" />
            Export map
          </Link>
        </div>
        <MapWrapper
          // A fresh map per filter, so it zooms to the trips shown.
          key={tripFilterValue(filter)}
          className="h-[min(400px,60svh)]"
          locations={locations}
          routes={routes}
          tripLabels={tripLabels}
          tripColors={tripColors}
          markerStyle="dot"
          selectable
        />
      </section>

      <RecentTrips trips={recentTrips} title={filter.kind === 'van' ? 'Recent van trips' : undefined} />
    </div>
  );
}
