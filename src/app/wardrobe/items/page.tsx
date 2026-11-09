import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
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
      <PageHeader section="wardrobe"
        title="Wardrobe"
        subtitle={`${items.length} ${items.length === 1 ? "piece" : "pieces"}`}
        action={
          <Link href="/wardrobe/items/add" className="btn btn-primary hidden min-h-11 px-5 text-sm font-semibold sm:inline-flex">
            + Add
          </Link>
        }
      />

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
