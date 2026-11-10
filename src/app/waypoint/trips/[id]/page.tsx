import { notFound } from 'next/navigation';
import { getBudgetTripBrief, getTripWithLocations } from '@/lib/data/waypoint';
import { getTodayKey } from '@/lib/today';
import { isUuid } from '@/lib/waypoint/uuid';
import { getGroups, getPeopleNames, getTripPeople } from '@/lib/data/people';
import { TripDetail } from '@/components/waypoint/trips/TripDetail';
import { TripPeople } from '@/components/waypoint/trips/TripPeople';
import { getTripStickers } from '@/lib/data/stickers';

export default async function TripDetailPage({ params }: PageProps<'/waypoint/trips/[id]'>) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [data, people, everyone, groups, stickers, todayKey] = await Promise.all([
    getTripWithLocations(id),
    getTripPeople(id),
    getPeopleNames(),
    getGroups(),
    getTripStickers(id),
    getTodayKey(),
  ]);
  if (!data) notFound();
  const budgetTrip = await getBudgetTripBrief(data.trip.budget_trip_id);
  // Keyed so navigating to another trip starts from that trip's data.
  // data-waypoint widens the root <main>: the stops and the route map sit side by side on desktop.
  return (
    <div data-waypoint>
      <TripDetail
        key={id}
        initialTrip={data.trip}
        initialLocations={data.locations}
        people={<TripPeople tripId={id} people={people} everyone={everyone} groups={groups} />}
        stickers={stickers}
        todayKey={todayKey}
        budgetTrip={budgetTrip}
      />
    </div>
  );
}
