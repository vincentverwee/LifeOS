import Link from 'next/link';
import { Trip } from '@/lib/waypoint/types';
import { ImageDown } from 'lucide-react';

interface RecentTripsProps {
  trips: Trip[];
  /** "Recent van trips" while the page shows van trips. */
  title?: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function RecentTrips({ trips, title = 'Recent trips' }: RecentTripsProps) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="section-title">{title}</h2>
      {trips.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-ink-muted">
          No trips here yet.
        </p>
      ) : (
        <ul className="card-list">
          {trips.map((trip) => (
            <li key={trip.id} className="flex items-center gap-2 pr-2">
              {/* The row opens the trip; export stays a separate button. */}
              <Link href={`/waypoint/trips/${trip.id}`} className="tap min-w-0 flex-1 px-4 py-3">
                <p className="truncate font-medium text-foreground">{trip.title}</p>
                {(trip.start_date || trip.total_km) && (
                  <p className="truncate text-sm text-ink-muted">
                    {trip.start_date && formatDate(trip.start_date)}
                    {trip.start_date && trip.total_km ? ' · ' : null}
                    {trip.total_km ? <span className="tabular-nums">{trip.total_km.toLocaleString()} km</span> : null}
                  </p>
                )}
              </Link>
              <Link
                href={`/waypoint/trips/${trip.id}/export`}
                title={`Export ${trip.title} as an image`}
                className="btn btn-ghost inline-flex h-11 w-11 shrink-0 text-ink-muted"
              >
                <ImageDown size={16} aria-hidden="true" />
                <span className="sr-only">Export {trip.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
