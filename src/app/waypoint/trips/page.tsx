import { connection } from 'next/server';
import { TripsList } from '@/components/waypoint/trips/TripsList';
import { getAllTripSummaries } from '@/lib/data/waypoint';

export default async function TripsPage() {
  await connection();
  const trips = await getAllTripSummaries();
  return <TripsList initialTrips={trips} />;
}
