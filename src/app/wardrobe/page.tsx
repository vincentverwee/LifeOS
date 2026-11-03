import Link from "next/link";
import { connection } from "next/server";
import { getItems } from "@/lib/data/wardrobe";
import { WashBoard } from "@/components/wardrobe/WashBoard";

export default async function WardrobePage() {
  await connection();
  const items = await getItems();
  const clean = items.filter((i) => i.status === "clean").length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="btn btn-ghost -mx-3 inline-flex min-h-11 px-3 text-sm">
          ‹ Home
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Wash</h1>
        <p className="text-sm text-ink-muted">
          {items.length === 0 ? "No clothes yet." : `${clean} of ${items.length} ${items.length === 1 ? "item" : "items"} clean`}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-ink-muted">
          Start with your clothes.{" "}
          <Link href="/wardrobe/items/add" className="btn btn-ghost -mx-1 inline-flex min-h-11 px-3">
            Add an item
          </Link>
        </p>
      ) : (
        <WashBoard items={items.map(({ id, name, categoryName, status, photoId }) => ({ id, name, categoryName, status, photoId }))} />
      )}
    </div>
  );
}
