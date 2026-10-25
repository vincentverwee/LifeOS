import { connection } from 'next/server';
import { getAllLocations, getAllTrips } from '@/lib/data/waypoint';
import { AllTripsExport } from '@/components/waypoint/export/AllTripsExport';

export default async function AllTripsExportPage() {
  await connection();
  // A finer tolerance than the overview maps: the export is rendered at high resolution.
  const [trips, locations] = await Promise.all([getAllTrips({ simplify: 0.0001 }), getAllLocations()]);
  return <AllTripsExport trips={trips} locations={locations} />;
}
