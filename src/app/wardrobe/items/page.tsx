import Link from "next/link";
import { connection } from "next/server";
import { getItems } from "@/lib/data/wardrobe";
import { ItemGrid } from "@/components/wardrobe/ItemGrid";
import { Disclosure } from "@/components/Disclosure";
import { ItemPhoto } from "@/components/wardrobe/ItemPhoto";

export default async function ItemsPage() {
  await connection();
  const all = await getItems({ archived: true });
  const items = all.filter((i) => !i.isArchived);
  const archived = all.filter((i) => i.isArchived);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-foreground">Items</h1>
        <Link href="/wardrobe/items/add" className="btn btn-primary inline-flex min-h-11 px-5 text-sm font-semibold">
          + Add
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-ink-muted">
          No clothes yet. Take a photo of something you wear a lot.
        </p>
      ) : (
        <ItemGrid items={items} />
      )}

      {archived.length > 0 && (
        <Disclosure title={`Archived (${archived.length})`}>
          <ul className="flex flex-col gap-1">
            {archived.map((item) => (
              <li key={item.id}>
                <Link href={`/wardrobe/items/${item.id}`} className="tap flex min-h-11 items-center gap-3 rounded-xl">
                  <ItemPhoto photoId={item.photoId} name={item.name} className="h-10 w-10 shrink-0 rounded-lg" />
                  <span className="truncate text-foreground">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Disclosure>
      )}
    </div>
  );
}
