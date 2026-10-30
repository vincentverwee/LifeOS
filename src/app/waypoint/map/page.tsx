import { connection } from 'next/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { MapWrapper } from '@/components/waypoint/map/MapWrapper';
import { TripFilter } from '@/components/waypoint/map/TripFilter';
import { Button } from '@/components/waypoint/ui/button';
import { getAllLocations, getAllTrips } from '@/lib/data/waypoint';
import { getTripCompanions } from '@/lib/data/people';
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

export default async function MapPage({ searchParams }: PageProps<'/waypoint/map'>) {
  await connection();
  const [params, allLocations, allTrips, companions] = await Promise.all([
    searchParams,
    getAllLocations(),
    getAllTrips({ simplify: 0.0005 }),
    getTripCompanions(),
  ]);
  // ?trip=all|van|novan or ?person= narrows everything to those trips; with no choice the
  // map opens on the last one picked here, else on the van trips (when there are any).
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
  const count = `${trips.length} ${trips.length === 1 ? 'trip' : 'trips'}`;
  const subtitle =
    filter.kind === 'person'
      ? `${count} with ${filter.name}`
      : filter.kind === 'van'
        ? `${count} in the van`
        : filter.kind === 'novan'
          ? `${count} without the van`
          : 'Explore your routes';

  return (
    <>
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:gap-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Map</h2>
            <p className="mt-1 hidden text-sm text-muted-foreground sm:block">{subtitle}</p>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <TripFilter
              companions={companions}
              value={tripFilterValue(filter)}
              showVan={anyVan}
              basePath="/waypoint/map"
            />
            {/* Icon-only on phones when the dropdown needs the room. */}
            <Button asChild variant="outline" size="sm" className={`shrink-0 gap-1.5 ${hasFilter ? 'w-11 px-0 sm:w-auto sm:px-3' : ''}`}>
              <Link href={`/waypoint/map/export${tripFilterQuery(filter)}`} title="Export this map as an image" aria-label="Export map">
                <ImageDown size={15} />
                <span className={hasFilter ? 'hidden sm:inline' : undefined}>Export map</span>
              </Link>
            </Button>
          </div>
        </div>
        <MapWrapper
          // A fresh map per filter, so it zooms to the trips shown.
          key={tripFilterValue(filter)}
          // Phones: exactly the space between the header and the tab bar, so the page itself
          // doesn't scroll and every swipe goes to the map.
          className="h-[calc(100svh-14rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-[360px] sm:h-[70dvh] sm:min-h-[420px]"
          cooperativeGestures={false}
          locations={locations}
          routes={routes}
          tripLabels={tripLabels}
          tripColors={tripColors}
          // Small trip-coloured dots, like the dashboard: numbered pins for every stop of every
          // trip buried the routes. Numbers stay on a single trip's page.
          markerStyle="dot"
          selectable
        />
      </div>
    </>
  );
}
