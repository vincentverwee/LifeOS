import { connection } from 'next/server';
import { YearlyKmChart } from '@/components/waypoint/stats/YearlyKmChart';
import { CountryBreakdown } from '@/components/waypoint/stats/CountryBreakdown';
import { Badge } from '@/components/waypoint/ui/badge';
import { getAllTripSummaries, getAllLocations } from '@/lib/data/waypoint';
import { getDashboardStats } from '@/lib/waypoint/stats';
import { getYearlyStats, getCountryStats, getFlightStats, getVanStats } from '@/lib/waypoint/stats';
import { BarChart3, Caravan, Plane, Trophy } from 'lucide-react';

export default async function StatsPage() {
  await connection();
  const [trips, locations] = await Promise.all([getAllTripSummaries(), getAllLocations()]);
  const stats = getDashboardStats(trips, locations);
  const flights = getFlightStats(locations);
  const van = getVanStats(trips);

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Statistics</h2>
          <p className="mt-1 text-sm text-muted-foreground">Kilometres per year and the countries you stopped in</p>
        </div>

        {trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
            <BarChart3 size={48} className="mb-4 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">No stats yet</p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Add a trip to start seeing your travel stats
            </p>
          </div>
        ) : (
          <>
            {/* The headline numbers live on the Overview tab; this page is the breakdown. */}
            {(stats.longest_trip_title || flights.flights > 0 || van.trips > 0) && (
              <div className="flex flex-wrap gap-2">
                {stats.longest_trip_title && (
                  <Badge variant="secondary" className="max-w-full gap-1.5 text-xs font-normal">
                    <Trophy size={12} className="shrink-0" />
                    <span className="truncate">Longest trip: {stats.longest_trip_title}</span>
                    <span className="shrink-0">· {stats.longest_trip_km.toLocaleString()} km</span>
                  </Badge>
                )}
                {van.trips > 0 && (
                  <Badge variant="secondary" className="gap-1.5 text-xs font-normal">
                    <Caravan size={12} className="shrink-0" />
                    Van: {van.km.toLocaleString()} km
                    <span className="shrink-0">
                      · {van.trips} {van.trips === 1 ? 'trip' : 'trips'}
                    </span>
                  </Badge>
                )}
                {/* Flights stay out of the km-per-year chart, which is km driven. */}
                {flights.flights > 0 && (
                  <Badge variant="secondary" className="gap-1.5 text-xs font-normal">
                    <Plane size={12} className="shrink-0" />
                    Flown: {flights.km.toLocaleString()} km
                    <span className="shrink-0">
                      · {flights.flights} {flights.flights === 1 ? 'flight' : 'flights'}
                    </span>
                  </Badge>
                )}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <YearlyKmChart data={getYearlyStats(trips)} />
              <CountryBreakdown data={getCountryStats(locations)} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
