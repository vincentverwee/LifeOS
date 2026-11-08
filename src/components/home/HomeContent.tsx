import Link from "next/link";
import { Suspense } from "react";
import { weekdayOf } from "@/lib/reminders/schedule";
import { getFactOfTheDay } from "@/lib/funFacts";
import { Mascot } from "@/components/icons/Mascot";
import { SheepMark } from "@/components/icons/SheepMark";
import { HomeWeather } from "@/components/home/HomeWeather";
import { FeatureTile, greeting, HOME_SECTIONS, hourIn, TileSkeleton } from "@/components/home/TileBodies";
import { logout } from "@/lib/actions/auth";
import { authDisabled } from "@/lib/authToken";

/**
 * Everything on Home: greeting, the fact of the day, the Sunday review card and
 * every section's tile. The grid follows the space it gets (a container query), so the
 * phone frame on /preview lays out like a real phone.
 */
export function HomeContent({ tz, todayKey }: { tz: string; todayKey: string }) {
  const hour = hourIn(tz);
  const fact = getFactOfTheDay(todayKey, hour >= 12);
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${todayKey}T00:00:00Z`));

  return (
    <div className="@container flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-ink-muted">{dateLabel}</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{greeting(tz)}</h1>
        <HomeWeather />
      </div>

      <ul className="grid grid-cols-1 gap-3 @xl:grid-cols-2">
        <li>
          <div className="relative h-full min-h-40 overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground">
            <SheepMark className="pointer-events-none absolute -right-3 -bottom-3 h-24 w-24 opacity-15" />
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Fact of the day</h2>
              {fact.theme !== "Sheep" && fact.theme !== "Cats" && (
                <span className="rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-xs font-medium">
                  {fact.theme}
                </span>
              )}
            </div>
            <p className="relative mt-2 text-base leading-snug">{fact.text}</p>
          </div>
        </li>

        {/* The weekly review: a card on Sundays only (the link under the tiles is always there). */}
        {weekdayOf(todayKey) === 0 && (
          <li>
            <Link
              href="/review"
              className="tap flex h-full items-center gap-4 rounded-2xl border border-primary bg-surface p-5 hover:bg-surface-muted"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-primary">
                <Mascot size={44} decorative />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-xl font-semibold text-foreground">Your week</span>
                <span className="text-sm text-ink-muted">This week, in a few taps.</span>
              </span>
              <span aria-hidden="true" className="text-xl text-ink-muted">
                ›
              </span>
            </Link>
          </li>
        )}

        {HOME_SECTIONS.map((s, i) => (
          <li key={s.kind}>
            <FeatureTile href={s.href} name={s.name} kind={s.kind} todayKey={todayKey} hour={hour} index={i}>
              <Suspense fallback={<TileSkeleton />}>{s.render(todayKey)}</Suspense>
            </FeatureTile>
          </li>
        ))}
      </ul>

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
