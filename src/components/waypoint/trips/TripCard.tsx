'use client';

import { TripSummary } from '@/lib/waypoint/types';
import { Card, CardContent } from '@/components/waypoint/ui/card';
import { Badge } from '@/components/waypoint/ui/badge';
import { Button } from '@/components/waypoint/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/waypoint/ui/alert-dialog';
import { CalendarDays, Navigation, Pencil, Trash2, MapPin, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface TripCardProps {
  trip: TripSummary;
  index: number;
  onEdit: (trip: TripSummary) => void;
  onDelete: (id: string) => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function TripCard({ trip, index, onEdit, onDelete }: TripCardProps) {
  return (
    // CSS keyframes rather than Framer Motion, and the stagger is capped: with a long trip list
    // the old `index * 60ms` meant the last cards took seconds to appear.
    <div className="animate-rise" style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
      <Card className="group border-border/50 transition-shadow hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <Link href={`/waypoint/trips/${trip.id}`} className="min-w-0 flex-1">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-primary/10 p-2 shrink-0">
                  <MapPin size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold group-hover:text-primary transition-colors">
                    {trip.title}
                  </h3>
                  {trip.description && (
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {trip.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {trip.start_date && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays size={11} />
                        {formatDate(trip.start_date)}
                        {trip.end_date && ` – ${formatDate(trip.end_date)}`}
                      </span>
                    )}
                    {trip.total_km && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Navigation size={10} />
                        {trip.total_km.toLocaleString()} km
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                // Always visible on touch screens (no hover there); revealed on hover with a mouse.
                className="transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => onEdit(trip)}
              >
                <Pencil size={14} />
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive transition-opacity hover:text-destructive [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Trash2 size={14} />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete trip?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete <strong>{trip.title}</strong> and all its
                      locations. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      destructive
                      onClick={() => onDelete(trip.id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button asChild variant="ghost" size="icon">
                <Link href={`/waypoint/trips/${trip.id}`}>
                  <ChevronRight size={16} />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
