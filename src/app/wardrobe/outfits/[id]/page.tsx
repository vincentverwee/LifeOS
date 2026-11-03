import Link from "next/link";
import { notFound } from "next/navigation";
import { getOutfit } from "@/lib/data/wardrobe";
import { getTodayKey } from "@/lib/today";
import { describeUnavailable, describeWorn, outfitReadiness } from "@/lib/wardrobe/logic";
import { STATUS_LABEL } from "@/lib/wardrobe/types";
import { ItemPhoto } from "@/components/wardrobe/ItemPhoto";
import { WearButton } from "@/components/wardrobe/WearButton";
import { Disclosure } from "@/components/Disclosure";

const dateFormat = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function OutfitPage({ params }: PageProps<"/wardrobe/outfits/[id]">) {
  const { id } = await params;
  const todayKey = await getTodayKey();
  const outfit = await getOutfit(id, todayKey);
  if (!outfit) notFound();
  const { ready, unavailable } = outfitReadiness(outfit.items);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/wardrobe/outfits" className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Outfits
        </Link>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-foreground">{outfit.name}</h1>
          <Link href={`/wardrobe/outfits/${outfit.id}/edit`} className="btn btn-outline inline-flex min-h-11 px-4 text-sm">
            Edit
          </Link>
        </div>
        <p className="text-sm text-ink-muted">
          {describeWorn(outfit.lastWornOn, todayKey)}
          {outfit.wearCount > 0 && ` · ${outfit.wearCount}× in total`}
        </p>
      </div>

      {!ready && !outfit.wornToday && (
        <p className="rounded-2xl bg-surface-muted px-4 py-3 text-sm text-foreground">
          Not ready: {describeUnavailable(unavailable)}.
        </p>
      )}

      <WearButton outfitId={outfit.id} wornToday={outfit.wornToday} />

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {outfit.items.map((item) => (
          <li key={item.id}>
            <Link href={`/wardrobe/items/${item.id}`} className="tap block overflow-hidden rounded-2xl border border-border bg-surface hover:border-primary">
              <div className="relative">
                <ItemPhoto photoId={item.photoId} name={item.name} className="aspect-square w-full" />
                {item.status !== "clean" && (
                  <span className="absolute top-2 left-2 rounded-full bg-surface/90 px-2 py-0.5 text-xs font-medium text-foreground">
                    {STATUS_LABEL[item.status]}
                  </span>
                )}
              </div>
              <p className="truncate px-3 py-2 font-medium text-foreground">
                {item.name}
                {item.isArchived && <span className="font-normal text-ink-muted"> · archived</span>}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {outfit.notes && <p className="whitespace-pre-line text-foreground">{outfit.notes}</p>}

      {outfit.wornDays.length > 0 && (
        <Disclosure title={`Worn ${outfit.wornDays.length}×`}>
          <ul className="flex flex-col gap-1 text-sm text-foreground">
            {outfit.wornDays.map((d) => (
              <li key={d} className="tabular-nums">
                {dateFormat.format(new Date(`${d}T00:00:00Z`))}
              </li>
            ))}
          </ul>
        </Disclosure>
      )}
    </div>
  );
}
