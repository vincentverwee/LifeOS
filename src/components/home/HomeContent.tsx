import Link from "next/link";
import { Suspense } from "react";
import { weekdayOf } from "@/lib/reminders/schedule";
import { getFactOfTheDay } from "@/lib/funFacts";
import { Mascot } from "@/components/icons/Mascot";
import { TopRow } from "@/components/Navigation";
import { HomeWeather } from "@/components/home/HomeWeather";
import { FeatureTile, greeting, HOME_SECTIONS, hourIn, TileSkeleton } from "@/components/home/TileBodies";
import { fraunces } from "@/components/home/fonts";
import { heroPhoto, sectionPhoto, slotOf, type DaySlot } from "@/lib/homePhotos";
import { logout } from "@/lib/actions/auth";
import { authDisabled } from "@/lib/authToken";

/** Sky colours for when there's no hero photo for this build/time. */
const FALLBACK_SKY = "linear-gradient(to bottom, #1d2a22, #3b5a44 60%, #6f8f6a)";

/**
 * Everything on Home: a photo hero for the time of day (date, greeting, fact, weather),
 * then the sections as glass tiles, one per row (two columns on wide screens),
 * the Sunday review card and a few links. `framed` = inside /preview's phone frame,
 * where the app header stays and the hero only bleeds to the frame's edges.
 */
export function HomeContent({ tz, todayKey, framed = false, slot }: { tz: string; todayKey: string; framed?: boolean; slot?: DaySlot }) {
  const hour = hourIn(tz);
  const fact = getFactOfTheDay(todayKey, hour >= 12);
  // `slot` lets /preview show another time of day's photo.
  const hero = heroPhoto(slot ?? slotOf(hour), todayKey);
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${todayKey}T00:00:00Z`));

  const tile = (s: (typeof HOME_SECTIONS)[number], i: number) => (
    <li key={s.kind}>
      <FeatureTile href={s.href} name={s.name} kind={s.kind} todayKey={todayKey} hour={hour} index={i} wide photo={sectionPhoto(s.kind)}>
        <Suspense fallback={<TileSkeleton />}>{s.render(todayKey)}</Suspense>
      </FeatureTile>
    </li>
  );

  return (
    <div className={`${fraunces.variable} flex flex-col gap-6`}>
      <header
        {...(framed ? {} : { "data-home-hero": "" })}
        // Edge to edge of the window (not just the content column), so laptops get no dark bands beside it.
        className={`relative overflow-hidden ${framed ? "-mx-4 -mt-4" : "left-1/2 -mt-5 w-screen -translate-x-1/2 sm:-mt-10"}`}
      >
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local stock photo (public/hero), decorative
          <img src={hero.src} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: hero.position }} />
        ) : (
          <span aria-hidden="true" className="absolute inset-0" style={{ background: FALLBACK_SKY }} />
        )}
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.25) 65%, var(--background))",
          }}
        />
        <div
          className={`relative mx-auto flex min-h-[340px] max-w-3xl flex-col px-6 pb-16 text-white ${framed ? "" : "sm:min-h-[440px]"}`}
          style={{
            paddingTop: framed ? "1rem" : "calc(env(safe-area-inset-top) + 0.75rem)",
          }}
        >
          <TopRow onPhoto />
          <div className="mt-auto pt-10 [text-shadow:0_1px_12px_rgba(0,0,0,0.35)]">
            <p className="text-sm opacity-90">{dateLabel}</p>
            <h1 className="font-[family-name:var(--font-fraunces)] text-[40px] leading-tight font-medium tracking-tight">{greeting(tz)}</h1>
            <p className="mt-1 max-w-[34ch] text-sm leading-snug italic opacity-90">{fact.text}</p>
            {/* the weather line is written for the page; on the photo it goes white */}
            <div className="[&_*]:!text-white/90">
              <HomeWeather />
            </div>
            <span aria-hidden="true" className="mt-3 block h-[3px] w-12 rounded-full bg-accent" />
          </div>
        </div>
      </header>

      {/* One tile per row on phones; two columns once there's room (a container query, so /preview's frame lays out like a phone). */}
      <div className="@container relative -mt-14">
        <ul className="grid grid-cols-1 gap-3 @xl:grid-cols-2">
          {tile(HOME_SECTIONS[0], 0)}

          {/* The weekly review: a card on Sundays only (the link under the tiles is always there). */}
          {weekdayOf(todayKey) === 0 && (
            <li>
              <Link href="/review" className="glass-card tap flex h-full items-center gap-4 p-4 hover:border-primary">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-muted text-primary">
                  <Mascot size={40} decorative />
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="text-[17px] font-semibold text-foreground">Your week</span>
                  <span className="text-sm text-ink-muted">This week, in a few taps.</span>
                </span>
                <span aria-hidden="true" className="text-xl text-ink-muted">
                  ›
                </span>
              </Link>
            </li>
          )}

          {HOME_SECTIONS.slice(1).map((s, i) => tile(s, i + 1))}
        </ul>
      </div>

      <div className="flex justify-center gap-2">
        <Link href="/review" className="btn btn-ghost inline-flex min-h-11 px-5 text-sm">
          Your week
        </Link>
        <Link href="/settings" className="btn btn-ghost inline-flex min-h-11 px-5 text-sm">
          Settings
        </Link>
        {!authDisabled() && (
          <form action={logout}>
            <button type="submit" className="btn btn-ghost inline-flex min-h-11 px-5 text-sm">
              Log out
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
