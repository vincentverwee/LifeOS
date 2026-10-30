import { notFound } from 'next/navigation';
import { getTripWithLocations } from '@/lib/data/waypoint';
import { getGroups, getPeopleNames, getTripPeople } from '@/lib/data/people';
import { TripDetail } from '@/components/waypoint/trips/TripDetail';
import { TripPeople } from '@/components/waypoint/trips/TripPeople';

export default async function TripDetailPage({ params }: PageProps<'/waypoint/trips/[id]'>) {
  const { id } = await params;
  const [data, people, everyone, groups] = await Promise.all([
    getTripWithLocations(id),
    getTripPeople(id),
    getPeopleNames(),
    getGroups(),
  ]);
  if (!data) notFound();
  // Keyed so navigating to another trip starts from that trip's data.
  return (
    <TripDetail
      key={id}
      initialTrip={data.trip}
      initialLocations={data.locations}
      people={<TripPeople tripId={id} people={people} everyone={everyone} groups={groups} />}
    />
  );
}
