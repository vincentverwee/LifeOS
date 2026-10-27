'use client';

import { useState } from 'react';
import { Location } from '@/lib/waypoint/types';
import { Button } from '@/components/waypoint/ui/button';
import { Input } from '@/components/waypoint/ui/input';
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
import { MapPin, Trash2, ChevronUp, ChevronDown, CalendarDays, StickyNote, Car, Plane } from 'lucide-react';

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
}: LocationListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center">
        <MapPin size={32} className="mb-3 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No locations yet</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Use the search above to add your first stop
        </p>
      </div>
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
              className="relative animate-in fade-in slide-in-from-left-2 duration-200"
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
                        loc.arrived_by_plane ? 'border-primary text-primary' : 'border-border text-muted-foreground'
                      }`}
                    >
                      {loc.arrived_by_plane ? <Plane size={14} /> : <Car size={14} />}
                    </span>
                  </button>
                  {loc.arrived_by_plane && <span className="text-xs text-muted-foreground">By plane</span>}
                </div>
              )}
              <div className="flex items-start gap-3">
                {/* Order indicator */}
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-card text-xs font-bold text-primary">
                  {i + 1}
                </div>

                <div className="flex-1 overflow-hidden rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">{loc.name}</p>
                      {loc.country && (
                        <p className="text-xs text-muted-foreground">{loc.country}</p>
                      )}
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-1.5 h-10 w-10 text-destructive hover:text-destructive sm:ml-0 sm:h-8 sm:w-8"
                            disabled={disabled}
                            title="Remove"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove location?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove <strong>{loc.name}</strong> from this trip?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction destructive onClick={() => onRemove(loc.id)}>
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Expanded: dates and notes */}
                  {isExpanded && (
                    <div className="overflow-hidden border-t border-border animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-2 gap-3 p-3 pb-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">
                            Arrival
                          </label>
                          <Input
                            type="date"
                            defaultValue={loc.arrival_date ?? ''}
                            className="h-11 text-sm sm:h-9"
                            onBlur={(e) =>
                              e.target.value !== (loc.arrival_date ?? '') &&
                              onUpdateDates(loc.id, e.target.value, loc.departure_date ?? '')
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">
                            Departure
                          </label>
                          <Input
                            type="date"
                            defaultValue={loc.departure_date ?? ''}
                            className="h-11 text-sm sm:h-9"
                            onBlur={(e) =>
                              e.target.value !== (loc.departure_date ?? '') &&
                              onUpdateDates(loc.id, loc.arrival_date ?? '', e.target.value)
                            }
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <StickyNote size={11} />
                            Notes
                          </label>
                          <textarea
                            defaultValue={loc.notes ?? ''}
                            placeholder="Add notes about this stop…"
                            rows={2}
                            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            onBlur={(e) =>
                              e.target.value !== (loc.notes ?? '') &&
                              onUpdateNotes(loc.id, e.target.value)
                            }
                          />
                        </div>
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
