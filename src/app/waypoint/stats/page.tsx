import { connection } from 'next/server';
import { cookies } from 'next/headers';
import { YearlyKmChart } from '@/components/waypoint/stats/YearlyKmChart';
import { CountryBreakdown } from '@/components/waypoint/stats/CountryBreakdown';
import { VanCard } from '@/components/waypoint/stats/VanCard';
import { TripFilter } from '@/components/waypoint/map/TripFilter';
import { PageHeader } from '@/components/ui/PageHeader';
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

export default async function StatsPage({ searchParams }: PageProps<'/waypoint/stats'>) {
  await connection();
  const [params, allTrips, allLocations, companions, todayKey, stickerCount] = await Promise.all([
    searchParams,
    getAllTripSummaries(),
    getAllLocations(),
    getTripCompanions(),
    getTodayKey(),
    countStickers({ vanOnly: true }),
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
  const van = getVanStats(allTrips, todayKey);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Stats"
        subtitle={describeTripFilter(filter, trips.length)}
        back={{ href: '/waypoint', label: 'Waypoint' }}
      />

      {van.trips > 0 && (
        <VanCard
          vanKm={van.km}
          vanTrips={van.trips}
          milestone={vanMilestone(van.km)}
          time={getVanTime(allTrips, todayKey)}
          countries={getVanCountries(allTrips, allLocations, todayKey)}
          stickers={stickerCount}
        />
      )}

      <div>
        <TripFilter
          companions={companions}
          value={tripFilterValue(filter)}
          showVan={anyVan}
          basePath="/waypoint/stats"
        />
      </div>

      {trips.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-ink-muted">
          {allTrips.length === 0 ? 'Add a trip to start seeing your travel stats.' : 'No trips match this choice.'}
        </p>
      ) : (
        <>
          {/* The headline numbers live on the Overview tab; this page is the breakdown. */}
          {(stats.longest_trip_title || flights.flights > 0) && (
            <ul className="flex flex-col gap-1 text-sm text-ink-muted">
              {stats.longest_trip_title && (
                <li className="truncate">
                  Longest trip: <span className="text-foreground">{stats.longest_trip_title}</span> ·{' '}
                  <span className="tabular-nums">{stats.longest_trip_km.toLocaleString()} km</span>
                </li>
              )}
              {/* Flights stay out of the km-per-year chart, which is km driven. */}
              {flights.flights > 0 && (
                <li>
                  Flown: <span className="tabular-nums text-foreground">{flights.km.toLocaleString()} km</span> ·{' '}
                  {flights.flights} {flights.flights === 1 ? 'flight' : 'flights'}
                </li>
              )}
            </ul>
          )}

          <YearlyKmChart data={getYearlyStats(trips)} split={filter.kind === 'all' || filter.kind === 'person'} />
          <CountryBreakdown data={getCountryStats(locations)} />
        </>
      )}
    </div>
  );
}
