import { connection } from 'next/server';
import { cookies } from 'next/headers';
import { TripsList, type ShownTrips } from '@/components/waypoint/trips/TripsList';
import { getAllTripSummaries } from '@/lib/data/waypoint';
import { getTripCompanions } from '@/lib/data/people';
import { getFirstStickerByTrip } from '@/lib/data/stickers';
import { getTodayKey } from '@/lib/today';
import { readTripFilter, TRIP_FILTER_COOKIE } from '@/lib/waypoint/tripFilter';

export default async function TripsPage({ searchParams }: PageProps<'/waypoint/trips'>) {
  await connection();
  const [params, trips, companions, stickers, todayKey] = await Promise.all([
    searchParams,
    getAllTripSummaries(),
    getTripCompanions(),
    getFirstStickerByTrip(),
    getTodayKey(),
  ]);
  // The same All / Van / Without van / With… choice as every Waypoint page (Van by default).
  const saved = (await cookies()).get(TRIP_FILTER_COOKIE)?.value;
  const filter = readTripFilter(params, companions, { anyVan: trips.some((t) => t.with_van), saved });
  const shownTrips: ShownTrips =
    filter.kind === 'person' ? { ...filter, tripIds: [...filter.tripIds] } : { kind: filter.kind };
  return (
    <TripsList
      // A fresh list per choice, so its client state starts from what the server picked.
      key={filter.kind === 'person' ? `person:${filter.personId}` : filter.kind}
      initialTrips={trips}
      shownTrips={shownTrips}
      companions={companions.map(({ id, name }) => ({ id, name }))}
      stickers={stickers}
      todayKey={todayKey}
    />
  );
}
