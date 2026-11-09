import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { getOutfits } from "@/lib/data/wardrobe";
import { getTodayKey } from "@/lib/today";
import { describeUnavailable, describeWorn, outfitReadiness } from "@/lib/wardrobe/logic";
import { OutfitCollage } from "@/components/wardrobe/ItemPhoto";

export default async function OutfitsPage() {
  const todayKey = await getTodayKey();
  const outfits = await getOutfits(todayKey);
  // Today's outfit first, then ready ones, so the top of the list is what you can put on now.
  const sorted = outfits
    .map((o) => ({ ...o, readiness: outfitReadiness(o.items) }))
    .sort((a, b) => Number(b.wornToday) - Number(a.wornToday) || Number(b.readiness.ready) - Number(a.readiness.ready));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Outfits"
        back={{ href: "/wardrobe/items", label: "Wardrobe" }}
        action={
          <Link href="/wardrobe/outfits/add" className="btn btn-primary inline-flex min-h-11 px-5 text-sm font-semibold">
            + New
          </Link>
        }
      />

      {outfits.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-ink-muted">
          No outfits yet.{" "}
          <Link href="/wardrobe/outfits/add" className="btn btn-ghost -mx-1 inline-flex min-h-11 px-3">
            Put one together
          </Link>
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sorted.map((o) => (
            <li key={o.id}>
              <Link href={`/wardrobe/outfits/${o.id}`} className="tap block overflow-hidden rounded-2xl border border-border bg-surface hover:border-primary">
                <div className="relative">
                  <OutfitCollage items={o.items} className={`aspect-square w-full ${o.readiness.ready || o.wornToday ? "" : "opacity-60"}`} />
                  {(o.wornToday || !o.readiness.ready) && (
                    <span className="absolute top-2 left-2 rounded-full bg-surface/90 px-2 py-0.5 text-xs font-medium text-foreground">
                      {o.wornToday ? "✓ Worn today" : describeUnavailable(o.readiness.unavailable)}
                    </span>
                  )}
                </div>
                <div className="px-3 py-2">
                  <p className="truncate font-medium text-foreground">{o.name}</p>
                  <p className="truncate text-sm text-ink-muted">{describeWorn(o.lastWornOn, todayKey)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
