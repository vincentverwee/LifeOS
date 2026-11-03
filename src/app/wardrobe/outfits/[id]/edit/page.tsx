import Link from "next/link";
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
      <div>
        <Link href={`/wardrobe/outfits/${outfit.id}`} className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ {outfit.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Edit outfit</h1>
      </div>
      <OutfitForm outfit={{ id: outfit.id, name: outfit.name, notes: outfit.notes, itemIds }} items={choices} categories={categories} />
      <ConfirmDeleteButton action={deleteOutfit} id={outfit.id} title={outfit.name} label="Delete outfit (keeps the clothes)" />
    </div>
  );
}
