import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { connection } from "next/server";
import { getCategories, getItems } from "@/lib/data/wardrobe";
import { CategoryManager } from "@/components/wardrobe/CategoryManager";
import { ItemPhoto } from "@/components/wardrobe/ItemPhoto";
import { archiveItem } from "@/lib/actions/wardrobe";

export default async function WardrobeSettingsPage() {
  await connection();
  const [categories, items] = await Promise.all([getCategories(), getItems({ archived: true })]);
  const archived = items.filter((i) => i.isArchived);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" back={{ href: "/wardrobe/items", label: "Wardrobe" }} />

      <section className="flex flex-col gap-3">
        <h2 className="section-title">Categories</h2>
        <CategoryManager categories={categories} />
      </section>

      <section id="archived" className="flex scroll-mt-4 flex-col gap-3">
        <div>
          <h2 className="section-title">Archived clothes</h2>
          <p className="text-sm text-ink-muted">Hidden from Items and the wash; they stay in their outfits.</p>
        </div>
        {archived.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-4 text-center text-sm text-ink-muted">
            Nothing archived. Archive clothes you no longer wear from their page.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {archived.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-2">
                <Link href={`/wardrobe/items/${item.id}`} className="tap flex min-w-0 flex-1 items-center gap-3 rounded-xl">
                  <ItemPhoto photoId={item.photoId} cutout={item.photoCutout} name={item.name} className="h-12 w-12 shrink-0 rounded-xl" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{item.name}</span>
                    <span className="block truncate text-sm text-ink-muted">{item.categoryName}</span>
                  </span>
                </Link>
                <form action={archiveItem}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="archive" value="false" />
                  <input type="hidden" name="back" value="settings" />
                  <button type="submit" className="btn btn-outline min-h-11 shrink-0 px-4 text-sm">
                    Bring back
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
