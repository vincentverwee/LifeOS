import { connection } from 'next/server';
import Link from 'next/link';
import { MapWrapper } from '@/components/waypoint/map/MapWrapper';
import { PersonFilter } from '@/components/waypoint/map/PersonFilter';
import { Button } from '@/components/waypoint/ui/button';
import { getAllLocations, getAllTrips } from '@/lib/data/waypoint';
import { getTripCompanions } from '@/lib/data/people';
import { assignTripColors } from '@/lib/waypoint/tripColors';
import { routeLines } from '@/lib/waypoint/routing/lines';
import { ImageDown } from 'lucide-react';

export default async function MapPage({ searchParams }: PageProps<'/waypoint/map'>) {
  await connection();
  const { person } = await searchParams;
  const [allLocations, allTrips, companions] = await Promise.all([
    getAllLocations(),
    getAllTrips({ simplify: 0.0005 }),
    getTripCompanions(),
  ]);
  // ?person= narrows everything to the trips they came on (an unknown id shows all).
  const companion = companions.find((c) => c.id === person) ?? null;
  const only = companion ? new Set(companion.tripIds) : null;
  const trips = only ? allTrips.filter((t) => only.has(t.id)) : allTrips;
  const locations = only ? allLocations.filter((l) => only.has(l.trip_id)) : allLocations;
  const tripLabels = Object.fromEntries(trips.map((t) => [t.id, t.title]));
  const tripColors = assignTripColors(trips);
  const routes = trips.flatMap((t) => routeLines(t.route_geometry).map((geometry) => ({ tripId: t.id, geometry })));
  const query = companion ? `?person=${encodeURIComponent(companion.id)}` : '';

  return (
    <>
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:gap-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Map</h2>
            <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
              {companion ? `${trips.length} ${trips.length === 1 ? 'trip' : 'trips'} with ${companion.name}` : 'Explore your routes'}
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <PersonFilter companions={companions} selected={companion?.id ?? null} basePath="/waypoint/map" />
            {/* Icon-only on phones when the dropdown needs the room. */}
            <Button asChild variant="outline" size="sm" className={`shrink-0 gap-1.5 ${companions.length ? 'w-11 px-0 sm:w-auto sm:px-3' : ''}`}>
              <Link href={`/waypoint/map/export${query}`} title="Export this map as an image" aria-label="Export map">
                <ImageDown size={15} />
                <span className={companions.length ? 'hidden sm:inline' : undefined}>Export map</span>
              </Link>
            </Button>
          </div>
        </div>
        <MapWrapper
          // A fresh map per filter, so it zooms to the trips shown.
          key={companion?.id ?? 'all'}
          // Phones: exactly the space between the header and the tab bar, so the page itself
          // doesn't scroll and every swipe goes to the map.
          className="h-[calc(100svh-14rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-[360px] sm:h-[70dvh] sm:min-h-[420px]"
          cooperativeGestures={false}
          locations={locations}
          routes={routes}
          tripLabels={tripLabels}
          tripColors={tripColors}
          selectable
        />
      </div>
    </>
  );
}
