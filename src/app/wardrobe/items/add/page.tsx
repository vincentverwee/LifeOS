import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { connection } from "next/server";
import { getCategories, getItem } from "@/lib/data/wardrobe";
import { ItemForm } from "@/components/wardrobe/ItemForm";

export default async function AddItemPage({ searchParams }: PageProps<"/wardrobe/items/add">) {
  await connection();
  const { added } = await searchParams;
  const [categories, last] = await Promise.all([
    getCategories(),
    typeof added === "string" ? getItem(added) : null,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add item" back={{ href: "/wardrobe/items", label: "Wardrobe" }} />
      {last && (
        <p role="status" className="flex items-center justify-between gap-3 rounded-2xl bg-surface-muted py-1 pr-1 pl-4 text-sm text-foreground">
          <span className="min-w-0 truncate">✓ Added {last.name}</span>
          <Link href={`/wardrobe/items/${last.id}`} className="btn btn-ghost inline-flex min-h-11 shrink-0 px-4">
            View
          </Link>
        </p>
      )}
      {/* A fresh form after each "add another" (the key), on the category just used. */}
      <ItemForm
        key={last?.id ?? "new"}
        categories={categories}
        defaultCategoryId={last ? last.categoryId : undefined}
      />
    </div>
  );
}
