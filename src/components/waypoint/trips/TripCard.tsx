'use client';

import Link from 'next/link';
import { Caravan, Pencil, Trash2 } from 'lucide-react';
import { TripSummary } from '@/lib/waypoint/types';
import { Badge } from '@/components/waypoint/ui/badge';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { StickerImage } from '@/components/waypoint/StickerImage';

interface TripCardProps {
  trip: TripSummary;
  onEdit: (trip: TripSummary) => void;
  onDelete: (id: string) => void;
  /** Its first sticker, shown in front of the title. */
  sticker?: { photoId: string; cutout: boolean };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Always visible on touch screens (no hover there); revealed on hover/focus with a mouse.
const REVEAL =
  'transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100';

export function TripCard({ trip, onEdit, onDelete, sticker }: TripCardProps) {
  return (
    <li className="group flex items-center gap-1 rounded-2xl border border-border bg-surface pr-2">
      <Link href={`/waypoint/trips/${trip.id}`} className="tap flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-4">
        {sticker && (
          <StickerImage
            photoId={sticker.photoId}
            cutout={sticker.cutout}
            name="Sticker"
            className="h-12 w-12 shrink-0 rounded-xl"
          />
        )}
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-foreground">{trip.title}</h2>
          {trip.description && <p className="truncate text-sm text-ink-muted">{trip.description}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            {trip.start_date && (
              <span>
                {formatDate(trip.start_date)}
                {trip.end_date && ` – ${formatDate(trip.end_date)}`}
              </span>
            )}
            {trip.total_km ? <span className="tabular-nums">{trip.total_km.toLocaleString()} km</span> : null}
            {trip.with_van && (
              <Badge variant="secondary" className="gap-1">
                <Caravan size={12} aria-hidden="true" />
                Van
              </Badge>
            )}
          </div>
        </div>
      </Link>

      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={() => onEdit(trip)}
          aria-label={`Edit ${trip.title}`}
          className={`btn btn-ghost inline-flex h-11 w-11 text-ink-muted ${REVEAL}`}
        >
          <Pencil size={16} aria-hidden="true" />
        </button>
        <ConfirmButton
          quiet
          onConfirm={() => onDelete(trip.id)}
          aria-label={`Delete ${trip.title}`}
          className={`inline-flex h-11 min-w-11 px-3 text-sm ${REVEAL}`}
        >
          <Trash2 size={16} aria-hidden="true" />
        </ConfirmButton>
      </div>
    </li>
  );
}
