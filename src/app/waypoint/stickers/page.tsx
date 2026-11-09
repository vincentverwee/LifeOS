import Link from 'next/link';
import { connection } from 'next/server';
import { PageHeader } from '@/components/ui/PageHeader';
import { getAllStickers } from '@/lib/data/stickers';
import { groupStickersByYear } from '@/lib/waypoint/stickers';
import { StickerImage } from '@/components/waypoint/StickerImage';

/** Every sticker from every trip, by year, like the back of the van. Tap one to open its trip. */
export default async function StickersPage() {
  await connection();
  const stickers = await getAllStickers();
  const years = groupStickersByYear(stickers);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          <>
            Stickers{' '}
            {stickers.length > 0 && <span className="text-lg font-normal text-ink-muted tabular-nums">{stickers.length}</span>}
          </>
        }
        subtitle="One for every trip you picked one up on."
        back={{ href: '/waypoint', label: 'Waypoint' }}
      />

      {stickers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-ink-muted">
          <p>Open a trip and tap “+ Sticker” to add the one you bought there.</p>
          <Link href="/waypoint/trips" className="btn btn-primary mt-3 inline-flex min-h-11 px-5 text-sm font-semibold">
            Go to trips
          </Link>
        </div>
      ) : (
        years.map(({ year, stickers: list }) => (
          <section key={year ?? 'undated'} className="flex flex-col gap-3">
            <h2 className="section-title">
              {year ?? 'No date'} <span className="text-sm font-normal text-ink-muted">· {list.length}</span>
            </h2>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {list.map((s) => (
                <li key={s.id}>
                  <Link href={`/waypoint/trips/${s.tripId}`} className="tap block rounded-xl">
                    <StickerImage photoId={s.photoId} cutout={s.cutout} name={s.name ?? s.tripTitle} className="aspect-square w-full rounded-xl" />
                    <p className="mt-1 truncate text-xs font-medium text-foreground">{s.name ?? s.tripTitle}</p>
                    <p className="truncate text-xs text-ink-muted">
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
