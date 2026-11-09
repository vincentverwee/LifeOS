import { notFound } from 'next/navigation';
import { getTripWithLocations } from '@/lib/data/waypoint';
import { TripExport } from '@/components/waypoint/export/TripExport';

export default async function ExportPage({ params }: PageProps<'/waypoint/trips/[id]/export'>) {
  const { id } = await params;
  const data = await getTripWithLocations(id);
  if (!data) notFound();
  // data-waypoint widens the root <main>: room for the controls beside the preview.
  return (
    <div data-waypoint>
      <TripExport trip={data.trip} locations={data.locations} />
    </div>
  );
}
