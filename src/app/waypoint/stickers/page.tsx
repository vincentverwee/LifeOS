import Link from 'next/link';
import { connection } from 'next/server';
import { Sticker } from 'lucide-react';
import { getAllStickers } from '@/lib/data/stickers';
import { groupStickersByYear } from '@/lib/waypoint/stickers';
import { StickerImage } from '@/components/waypoint/StickerImage';

/** Every sticker from every trip, by year, like the back of the van. Tap one to open its trip. */
export default async function StickersPage() {
  await connection();
  const stickers = await getAllStickers();
  const years = groupStickersByYear(stickers);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href="/waypoint" className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Overview
        </Link>
        <h2 className="mt-1 text-2xl font-semibold text-foreground">
          Stickers <span className="text-lg font-normal text-muted-foreground tabular-nums">{stickers.length}</span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">One for every trip you picked one up on.</p>
      </div>

      {stickers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <Sticker size={48} className="mb-4 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">No stickers yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground/70">
            Open a trip and tap “+ Sticker” to add the one you bought there.
          </p>
          <Link href="/waypoint/trips" className="btn btn-outline mt-6 inline-flex min-h-11 px-4 text-sm">
            Go to trips
          </Link>
        </div>
      ) : (
        years.map(({ year, stickers: list }) => (
          <section key={year ?? 'undated'} className="space-y-3">
            <h3 className="font-semibold text-foreground">
              {year ?? 'No date'} <span className="text-sm font-normal text-muted-foreground">· {list.length}</span>
            </h3>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {list.map((s) => (
                <li key={s.id}>
                  <Link href={`/waypoint/trips/${s.tripId}`} className="tap block rounded-xl">
                    <StickerImage photoId={s.photoId} cutout={s.cutout} name={s.name ?? s.tripTitle} className="aspect-square w-full rounded-xl" />
                    <p className="mt-1 truncate text-xs font-medium text-foreground">{s.name ?? s.tripTitle}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.name ? s.tripTitle : null}
                      {s.name && s.stopName ? ' · ' : null}
                      {s.stopName}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
