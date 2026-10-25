import { notFound } from 'next/navigation';
import { getTripWithLocations } from '@/lib/data/waypoint';
import { TripExport } from '@/components/waypoint/export/TripExport';

export default async function ExportPage({ params }: PageProps<'/waypoint/trips/[id]/export'>) {
  const { id } = await params;
  const data = await getTripWithLocations(id);
  if (!data) notFound();
  return <TripExport trip={data.trip} locations={data.locations} />;
}
