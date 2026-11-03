import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getItem, getItems, getOutfits } from "@/lib/data/wardrobe";
import { getTodayKey } from "@/lib/today";
import { usedColors } from "@/lib/wardrobe/colors";
import { describeWorn } from "@/lib/wardrobe/logic";
import { ItemForm } from "@/components/wardrobe/ItemForm";
import { ItemPhoto, OutfitCollage } from "@/components/wardrobe/ItemPhoto";
import { ItemStatusPicker } from "@/components/wardrobe/ItemStatusPicker";
import { ConfirmDeleteButton } from "@/components/reminders/ConfirmDeleteButton";
import { Disclosure } from "@/components/Disclosure";
import { archiveItem, deleteItem } from "@/lib/actions/wardrobe";

export default async function ItemPage({ params }: PageProps<"/wardrobe/items/[id]">) {
  const { id } = await params;
  const todayKey = await getTodayKey();
  const [item, all, outfits, categories] = await Promise.all([
    getItem(id),
    getItems({ archived: true }),
    getOutfits(todayKey),
    getCategories(),
  ]);
  if (!item) notFound();
  const inOutfits = outfits.filter((o) => o.items.some((i) => i.id === item.id));
  const lastWorn = inOutfits.map((o) => o.lastWornOn).filter((d): d is string => d !== null).sort().at(-1) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/wardrobe/items" className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Items
        </Link>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end">
          <ItemPhoto eager photoId={item.photoId} cutout={item.photoCutout} name={item.name} className="aspect-square w-60 max-w-full self-center rounded-2xl sm:w-48 sm:self-auto" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground">{item.name}</h1>
            <p className="text-sm text-ink-muted">
              {item.categoryName}
              {item.color && ` · ${item.color}`}
              {item.isArchived && " · archived"}
              {inOutfits.length > 0 && ` · ${describeWorn(lastWorn, todayKey).toLowerCase()}`}
            </p>
          </div>
        </div>
      </div>

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
        <ItemForm item={item} colors={usedColors(all)} categories={categories} />
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
