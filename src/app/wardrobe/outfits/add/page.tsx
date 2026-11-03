import Link from "next/link";
import { connection } from "next/server";
import { getCategories, getItems } from "@/lib/data/wardrobe";
import { OutfitForm } from "@/components/wardrobe/OutfitForm";

export default async function AddOutfitPage() {
  await connection();
  const [items, categories] = await Promise.all([getItems(), getCategories()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/wardrobe/outfits" className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Outfits
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">New outfit</h1>
      </div>
      <OutfitForm items={items} categories={categories} />
    </div>
  );
}
