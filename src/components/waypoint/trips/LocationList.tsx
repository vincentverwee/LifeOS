'use client';

import { useState } from 'react';
import { Location } from '@/lib/waypoint/types';
import { Button } from '@/components/waypoint/ui/button';
import { Input } from '@/components/waypoint/ui/input';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { StickerImage } from '@/components/waypoint/StickerImage';
import { Trash2, ChevronUp, ChevronDown, CalendarDays, Car, Plane } from 'lucide-react';

interface LocationListProps {
  locations: Location[];
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  /** Switches the leg arriving at this stop between driven and flown. */
  onToggleLeg: (id: string) => void;
  onUpdateDates: (id: string, arrival: string, departure: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  /** While a reorder/removal is saving: blocks the next one so they can't cross. */
  disabled?: boolean;
  /** Stop id -> the stickers bought there (shown small next to its name; there can be several). */
  stickerStops?: Record<string, { photoId: string; cutout: boolean }[]>;
}

export function LocationList({
  locations,
  onRemove,
  onMoveUp,
  onMoveDown,
  onToggleLeg,
  onUpdateDates,
  onUpdateNotes,
  disabled = false,
  stickerStops = {},
}: LocationListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (locations.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-ink-muted">
        No stops yet. Search above to add the first one.
      </p>
    );
  }

  return (
    <div className="relative">
      {/* Vertical route line */}
      {locations.length > 1 && (
        <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-border" />
      )}

      <div className="space-y-2">
        {locations.map((loc, i) => {
          const isExpanded = expandedId === loc.id;
          const isFirst = i === 0;
          const isLast = i === locations.length - 1;

          return (
            <div
              key={loc.id}
              className="relative"
            >
              {/* How this stop was reached from the previous one: tap to switch car ↔ plane. */}
              {!isFirst && (
                <div className="-mt-1 mb-1 flex h-7 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onToggleLeg(loc.id)}
                    disabled={disabled}
                    aria-pressed={loc.arrived_by_plane}
                    aria-label={loc.arrived_by_plane ? 'Flown here, switch to driven' : 'Driven here, switch to flown'}
                    title={loc.arrived_by_plane ? 'By plane, tap for car' : 'By car, tap for plane'}
                    className="btn btn-ghost relative z-10 -my-2 flex h-11 w-10 shrink-0 p-0"
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full border bg-card ${
                        loc.arrived_by_plane ? 'border-primary text-primary' : 'border-border text-ink-muted'
                      }`}
                    >
                      {loc.arrived_by_plane ? <Plane size={14} /> : <Car size={14} />}
                    </span>
                  </button>
                  {loc.arrived_by_plane && <span className="text-xs text-ink-muted">By plane</span>}
                </div>
              )}
              <div className="flex items-start gap-3">
                {/* Order indicator */}
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-card text-xs font-bold text-primary">
                  {i + 1}
                </div>

                <div className="flex-1 overflow-hidden rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {stickerStops[loc.id]?.length > 0 && (
                        // Overlapping thumbnails, at most three, then "+N".
                        <span className="flex shrink-0 items-center -space-x-3">
                          {stickerStops[loc.id].slice(0, 3).map((s) => (
                            <StickerImage
                              key={s.photoId}
                              photoId={s.photoId}
                              cutout={s.cutout}
                              name="Sticker bought here"
                              className="h-7 w-7 rounded-md ring-2 ring-card"
                            />
                          ))}
                          {stickerStops[loc.id].length > 3 && (
                            <span className="pl-4 text-xs text-ink-muted">+{stickerStops[loc.id].length - 3}</span>
                          )}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium text-sm">{loc.name}</p>
                        {loc.country && (
                          <p className="text-xs text-ink-muted">{loc.country}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 sm:h-8 sm:w-8"
                        onClick={() => setExpandedId(isExpanded ? null : loc.id)}
                        title="Edit dates & notes"
                      >
                        <CalendarDays size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 sm:h-8 sm:w-8"
                        onClick={() => onMoveUp(loc.id)}
                        disabled={isFirst || disabled}
                        title="Move up"
                      >
                        <ChevronUp size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 sm:h-8 sm:w-8"
                        onClick={() => onMoveDown(loc.id)}
                        disabled={isLast || disabled}
                        title="Move down"
                      >
                        <ChevronDown size={16} />
                      </Button>
                      <ConfirmButton
                        quiet
                        onConfirm={() => onRemove(loc.id)}
                        disabled={disabled}
                        confirmLabel="Remove?"
                        aria-label={`Remove ${loc.name}`}
                        className="ml-1.5 inline-flex h-10 min-w-10 px-2 text-sm sm:ml-0 sm:h-8 sm:min-w-8"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </ConfirmButton>
                    </div>
                  </div>

                  {/* Expanded: dates and notes */}
                  {isExpanded && (
                    <div className="overflow-hidden border-t border-border">
                      <div className="grid grid-cols-2 gap-3 p-3 pb-3">
                        <label className="flex flex-col gap-1">
                          <span className="text-sm text-ink-muted">Arrival</span>
                          <Input
                            type="date"
                            defaultValue={loc.arrival_date ?? ''}
                            className="h-11 text-sm sm:h-9"
                            onBlur={(e) =>
                              e.target.value !== (loc.arrival_date ?? '') &&
                              onUpdateDates(loc.id, e.target.value, loc.departure_date ?? '')
                            }
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-sm text-ink-muted">Departure</span>
                          <Input
                            type="date"
                            defaultValue={loc.departure_date ?? ''}
                            className="h-11 text-sm sm:h-9"
                            onBlur={(e) =>
                              e.target.value !== (loc.departure_date ?? '') &&
                              onUpdateDates(loc.id, loc.arrival_date ?? '', e.target.value)
                            }
                          />
                        </label>
                        <label className="col-span-2 flex flex-col gap-1">
                          <span className="text-sm text-ink-muted">Notes</span>
                          <textarea
                            defaultValue={loc.notes ?? ''}
                            placeholder="Add notes about this stop…"
                            rows={2}
                            className="field w-full resize-none placeholder:text-ink-muted"
                            onBlur={(e) =>
                              e.target.value !== (loc.notes ?? '') &&
                              onUpdateNotes(loc.id, e.target.value)
                            }
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
