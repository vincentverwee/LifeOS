import { connection } from 'next/server';
import { cookies } from 'next/headers';
import { YearlyKmChart } from '@/components/waypoint/stats/YearlyKmChart';
import { CountryBreakdown } from '@/components/waypoint/stats/CountryBreakdown';
import { VanCard } from '@/components/waypoint/stats/VanCard';
import { TripFilter } from '@/components/waypoint/map/TripFilter';
import { Badge } from '@/components/waypoint/ui/badge';
import { getAllTripSummaries, getAllLocations } from '@/lib/data/waypoint';
import { getTripCompanions } from '@/lib/data/people';
import { getTodayKey } from '@/lib/today';
import { countStickers } from '@/lib/data/stickers';
import {
  getCountryStats,
  getDashboardStats,
  getFlightStats,
  getVanCountries,
  getVanStats,
  getVanTime,
  getYearlyStats,
  vanMilestone,
} from '@/lib/waypoint/stats';
import { describeTripFilter, keepTrip, readTripFilter, TRIP_FILTER_COOKIE, tripFilterValue } from '@/lib/waypoint/tripFilter';
import { BarChart3, Plane, Trophy } from 'lucide-react';

export default async function StatsPage({ searchParams }: PageProps<'/waypoint/stats'>) {
  await connection();
  const [params, allTrips, allLocations, companions, todayKey, stickerCount] = await Promise.all([
    searchParams,
    getAllTripSummaries(),
    getAllLocations(),
    getTripCompanions(),
    getTodayKey(),
    countStickers(),
  ]);
  // The breakdown follows the choice shared by every Waypoint page (Van by default); the
  // van card above it is always about the van.
  const anyVan = allTrips.some((t) => t.with_van);
  const saved = (await cookies()).get(TRIP_FILTER_COOKIE)?.value;
  const filter = readTripFilter(params, companions, { anyVan, saved });
  const trips = allTrips.filter((t) => keepTrip(filter, t));
  const shownIds = new Set(trips.map((t) => t.id));
  const locations = allLocations.filter((l) => shownIds.has(l.trip_id));
  const stats = getDashboardStats(trips, locations);
  const flights = getFlightStats(locations);
  const van = getVanStats(allTrips);

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold text-foreground">Statistics</h2>
            <p className="mt-1 text-sm text-muted-foreground">{describeTripFilter(filter, trips.length)}</p>
          </div>
          <TripFilter
            companions={companions}
            value={tripFilterValue(filter)}
            showVan={anyVan}
            basePath="/waypoint/stats"
          />
        </div>

        {van.trips > 0 && (
          <VanCard
            vanKm={van.km}
            vanTrips={van.trips}
            milestone={vanMilestone(van.km)}
            time={getVanTime(allTrips, todayKey)}
            countries={getVanCountries(allTrips, allLocations)}
            stickers={stickerCount}
          />
        )}

        {trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
            <BarChart3 size={48} className="mb-4 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">No stats yet</p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              {allTrips.length === 0 ? 'Add a trip to start seeing your travel stats' : 'No trips match this choice'}
            </p>
          </div>
        ) : (
          <>
            {/* The headline numbers live on the Overview tab; this page is the breakdown. */}
            {(stats.longest_trip_title || flights.flights > 0) && (
              <div className="flex flex-wrap gap-2">
                {stats.longest_trip_title && (
                  <Badge variant="secondary" className="max-w-full gap-1.5 text-xs font-normal">
                    <Trophy size={12} className="shrink-0" />
                    <span className="truncate">Longest trip: {stats.longest_trip_title}</span>
                    <span className="shrink-0">· {stats.longest_trip_km.toLocaleString()} km</span>
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

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <YearlyKmChart data={getYearlyStats(trips)} split={filter.kind === 'all' || filter.kind === 'person'} />
              <CountryBreakdown data={getCountryStats(locations)} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
