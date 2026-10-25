import Link from 'next/link';
import { Trip } from '@/lib/waypoint/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/waypoint/ui/card';
import { Badge } from '@/components/waypoint/ui/badge';
import { Button } from '@/components/waypoint/ui/button';
import { CalendarDays, Navigation, ImageDown } from 'lucide-react';

interface RecentTripsProps {
  trips: Trip[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function RecentTrips({ trips }: RecentTripsProps) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Recent Trips</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {trips.map((trip, i) => (
          // CSS keyframes rather than Framer Motion. The old timing also waited 300ms before
          // the first row even started (then +70ms per row), so the list took ~0.9s to settle;
          // now it starts immediately and staggers 30ms.
          <div
            key={trip.id}
            className="animate-slide-in flex items-center justify-between rounded-xl bg-muted/50 pr-3 transition-colors hover:bg-muted"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            {/* The row opens the trip; export stays a separate button. */}
            <Link href={`/waypoint/trips/${trip.id}`} className="tap min-w-0 flex-1 space-y-1 rounded-xl p-4">
              <p className="truncate text-sm font-medium">{trip.title}</p>
              {trip.start_date && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays size={12} />
                  {formatDate(trip.start_date)}
                </p>
              )}
            </Link>
            <div className="ml-3 flex shrink-0 items-center gap-2">
              {trip.total_km && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Navigation size={10} />
                  {trip.total_km.toLocaleString()} km
                </Badge>
              )}
              <Button asChild variant="outline" size="icon">
                <Link href={`/waypoint/trips/${trip.id}/export`} title={`Export ${trip.title} as an image`}>
                  <ImageDown size={15} />
                  <span className="sr-only">Export {trip.title}</span>
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
