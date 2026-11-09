import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { connection } from "next/server";
import { getItems, getLastWashOn } from "@/lib/data/wardrobe";
import { getTodayKey } from "@/lib/today";
import { describeSince } from "@/lib/reminders/routines";
import { WashBoard } from "@/components/wardrobe/WashBoard";

export default async function WardrobePage() {
  await connection();
  const [items, lastWashOn, todayKey] = await Promise.all([getItems(), getLastWashOn(), getTodayKey()]);
  const clean = items.filter((i) => i.status === "clean").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Wash"
        subtitle={
          <>
            {items.length === 0 ? "No clothes yet." : `${clean} of ${items.length} ${items.length === 1 ? "item" : "items"} clean`}
            {lastWashOn && ` · last wash ${describeSince(lastWashOn, todayKey).toLowerCase()}`}
          </>
        }
        back={{ href: "/wardrobe/items", label: "Wardrobe" }}
      />

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-ink-muted">
          Start with your clothes.{" "}
          <Link href="/wardrobe/items/add" className="btn btn-ghost -mx-1 inline-flex min-h-11 px-3">
            Add an item
          </Link>
        </p>
      ) : (
        <WashBoard
          items={items.map(({ id, name, categoryName, washGroup, status, photoId, photoCutout }) => ({
            id,
            name,
            categoryName,
            washGroup,
            status,
            photoId,
            photoCutout,
          }))}
        />
      )}
    </div>
  );
}
