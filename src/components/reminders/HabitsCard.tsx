"use client";

import { useOptimistic } from "react";
import {
  Apple, BookOpen, Droplet, Footprints, Heart, Leaf, MessageCircle, Moon, Pencil, PhoneOff, Sun,
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

/** Today's daily habits on To do: ticks stay in place and come back fresh tomorrow. */
export function HabitsCard({ done }: { done: string[] }) {
  const { run, error } = useQuickAction();
  const [ticked, setTicked] = useOptimistic(new Set(done));

  function toggle(key: string) {
    const next = !ticked.has(key);
    run(async () => {
      const set = new Set(ticked);
      if (next) set.add(key);
      else set.delete(key);
      setTicked(set);
      await toggleHabitToday(key, next);
    });
  }

  const count = HABITS.filter((h) => ticked.has(h.key)).length;

  return (
    <section className="card flex flex-col gap-3" aria-label="Daily habits">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-medium text-foreground">Daily habits</h2>
        <span className="text-sm text-ink-muted">
          <span className="font-mono font-semibold tabular-nums text-foreground">{count}</span> of {HABITS.length} today
        </span>
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
