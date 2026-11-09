import { PageHeader } from "@/components/ui/PageHeader";
import { notFound } from "next/navigation";
import { getCategories, getItems, getOutfit } from "@/lib/data/wardrobe";
import { getTodayKey } from "@/lib/today";
import { OutfitForm } from "@/components/wardrobe/OutfitForm";
import { ConfirmDeleteButton } from "@/components/reminders/ConfirmDeleteButton";
import { deleteOutfit } from "@/lib/actions/wardrobe";

export default async function EditOutfitPage({ params }: PageProps<"/wardrobe/outfits/[id]/edit">) {
  const { id } = await params;
  const [outfit, items, categories] = await Promise.all([
    getOutfit(id, await getTodayKey()),
    getItems({ archived: true }),
    getCategories(),
  ]);
  if (!outfit) notFound();
  const itemIds = outfit.items.map((i) => i.id);
  // Archived pieces only show when they're already part of this outfit.
  const choices = items.filter((i) => !i.isArchived || itemIds.includes(i.id));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit outfit" back={{ href: `/wardrobe/outfits/${outfit.id}`, label: outfit.name }} />
      <OutfitForm outfit={{ id: outfit.id, name: outfit.name, notes: outfit.notes, itemIds }} items={choices} categories={categories} />
      <ConfirmDeleteButton action={deleteOutfit} id={outfit.id} title={outfit.name} label="Delete outfit (keeps the clothes)" />
    </div>
  );
}
