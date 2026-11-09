import { PageHeader } from "@/components/ui/PageHeader";
import { connection } from "next/server";
import { getCategories, getItems } from "@/lib/data/wardrobe";
import { OutfitForm } from "@/components/wardrobe/OutfitForm";

export default async function AddOutfitPage() {
  await connection();
  const [items, categories] = await Promise.all([getItems(), getCategories()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="New outfit" back={{ href: "/wardrobe/outfits", label: "Outfits" }} />
      <OutfitForm items={items} categories={categories} />
    </div>
  );
}
