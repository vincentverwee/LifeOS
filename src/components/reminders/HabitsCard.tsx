"use client";

import { useOptimistic, useState } from "react";
import {
  Apple, BookOpen, ChevronLeft, ChevronRight, Droplet, Footprints, Heart, Leaf, MessageCircle, Moon, Pencil, PhoneOff, Sun,
  type LucideIcon,
} from "lucide-react";
import { HABIT_GROUPS, HABITS, type HabitKey } from "@/lib/reminders/habits";
import { setHabitsOn, toggleHabitToday } from "@/lib/actions/habits";
import { useQuickAction } from "@/components/people/useQuickAction";
import { SheepCheckbox } from "./SheepCheckbox";
import { GROUP_STYLE } from "./habitStyle";

const ICON: Record<HabitKey, LucideIcon> = {
  sleep: Moon,
  move: Footprints,
  "fruit-veg": Apple,
  water: Droplet,
  daylight: Sun,
  calm: Leaf,
  "good-things": Pencil,
  learn: BookOpen,
  conversation: MessageCircle,
  kindness: Heart,
  "social-media": PhoneOff,
};

/** Today's daily habits on To do: ticks stay in place and come back fresh tomorrow. The arrow flips to yesterday for a forgotten tick. */
export function HabitsCard({ done, yesterdayDone, canYesterday }: { done: string[]; yesterdayDone: string[]; canYesterday: boolean }) {
  const { run, error } = useQuickAction();
  const [yesterday, setYesterday] = useState(false);
  const [days, setDays] = useOptimistic({ today: new Set(done), yesterday: new Set(yesterdayDone) });
  const ticked = yesterday ? days.yesterday : days.today;

  function toggle(key: string) {
    const next = !ticked.has(key);
    const forYesterday = yesterday;
    run(async () => {
      const set = new Set(ticked);
      if (next) set.add(key);
      else set.delete(key);
      setDays(forYesterday ? { ...days, yesterday: set } : { ...days, today: set });
      await toggleHabitToday(key, next, forYesterday);
    });
  }

  const count = HABITS.filter((h) => ticked.has(h.key)).length;
  const dayWord = yesterday ? "yesterday" : "today";

  return (
    <section className="card flex flex-col gap-3" aria-label="Daily habits">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-medium text-foreground">{yesterday ? "Yesterday's habits" : "Daily habits"}</h2>
          <p className="text-sm text-ink-muted">
            <span className="font-mono font-semibold tabular-nums text-foreground">{count}</span> of {HABITS.length} {dayWord}
          </p>
        </div>
        {canYesterday && (
          // 44 px tap area around a smaller visible pill
          <button
            type="button"
            onClick={() => setYesterday(!yesterday)}
            className="-my-1 flex min-h-11 shrink-0 items-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="btn btn-outline inline-flex h-8 gap-1 px-3 text-sm">
              {yesterday ? (
                <>
                  Today
                  <ChevronRight aria-hidden="true" className="-mr-1 h-4 w-4" />
                </>
              ) : (
                <>
                  <ChevronLeft aria-hidden="true" className="-ml-1 h-4 w-4" />
                  Yesterday
                </>
              )}
            </span>
          </button>
        )}
      </div>
      <div className="h-2 rounded-full bg-surface-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-tag-green transition-[width]" style={{ width: `${(count / HABITS.length) * 100}%` }} />
      </div>
      {HABIT_GROUPS.map((group) => {
        const { icon: GroupIcon, color } = GROUP_STYLE[group.key];
        return (
          <div key={group.key}>
            <h3 className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <GroupIcon aria-hidden="true" className={`h-4 w-4 ${color}`} />
              {group.label}
            </h3>
            <ul className="mt-1 flex flex-col">
              {HABITS.filter((h) => h.group === group.key).map((h) => {
                const Icon = ICON[h.key];
                return (
                  <li key={h.key} className="flex items-center gap-3 py-1">
                    <SheepCheckbox checked={ticked.has(h.key)} label={h.label} onChange={() => toggle(h.key)} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm text-foreground">
                        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-muted" />
                        {h.label}
                      </p>
                      <p className="text-xs text-ink-muted">{h.hint}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {error && <p className="text-sm text-critical">{error}</p>}
      <HabitsSwitch on />
    </section>
  );
}

/** The on/off switch: off shows a small invite card, on sits at the bottom of the habits card. */
export function HabitsSwitch({ on }: { on: boolean }) {
  const { run, error } = useQuickAction();
  const [checked, setChecked] = useOptimistic(on);

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() =>
          run(async () => {
            setChecked(!checked);
            await setHabitsOn(!checked);
          })
        }
        className="tap -mx-3 flex min-h-11 items-center gap-3 rounded-xl px-3 text-left"
      >
        <span
          aria-hidden="true"
          className={`relative h-6 w-10 shrink-0 rounded-full transition-colors motion-reduce:transition-none ${
            checked ? "bg-primary" : "bg-surface-muted ring-1 ring-border"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-[left] motion-reduce:transition-none ${
              checked ? "left-[1.125rem]" : "left-0.5"
            }`}
          />
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-medium text-foreground">Daily habits</span>
          <span className="text-xs text-ink-muted">
            {checked ? "Comes back fresh every day" : `${HABITS.length} small things that make you happier and healthier`}
          </span>
        </span>
      </button>
      {error && <p className="text-sm text-critical">{error}</p>}
    </>
  );
}
