import Link from "next/link";
import { HomeContent } from "@/components/home/HomeContent";
import { QuickRail } from "@/components/home/QuickRail";
import { railSections } from "@/components/home/TileBodies";
import { getHomeAlerts } from "@/lib/data/homeAlerts";
import { dayKeyIn, getTimeZone } from "@/lib/today";

export const metadata = { title: "Home preview" };

type Frame = "phone" | "full";

/** One pill of the segmented switch at the top, as a link. */
function Choice({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`btn flex min-h-11 flex-1 px-3 text-sm ${
        active ? "bg-surface text-foreground shadow-sm" : "text-ink-muted hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

/**
 * Not linked anywhere: Home (with its quick column) in a phone-sized box, to
 * judge phone layouts on a laptop. ?frame=phone shows it in a
 * phone-sized box (390 wide), ?frame=full at full size.
 */
export default async function PreviewPage({ searchParams }: PageProps<"/preview">) {
  const frame: Frame = (await searchParams).frame === "full" ? "full" : "phone";
  const tz = await getTimeZone();
  const todayKey = dayKeyIn(tz);
  const sections = railSections();
  const alerts = getHomeAlerts(todayKey);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Home preview</h1>
        <p className="text-sm text-ink-muted">
          Home as it is, plus a column to open a section quickly: swipe right from the left edge (or tap the tab on the edge) to show it, swipe
          left or tap outside to hide it. A red dot means something needs you.
        </p>
        <div className="flex gap-1 rounded-full bg-surface-muted p-1 sm:max-w-sm">
          <Choice href="/preview?frame=phone" active={frame === "phone"}>
            Phone frame
          </Choice>
          <Choice href="/preview?frame=full" active={frame === "full"}>
            Full width
          </Choice>
        </div>
      </div>

      {frame === "phone" ? (
        // An iPhone-sized screen; Home scrolls inside it like on the phone.
        <div className="mx-auto h-[796px] w-[390px] max-w-full overflow-hidden rounded-[2.5rem] border-8 border-foreground/80 bg-background shadow-xl">
          <QuickRail sections={sections} alerts={alerts} contained>
            <HomeContent tz={tz} todayKey={todayKey} />
          </QuickRail>
        </div>
      ) : (
        <QuickRail sections={sections} alerts={alerts}>
          <HomeContent tz={tz} todayKey={todayKey} />
        </QuickRail>
      )}
    </div>
  );
}
