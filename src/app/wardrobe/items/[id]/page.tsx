import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getItem, getItemWears, getOutfits } from "@/lib/data/wardrobe";
import { getTodayKey } from "@/lib/today";
import { WASH_GROUP_LABEL } from "@/lib/wardrobe/types";
import { costPerWear, describeWorn } from "@/lib/wardrobe/logic";
import { formatCurrency, plural } from "@/lib/format";
import { ItemForm } from "@/components/wardrobe/ItemForm";
import { ItemPhoto, OutfitCollage } from "@/components/wardrobe/ItemPhoto";
import { ItemStatusPicker } from "@/components/wardrobe/ItemStatusPicker";
import { WearButton } from "@/components/wardrobe/WearButton";
import { ConfirmDeleteButton } from "@/components/reminders/ConfirmDeleteButton";
import { Disclosure } from "@/components/Disclosure";
import { archiveItem, deleteItem } from "@/lib/actions/wardrobe";

export default async function ItemPage({ params }: PageProps<"/wardrobe/items/[id]">) {
  const { id } = await params;
  const todayKey = await getTodayKey();
  const [item, wears, outfits, categories] = await Promise.all([
    getItem(id),
    getItemWears(id, todayKey),
    getOutfits(todayKey),
    getCategories(),
  ]);
  if (!item || !wears) notFound();
  const inOutfits = outfits.filter((o) => o.items.some((i) => i.id === item.id));
  const perWear = costPerWear(item.price, wears.count);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/wardrobe/items" className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Wardrobe
        </Link>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end">
          <ItemPhoto eager photoId={item.photoId} cutout={item.photoCutout} name={item.name} className="aspect-square w-60 max-w-full self-center rounded-2xl sm:w-48 sm:self-auto" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground">{item.name}</h1>
            <p className="text-sm text-ink-muted">
              {item.categoryName}
              {` · ${WASH_GROUP_LABEL[item.washGroup].toLowerCase()} wash`}
              {item.isArchived && " · archived"}
              {` · ${describeWorn(wears.lastWornOn, todayKey).toLowerCase()}`}
            </p>
            {item.price !== null && (
              <p className="mt-1 text-sm text-foreground">
                {formatCurrency(item.price)} ·{" "}
                {perWear === null ? (
                  <span className="text-ink-muted">not worn yet</span>
                ) : (
                  <>
                    {plural(wears.count, "wear", "wears")} ·{" "}
                    <span className="font-semibold">{formatCurrency(perWear)} a wear</span>
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {!item.isArchived && (
        <WearButton
          itemId={item.id}
          status={item.status}
          wornToday={wears.wornTodayDirect}
          wornInOutfit={wears.wornTodayViaOutfit}
          inWashFromToday={wears.inWashFromToday}
        />
      )}

      <ItemStatusPicker key={item.status} id={item.id} status={item.status} />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-ink-muted">
          {inOutfits.length === 0 ? "Not in an outfit yet" : `In ${inOutfits.length === 1 ? "1 outfit" : `${inOutfits.length} outfits`}`}
        </h2>
        {inOutfits.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {inOutfits.map((o) => (
              <li key={o.id}>
                <Link href={`/wardrobe/outfits/${o.id}`} className="tap flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-surface p-2 hover:border-primary">
                  <OutfitCollage items={o.items} className="h-12 w-12 shrink-0 rounded-lg" />
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">{o.name}</span>
                  <span aria-hidden="true" className="pr-2 text-ink-muted">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Link href="/wardrobe/outfits/add" className="btn btn-outline inline-flex min-h-11 self-start px-4 text-sm">
            Put an outfit together
          </Link>
        )}
      </section>

      <Disclosure title="Edit">
        <ItemForm item={item} categories={categories} />
        <form action={archiveItem}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="archive" value={item.isArchived ? "false" : "true"} />
          <button type="submit" className="btn btn-outline flex min-h-11 w-full px-4 text-sm">
            {item.isArchived ? "Bring back" : "Archive (hides it, keeps it in its outfits)"}
          </button>
        </form>
        <ConfirmDeleteButton
          action={deleteItem}
          id={item.id}
          title={item.name}
          label={inOutfits.length > 0 ? "Delete (also takes it out of its outfits)" : "Delete"}
        />
      </Disclosure>
    </div>
  );
}
