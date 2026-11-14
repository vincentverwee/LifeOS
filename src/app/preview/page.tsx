import Link from "next/link";
import { BirthdayParty } from "@/components/home/BirthdayParty";
import { HomeContent } from "@/components/home/HomeContent";
import { QuickRail } from "@/components/home/QuickRail";
import { hourIn, railSections } from "@/components/home/TileBodies";
import { EditorialLook } from "@/components/preview/looks/EditorialLook";
import { InkLook } from "@/components/preview/looks/InkLook";
import { MidnightLook } from "@/components/preview/looks/MidnightLook";
import { SoftLook } from "@/components/preview/looks/SoftLook";
import { BentoGlassLook } from "@/components/preview/looks/BentoGlassLook";
import { AgendaLook } from "@/components/preview/looks/AgendaLook";
import { BentoLook } from "@/components/preview/looks/BentoLook";
import { CompactLook } from "@/components/preview/looks/CompactLook";
import { GlassLook } from "@/components/preview/looks/GlassLook";
import { MonoLook } from "@/components/preview/looks/MonoLook";
import { NotebookLook } from "@/components/preview/looks/NotebookLook";
import { PastelLook } from "@/components/preview/looks/PastelLook";
import { RefinedLook } from "@/components/preview/looks/RefinedLook";
import { WidgetsLook } from "@/components/preview/looks/WidgetsLook";
import type { LookProps } from "@/components/preview/looks/shared";
import { birthdayNote } from "@/lib/birthday";
import { getHomeAlerts } from "@/lib/data/homeAlerts";
import { getHomeMoods } from "@/lib/data/homeMoods";
import { getHomeSnapshot } from "@/lib/data/homeSnapshot";
import { THEME } from "@/lib/theme";
import { dayKeyIn, getTimeZone } from "@/lib/today";
import { fraunces } from "@/components/home/fonts";
import { caveat, inter } from "./fonts";

export const metadata = { title: "Home preview" };

type Frame = "phone" | "full";

/** Today's Home, or one of the redesign mockups (src/components/preview/looks). */
const LOOKS: { id: string; label: string; Look: React.ComponentType<LookProps> | null }[] = [
  { id: "current", label: "Current", Look: null },
  { id: "bento-glass", label: "Bento Glass", Look: BentoGlassLook },
  { id: "refined", label: "Refined", Look: RefinedLook },
  { id: "widgets", label: "Widgets", Look: WidgetsLook },
  { id: "bento", label: "Bento", Look: BentoLook },
  { id: "agenda", label: "Agenda", Look: AgendaLook },
  { id: "compact", label: "Compact", Look: CompactLook },
  { id: "pastel", label: "Pastel", Look: PastelLook },
  { id: "glass", label: "Glass", Look: GlassLook },
  { id: "notebook", label: "Notebook", Look: NotebookLook },
  { id: "mono", label: "Mono", Look: MonoLook },
  { id: "soft", label: "Soft", Look: SoftLook },
  { id: "ink", label: "Ink", Look: InkLook },
  { id: "midnight", label: "Midnight", Look: MidnightLook },
  { id: "editorial", label: "Editorial", Look: EditorialLook },
];
type LookId = string;
/** Looks drawn with the app's own tokens follow /settings' Light/Dark instead of ?mode. */
const FOLLOWS_APP = new Set(["current", "refined"]);
/** The first four mockups were drawn in one mode only. */
const ONE_MODE = new Set(["soft", "ink", "midnight", "editorial"]);
/** Looks that open dark unless ?mode=light. */
const DARK_FIRST = new Set(["bento-glass", "mono"]);

