import { connection } from 'next/server';
import Link from 'next/link';
import { StatsGrid } from '@/components/waypoint/dashboard/StatsGrid';
import { RecentTrips } from '@/components/waypoint/dashboard/RecentTrips';
import { MapWrapper } from '@/components/waypoint/map/MapWrapper';
import { Button } from '@/components/waypoint/ui/button';
import { getAllTrips, getAllLocations } from '@/lib/data/waypoint';
import { getDashboardStats } from '@/lib/waypoint/stats';
import { assignTripColors } from '@/lib/waypoint/tripColors';
import { routeLines } from '@/lib/waypoint/routing/lines';
import { ImageDown } from 'lucide-react';

export default async function DashboardPage() {
  await connection();
  const [trips, locations] = await Promise.all([getAllTrips({ simplify: 0.0005 }), getAllLocations()]);
  const stats = getDashboardStats(trips, locations);
  // The map draws every trip; only the list beside it is capped to the latest 5.
  const recentTrips = trips.slice(0, 5);
  const tripLabels = Object.fromEntries(trips.map((t) => [t.id, t.title]));
  const tripColors = assignTripColors(trips);
  const routes = trips.flatMap((t) => routeLines(t.route_geometry).map((geometry) => ({ tripId: t.id, geometry })));

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
              <p className="text-sm font-medium text-muted-foreground">All trips</p>
              {/* Exports the whole map (every trip) as one post. */}
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href="/waypoint/map/export" title="Export the whole map as an image">
                  <ImageDown size={15} />
                  Export map
                </Link>
              </Button>
            </div>
            <MapWrapper
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
