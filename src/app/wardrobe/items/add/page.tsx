import Link from "next/link";
import { connection } from "next/server";
import { getItem, getItems } from "@/lib/data/wardrobe";
import { ItemForm } from "@/components/wardrobe/ItemForm";
import { usedColors } from "@/lib/wardrobe/colors";

export default async function AddItemPage({ searchParams }: PageProps<"/wardrobe/items/add">) {
  await connection();
  const { added } = await searchParams;
  const [items, last] = await Promise.all([
    getItems({ archived: true }),
    typeof added === "string" ? getItem(added) : null,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/wardrobe/items" className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Items
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Add item</h1>
      </div>
      {last && (
        <p role="status" className="flex items-center justify-between gap-3 rounded-2xl bg-surface-muted py-1 pr-1 pl-4 text-sm text-foreground">
          <span className="min-w-0 truncate">✓ Added {last.name}</span>
          <Link href={`/wardrobe/items/${last.id}`} className="btn btn-ghost inline-flex min-h-11 shrink-0 px-4">
            View
          </Link>
        </p>
      )}
      {/* A fresh form after each "add another" (the key), on the type just used. */}
      <ItemForm key={last?.id ?? "new"} colors={usedColors(items)} defaultKind={last?.kind} />
    </div>
  );
}
