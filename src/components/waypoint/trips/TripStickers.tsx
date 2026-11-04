'use client';

import { useState, useTransition } from 'react';
import { Plus, Sticker as StickerIcon } from 'lucide-react';
import { Sheet } from '@/components/recipes/Sheet';
import { PhotoField } from '@/components/images/PhotoField';
import { StickerImage } from '@/components/waypoint/StickerImage';
import { createSticker, deleteSticker, updateSticker } from '@/lib/actions/stickers';
import type { Sticker } from '@/lib/waypoint/stickers';

type Stop = { id: string; name: string; city: string | null };

/** Longest side of a sticker cut-out (also `prisma/shrink-photos.ts`). */
const STICKER_SIDE = 500;

const FIELD = 'rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground';

/**
 * The trip page's stickers: a row of cut-outs and a "+ Sticker" tile. Tapping one (or +)
 * opens the form: photo (Wardrobe's camera / library + shrink), name, the stop it was
 * bought at, a note.
 */
export function TripStickers({ tripId, stickers, stops }: { tripId: string; stickers: Sticker[]; stops: Stop[] }) {
  // null = closed, 'new' = adding, else the sticker being edited.
  const [editing, setEditing] = useState<Sticker | 'new' | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <StickerIcon size={16} className="text-primary" />
        <h3 className="font-semibold">
          Stickers
          {stickers.length > 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">({stickers.length})</span>}
        </h3>
      </div>
      <ul className="flex flex-wrap gap-3">
        {stickers.map((s) => (
          <li key={s.id} className="w-24">
            <button
              type="button"
              onClick={() => setEditing(s)}
              className="tap block w-full rounded-xl text-left"
              aria-label={`Edit sticker ${s.name ?? ''}`.trim()}
            >
              <StickerImage photoId={s.photoId} cutout={s.cutout} name={s.name ?? 'Sticker'} className="aspect-square w-full rounded-xl" />
              {s.name && <p className="mt-1 truncate text-xs text-foreground">{s.name}</p>}
              {s.locationId && (
                <p className={`truncate text-xs text-muted-foreground ${s.name ? '' : 'mt-1'}`}>
                  {stops.find((stop) => stop.id === s.locationId)?.name}
                </p>
              )}
            </button>
          </li>
        ))}
        <li className="w-24">
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="tap flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-sm text-muted-foreground"
          >
            <Plus size={20} aria-hidden="true" />
            Sticker
          </button>
        </li>
      </ul>
      {stickers.length === 0 && <p className="text-sm text-muted-foreground">Add the sticker from this trip.</p>}

      {/* A bottom sheet on phones (the form is taller than the screen; a centred dialog scrolls badly there). */}
      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)} title={editing === 'new' ? 'New sticker' : 'Sticker'}>
        {editing !== null && (
          <StickerForm
            // A fresh form per sticker.
            key={editing === 'new' ? 'new' : editing.id}
            tripId={tripId}
            sticker={editing === 'new' ? null : editing}
            stops={stops}
            onDone={() => setEditing(null)}
          />
        )}
      </Sheet>
    </div>
  );
}

function StickerForm({
  tripId,
  sticker,
  stops,
  onDone,
}: {
  tripId: string;
  sticker: Sticker | null;
  stops: Stop[];
  onDone: () => void;
}) {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [shrinking, setShrinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (photo) formData.set('photo', new File([photo], 'sticker', { type: photo.type }));
    if (!sticker && !photo) {
      setError('Add a photo of the sticker.');
      return;
    }
    setError(null);
    start(async () => {
      try {
        const result = await (sticker ? updateSticker(formData) : createSticker(formData));
        if (result.ok) onDone();
        else setError(result.error);
      } catch {
        setError("Couldn't save that. Check your connection and try again.");
      }
    });
  }

  function remove() {
    if (!sticker) return;
    start(async () => {
      try {
        await deleteSticker(sticker.id);
        onDone();
      } catch {
        setError("Couldn't delete that. Check your connection and try again.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <input type="hidden" name="tripId" value={tripId} />
      {sticker && <input type="hidden" name="id" value={sticker.id} />}

      <PhotoField
        label={sticker ? 'Photo' : 'Photo (tip: on iPhone, lift the sticker out of the photo for a cut-out)'}
        hasExisting={Boolean(sticker)}
        existing={
          sticker && <StickerImage photoId={sticker.photoId} cutout={sticker.cutout} name={sticker.name ?? 'Sticker'} className="h-full w-full" />
        }
        empty={<StickerImage photoId={null} name="No photo" className="h-full w-full" />}
        // A sticker always has a photo: it can be replaced, not removed.
        removable={false}
        // Stickers show at ~100–150 px; 500 is sharp on a 3× screen.
        cutoutSide={STICKER_SIDE}
        onChange={(next) => setPhoto(next)}
        onShrinking={setShrinking}
      />

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Name (optional)</span>
        <input name="name" type="text" maxLength={80} defaultValue={sticker?.name ?? ''} placeholder="e.g. Mont Ventoux" className={FIELD} />
      </label>

      {stops.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">Bought at</span>
          <select name="locationId" defaultValue={sticker?.locationId ?? ''} className={FIELD}>
            <option value="">No stop</option>
            {stops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.city && s.city !== s.name ? `${s.name} · ${s.city}` : s.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Note (optional)</span>
        <textarea name="note" rows={2} maxLength={500} defaultValue={sticker?.note ?? ''} placeholder="Where you found it, what it cost…" className={FIELD} />
      </label>

      {error && <p className="text-sm text-critical">{error}</p>}

      <button type="submit" disabled={pending || shrinking} className="btn btn-primary flex min-h-11 w-full px-4 text-base font-semibold">
        {pending ? 'Saving…' : 'Save'}
      </button>

      {sticker &&
        (confirmDelete ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmDelete(false)} className="btn btn-outline flex min-h-11 flex-1 px-4 text-sm">
              Keep it
            </button>
            <button type="button" disabled={pending} onClick={remove} className="btn btn-destructive flex min-h-11 flex-1 px-4 text-sm">
              Delete sticker
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="btn btn-danger flex min-h-11 w-full px-4 text-sm">
            Delete
          </button>
        ))}
    </form>
  );
}
