import { connection } from 'next/server';
import { getAllLocations, getAllTrips } from '@/lib/data/waypoint';
import { getTripCompanions } from '@/lib/data/people';
import { AllTripsExport } from '@/components/waypoint/export/AllTripsExport';

export default async function AllTripsExportPage({ searchParams }: PageProps<'/waypoint/map/export'>) {
  await connection();
  const { person } = await searchParams;
  // A finer tolerance than the overview maps: the export is rendered at high resolution.
  const [trips, locations, companions] = await Promise.all([
    getAllTrips({ simplify: 0.0001 }),
    getAllLocations(),
    person ? getTripCompanions() : Promise.resolve([]),
  ]);
  // Same ?person= filter as the map it was opened from.
  const only = new Set(companions.find((c) => c.id === person)?.tripIds ?? []);
  if (only.size === 0) return <AllTripsExport trips={trips} locations={locations} />;
  return (
    <AllTripsExport trips={trips.filter((t) => only.has(t.id))} locations={locations.filter((l) => only.has(l.trip_id))} />
  );
}
