import { connection } from 'next/server';
import Link from 'next/link';
import { MapWrapper } from '@/components/waypoint/map/MapWrapper';
import { Button } from '@/components/waypoint/ui/button';
import { getAllLocations, getAllTrips } from '@/lib/data/waypoint';
import { assignTripColors } from '@/lib/waypoint/tripColors';
import { routeLines } from '@/lib/waypoint/routing/lines';
import { ImageDown } from 'lucide-react';

export default async function MapPage() {
  await connection();
  const [locations, trips] = await Promise.all([getAllLocations(), getAllTrips({ simplify: 0.0005 })]);
  const tripLabels = Object.fromEntries(trips.map((t) => [t.id, t.title]));
  const tripColors = assignTripColors(trips);
  const routes = trips.flatMap((t) => routeLines(t.route_geometry).map((geometry) => ({ tripId: t.id, geometry })));

  return (
    <>
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:gap-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Map</h2>
            <p className="mt-1 hidden text-sm text-muted-foreground sm:block">Explore your routes</p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/waypoint/map/export" title="Export the whole map as an image">
              <ImageDown size={15} />
              Export map
            </Link>
          </Button>
        </div>
        <MapWrapper
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
