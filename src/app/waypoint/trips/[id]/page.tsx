import { notFound } from 'next/navigation';
import { getTripWithLocations } from '@/lib/data/waypoint';
import { TripDetail } from '@/components/waypoint/trips/TripDetail';

export default async function TripDetailPage({ params }: PageProps<'/waypoint/trips/[id]'>) {
  const { id } = await params;
  const data = await getTripWithLocations(id);
  if (!data) notFound();
  // Keyed so navigating to another trip starts from that trip's data.
  return <TripDetail key={id} initialTrip={data.trip} initialLocations={data.locations} />;
}
