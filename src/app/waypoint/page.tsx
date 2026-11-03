import { connection } from 'next/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { StatsGrid } from '@/components/waypoint/dashboard/StatsGrid';
import { RecentTrips } from '@/components/waypoint/dashboard/RecentTrips';
import { MapWrapper } from '@/components/waypoint/map/MapWrapper';
import { TripFilter } from '@/components/waypoint/map/TripFilter';
import { Button } from '@/components/waypoint/ui/button';
import { getAllTrips, getAllLocations } from '@/lib/data/waypoint';
import { getTripCompanions } from '@/lib/data/people';
import { getDashboardStats } from '@/lib/waypoint/stats';
import { assignTripColors } from '@/lib/waypoint/tripColors';
import { routeLines } from '@/lib/waypoint/routing/lines';
import {
  keepTrip,
  readTripFilter,
  TRIP_FILTER_COOKIE,
  tripFilterQuery,
  tripFilterValue,
} from '@/lib/waypoint/tripFilter';
import { ImageDown } from 'lucide-react';

export default async function DashboardPage({ searchParams }: PageProps<'/waypoint'>) {
  await connection();
  const [params, allTrips, allLocations, companions] = await Promise.all([
    searchParams,
    getAllTrips({ simplify: 0.0005 }),
    getAllLocations(),
    getTripCompanions(),
  ]);
  // Stats and the recent list are about every trip; the map follows the same choice as the
  // Map tab (?trip= / ?person=, else the last one picked here, else the van trips).
  const stats = getDashboardStats(allTrips, allLocations);
  const recentTrips = allTrips.slice(0, 5);
  const anyVan = allTrips.some((t) => t.with_van);
  const saved = (await cookies()).get(TRIP_FILTER_COOKIE)?.value;
  const filter = readTripFilter(params, companions, { anyVan, saved });
  const trips = allTrips.filter((t) => keepTrip(filter, t));
  const shownIds = new Set(trips.map((t) => t.id));
  const locations = allLocations.filter((l) => shownIds.has(l.trip_id));
  const tripLabels = Object.fromEntries(trips.map((t) => [t.id, t.title]));
  const tripColors = assignTripColors(trips);
  const routes = trips.flatMap((t) => routeLines(t.route_geometry).map((geometry) => ({ tripId: t.id, geometry })));
  const hasFilter = companions.length > 0 || anyVan;

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your travel journey at a glance</p>
        </div>

        <StatsGrid stats={stats} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              {hasFilter ? (
                <TripFilter
                  companions={companions}
                  value={tripFilterValue(filter)}
                  showVan={anyVan}
                  basePath="/waypoint"
                />
              ) : (
                <p className="text-sm font-medium text-muted-foreground">All trips</p>
              )}
              {/* Exports what the map shows as one post. */}
              <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
                <Link href={`/waypoint/map/export${tripFilterQuery(filter)}`} title="Export this map as an image">
                  <ImageDown size={15} />
                  Export map
                </Link>
              </Button>
            </div>
            <MapWrapper
              // A fresh map per filter, so it zooms to the trips shown.
              key={tripFilterValue(filter)}
              className="h-[min(400px,60svh)] lg:h-[500px]"
              locations={locations}
              routes={routes}
              tripLabels={tripLabels}
              tripColors={tripColors}
              markerStyle="dot"
              selectable
            />
          </div>
          <RecentTrips trips={recentTrips} />
        </div>
      </div>
    </>
  );
}
