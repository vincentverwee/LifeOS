import Link from "next/link";
import { connection } from "next/server";
import { getCategories, getItems } from "@/lib/data/wardrobe";
import { ItemGrid } from "@/components/wardrobe/ItemGrid";

export default async function ItemsPage() {
  await connection();
  const [all, categories] = await Promise.all([getItems({ archived: true }), getCategories()]);
  const items = all.filter((i) => !i.isArchived);
  const archived = all.length - items.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Home
        </Link>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-foreground">Items</h1>
          <Link href="/wardrobe/items/add" className="btn btn-primary inline-flex min-h-11 px-5 text-sm font-semibold">
            + Add
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-ink-muted">
          No clothes yet. Take a photo of something you wear a lot.
        </p>
      ) : (
        <ItemGrid items={items} categories={categories} />
      )}

      {archived > 0 && (
        <Link href="/wardrobe/settings#archived" className="btn btn-ghost inline-flex min-h-11 self-center px-4 text-sm">
          {archived} archived {archived === 1 ? "item" : "items"} in Settings
        </Link>
      )}
    </div>
  );
}
