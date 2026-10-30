import { connection } from 'next/server';
import { cookies } from 'next/headers';
import { getAllLocations, getAllTrips } from '@/lib/data/waypoint';
import { getTripCompanions } from '@/lib/data/people';
import { keepTrip, readTripFilter, TRIP_FILTER_COOKIE } from '@/lib/waypoint/tripFilter';
import { AllTripsExport } from '@/components/waypoint/export/AllTripsExport';

export default async function AllTripsExportPage({ searchParams }: PageProps<'/waypoint/map/export'>) {
  await connection();
  const params = await searchParams;
  // A finer tolerance than the overview maps: the export is rendered at high resolution.
  const [allTrips, allLocations, companions] = await Promise.all([
    getAllTrips({ simplify: 0.0001 }),
    getAllLocations(),
    params.person ? getTripCompanions() : Promise.resolve([]),
  ]);
  // Same ?trip= / ?person= filter (and fallbacks) as the map it was opened from.
  const saved = (await cookies()).get(TRIP_FILTER_COOKIE)?.value;
  const filter = readTripFilter(params, companions, { anyVan: allTrips.some((t) => t.with_van), saved });
  const trips = allTrips.filter((t) => keepTrip(filter, t));
  const shownIds = new Set(trips.map((t) => t.id));
  return <AllTripsExport trips={trips} locations={allLocations.filter((l) => shownIds.has(l.trip_id))} />;
}
