'use client';

import { useState } from 'react';
import { TripSummary } from '@/lib/waypoint/types';
import { CreateTripInput } from '@/lib/actions/waypoint';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/waypoint/ui/dialog';
import { Button } from '@/components/waypoint/ui/button';
import { Input } from '@/components/waypoint/ui/input';
import { Textarea } from '@/components/waypoint/ui/textarea';
import { Label } from '@/components/waypoint/ui/label';
import { Caravan, Wallet } from 'lucide-react';
import Link from 'next/link';
import { parseAmount, toDateInputValue } from '@/lib/format';

interface TripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip?: TripSummary | null;
  onSave: (data: CreateTripInput) => Promise<void>;
  /** A new trip starts with the van switch on (the list is showing van trips). */
  defaultVan?: boolean;
  /** "Plan a trip": the title says so and the start date is required. */
  planning?: boolean;
}

const EMPTY: CreateTripInput = {
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  with_van: false,
};

export function TripDialog({ open, onOpenChange, trip, onSave, defaultVan = false, planning = false }: TripDialogProps) {
  const [form, setForm] = useState<CreateTripInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Budget trip alongside a planned one (new trips only; a linked one follows edits by itself).
  const [withBudget, setWithBudget] = useState(false);
  const [budget, setBudget] = useState('');

  // Reset the form whenever the dialog opens for a (possibly different) trip.
  // Done during render, not in an effect, so the fields never flash stale content.
  const [syncedFor, setSyncedFor] = useState<{ trip?: TripSummary | null; open: boolean }>();
  if (!syncedFor || syncedFor.trip !== trip || syncedFor.open !== open) {
    setSyncedFor({ trip, open });
    setError(null);
    setWithBudget(false);
    setBudget('');
    setForm(
      trip
        ? {
            title: trip.title,
            description: trip.description ?? '',
            start_date: trip.start_date ?? '',
            end_date: trip.end_date ?? '',
            with_van: trip.with_van,
          }
        : { ...EMPTY, with_van: defaultVan }
    );
  }

  // A start date after today makes it a planned trip (see isPlanned in src/lib/waypoint/stats.ts).
  const planned = !!form.start_date && form.start_date > toDateInputValue();
  // New plans, and plans made without one, can get a budget trip; a linked one follows edits.
  const showBudget = planned && !trip?.budget_trip_id;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    let data = form;
    if (showBudget && withBudget) {
      const amount = parseAmount(budget);
      if (!amount) return setError('Enter a budget greater than zero.');
      if (!form.end_date) return setError('A budget trip needs an end date.');
      data = { ...form, budget: amount };
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(data);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saving failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{trip ? 'Edit trip' : planning ? 'Plan a trip' : 'New trip'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Summer road trip 2026"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="A short description of this trip"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="start_date">Start date</Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                min={planning ? toDateInputValue() : undefined}
                required={planning}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="end_date">End date</Label>
              <Input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={!!form.with_van}
            onClick={() => setForm({ ...form, with_van: !form.with_van })}
            className="tap -mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 text-left"
          >
            <span
              aria-hidden="true"
              className={`relative h-6 w-10 shrink-0 rounded-full transition-colors motion-reduce:transition-none ${
                form.with_van ? 'bg-primary' : 'bg-surface-muted ring-1 ring-border'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-[left] motion-reduce:transition-none ${
                  form.with_van ? 'left-[1.125rem]' : 'left-0.5'
                }`}
              />
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Caravan size={16} className="text-ink-muted" aria-hidden="true" />
              With the van
            </span>
          </button>

          {showBudget && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={withBudget}
                onClick={() => setWithBudget(!withBudget)}
                className="tap -mx-2 flex min-h-11 w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 text-left"
              >
                <span
                  aria-hidden="true"
                  className={`relative h-6 w-10 shrink-0 rounded-full transition-colors motion-reduce:transition-none ${
                    withBudget ? 'bg-primary' : 'bg-surface-muted ring-1 ring-border'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-[left] motion-reduce:transition-none ${
                      withBudget ? 'left-[1.125rem]' : 'left-0.5'
                    }`}
                  />
                </span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Wallet size={16} className="text-ink-muted" aria-hidden="true" />
                  Also create a budget trip
                </span>
              </button>
              {withBudget && (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="budget">Trip budget (€)</Label>
                  <Input
                    id="budget"
                    inputMode="decimal"
                    placeholder="e.g. 400"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                  <p className="text-xs text-ink-muted">Uses the same dates; renaming or moving this trip moves it too.</p>
                </div>
              )}
            </div>
          )}

          {trip?.budget_trip_id && (
            <p className="text-sm text-ink-muted">
              Has a budget trip: it follows the name and dates.{' '}
              <Link href="/budget/settings" className="font-medium text-primary underline-offset-2 hover:underline">
                Budget settings
              </Link>
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {saving ? 'Saving…' : trip ? 'Save changes' : planned ? 'Plan trip' : 'Create trip'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
