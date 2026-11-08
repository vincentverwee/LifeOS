import Link from "next/link";
import { HomeContent } from "@/components/home/HomeContent";
import { QuickRail } from "@/components/home/QuickRail";
import { HOME_SECTIONS } from "@/components/home/TileBodies";
import { getHomeAlerts } from "@/lib/data/homeAlerts";
import { mascotName } from "@/lib/mascots";
import { THEME } from "@/lib/theme";
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
 * Not linked anywhere: the real Home with the quick column of mascots that open their section (swipe right from the
 * left edge or tap the tab; swipe left to hide). ?frame=phone shows it in a
 * phone-sized box (390 wide), ?frame=full at full size.
 */
export default async function PreviewPage({ searchParams }: PageProps<"/preview">) {
  const frame: Frame = (await searchParams).frame === "full" ? "full" : "phone";
  const tz = await getTimeZone();
  const todayKey = dayKeyIn(tz);
  const alerts = await getHomeAlerts(todayKey);
  // The column shows who lives there (Penny, Hops…); every section kind has a mascot.
  const sections = HOME_SECTIONS.map((s) => ({
    kind: s.kind,
    name: s.kind === "plain" ? s.name : mascotName(s.kind, THEME),
    section: s.name,
    href: s.href,
    alert: alerts.has(s.kind),
  }));

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
          <QuickRail sections={sections} contained>
            <HomeContent tz={tz} todayKey={todayKey} />
          </QuickRail>
        </div>
      ) : (
        <QuickRail sections={sections}>
          <HomeContent tz={tz} todayKey={todayKey} />
        </QuickRail>
      )}
    </div>
  );
}