/** One pill of the segmented switch at the top, as a link. */
function Choice({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`btn flex min-h-11 flex-1 shrink-0 px-3 text-sm whitespace-nowrap ${
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
 * phone-sized box (390 wide), ?frame=full at full size. ?look= swaps Home for one
 * of the redesign mockups, filled with today's real numbers.
 */
export default async function PreviewPage({ searchParams }: PageProps<"/preview">) {
  const params = await searchParams;
  const frame: Frame = params.frame === "full" ? "full" : "phone";
  // ?birthday=1 plays the cat deployment's birthday party (src/lib/birthday.ts) whatever the date.
  const birthday = params.birthday === "1";
  const look = LOOKS.find((l) => l.id === params.look) ?? LOOKS[0];
  // ?mode=dark draws the mockups dark (looks on the app's tokens follow /settings instead).
  // ?slot=dawn|day|dusk|night shows the hero for another time of day.
  const slot = (["dawn", "day", "dusk", "night"] as const).find((x) => x === params.slot);
  const dark = params.mode === "dark" || (params.mode !== "light" && DARK_FIRST.has(look.id));
  const q = (f: Frame, b: boolean, l: LookId = look.id, d?: boolean) =>
    `/preview?frame=${f}${l !== "current" ? `&look=${l}` : ""}${b ? "&birthday=1" : ""}${d === undefined ? (l === look.id && params.mode ? `&mode=${params.mode}` : "") : `&mode=${d ? "dark" : "light"}`}`;
  const tz = await getTimeZone();
  const todayKey = dayKeyIn(tz);
  const sections = railSections();
  const alerts = getHomeAlerts(todayKey);
  const moods = getHomeMoods(sections.map((s) => s.kind), todayKey, hourIn(tz));

  let body: React.ReactNode;
  if (look.Look) {
    const Look = look.Look;
    body = (
      <div className={`${inter.variable} ${fraunces.variable} ${caveat.variable} ${frame === "phone" ? "h-full overflow-y-auto" : "overflow-hidden rounded-2xl"}`}>
        <Look snapshot={await getHomeSnapshot(todayKey, tz, slot)} theme={THEME} dark={dark} />
      </div>
    );
  } else {
    body = (
      <QuickRail sections={sections} alerts={alerts} moods={moods} contained={frame === "phone"}>
        <HomeContent tz={tz} todayKey={todayKey} framed={frame === "phone"} slot={slot} />
      </QuickRail>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Home preview</h1>
        <p className="text-sm text-ink-muted">
          Home as it is, or one of {LOOKS.length - 1} redesign ideas with today&apos;s real numbers. Refined is the planned tidy-up of today&apos;s
          look. On Current, swipe left anywhere (or tap the tab on the right
          edge) for the quick column.
        </p>
        <div className="flex gap-1 overflow-x-auto rounded-full bg-surface-muted p-1">
          {LOOKS.map((l) => (
            <Choice key={l.id} href={q(frame, birthday, l.id)} active={look.id === l.id}>
              {l.label}
            </Choice>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex flex-1 gap-1 rounded-full bg-surface-muted p-1 sm:max-w-sm">
            <Choice href={q("phone", birthday)} active={frame === "phone"}>
              Phone frame
            </Choice>
            <Choice href={q("full", birthday)} active={frame === "full"}>
              Full width
            </Choice>
          </div>
          {!FOLLOWS_APP.has(look.id) && !ONE_MODE.has(look.id) && (
            <div className="flex flex-1 gap-1 rounded-full bg-surface-muted p-1 sm:max-w-sm">
              <Choice href={q(frame, birthday, look.id, false)} active={!dark}>
                Light
              </Choice>
              <Choice href={q(frame, birthday, look.id, true)} active={dark}>
                Dark
              </Choice>
            </div>
          )}
          <div className="flex flex-1 gap-1 rounded-full bg-surface-muted p-1 sm:max-w-sm">
            <Choice href={q(frame, false)} active={!birthday}>
              Normal day
            </Choice>
            <Choice href={q(frame, true)} active={birthday}>
              Birthday 🎂
            </Choice>
          </div>
        </div>
      </div>

      {frame === "phone" ? (
        // An iPhone-sized screen; Home scrolls inside it like on the phone.
        <div className="relative mx-auto h-[796px] w-[390px] max-w-full overflow-hidden rounded-[2.5rem] border-8 border-foreground/80 bg-background shadow-xl">
          {birthday && <BirthdayParty todayKey={todayKey} note={birthdayNote()} force contained />}
          {body}
        </div>
      ) : (
        <>
          {birthday && <BirthdayParty todayKey={todayKey} note={birthdayNote()} force />}
          {body}
        </>
      )}
    </div>
  );
}
