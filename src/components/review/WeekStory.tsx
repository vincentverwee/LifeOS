"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mascot } from "@/components/icons/Mascot";
import { saveWeekWin, type WinState } from "@/lib/actions/review";
import { formatCurrency, formatHours } from "@/lib/format";
import { MOODS } from "@/lib/diary/onThisDay";
import { WIN_MAX, type StoryCard } from "@/lib/review/week";

type Props = {
  cards: StoryCard[];
  week: string;
  label: string;
  prevWeek: string;
  nextWeek: string | null;
  win: string | null;
};

/** Swipe at least this far down to close. */
const CLOSE_SWIPE = 90;

/**
 * The weekly review as full-screen cards: tap the right of the screen (or →)
 * for the next card, the left (or ←) to go back; ✕, Esc or a swipe down closes.
 */
export function WeekStory({ cards, week, label, prevWeek, nextWeek, win }: Props) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const card = cards[index];

  const go = useCallback(
    (step: number) => {
      setDirection(step);
      setIndex((i) => Math.min(cards.length - 1, Math.max(0, i + step)));
    },
    [cards.length]
  );
  const close = useCallback(() => router.push("/"), [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, close]);

  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    // Buttons, links and the win field work as themselves.
    if ((e.target as HTMLElement).closest("a, button, input, form, [data-no-tap]")) return;
    const { left, width } = e.currentTarget.getBoundingClientRect();
    go(e.clientX - left < width / 3 ? -1 : 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 0.75rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 1rem)",
      }}
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const start = touch.current;
        touch.current = null;
        if (!start) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        if (dy > CLOSE_SWIPE && Math.abs(dx) < dy / 2) close();
      }}
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-4">
        <div className="flex gap-1" aria-hidden="true">
          {cards.map((c, i) => (
            <span key={c.key} className={`h-1 flex-1 rounded-full ${i <= index ? "bg-primary" : "bg-surface-muted"}`} />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-ink-muted">Week of {label}</p>
          <Link href="/" aria-label="Close" className="btn btn-ghost -mr-2 inline-flex h-11 w-11 items-center justify-center text-xl">
            ✕
          </Link>
        </div>
      </div>

      <div className="relative mx-auto flex w-full max-w-md flex-1 cursor-pointer select-none flex-col overflow-hidden px-4" onClick={onTap}>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.section
            key={card.key}
            className="flex flex-1 flex-col items-center justify-center gap-5 py-4 text-center"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 28 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -28 * direction }}
            transition={{ duration: 0.18 }}
            aria-live="polite"
          >
            <CardBody card={card} week={week} win={win} prevWeek={prevWeek} nextWeek={nextWeek} />
          </motion.section>
        </AnimatePresence>
      </div>

      <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 text-sm text-ink-muted">
        <button type="button" onClick={() => go(-1)} disabled={index === 0} className="btn btn-ghost inline-flex min-h-11 px-4">
          ‹ Back
        </button>
        <span>
          {index + 1} / {cards.length}
        </span>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index === cards.length - 1}
          className="btn btn-ghost inline-flex min-h-11 px-4"
        >
          Next ›
        </button>
      </div>
    </div>
  );
}

function CardBody({
  card,
  week,
  win,
  prevWeek,
  nextWeek,
}: {
  card: StoryCard;
  week: string;
  win: string | null;
  prevWeek: string;
  nextWeek: string | null;
}) {
  return (
    <>
      <Mascot kind={card.kind} size={136} className="text-primary" decorative />
      <div className="flex flex-col items-center gap-2">
        {card.speaker && <p className="text-xs font-semibold tracking-wide text-primary uppercase">{card.speaker}</p>}
        <p className="rounded-2xl bg-surface-muted px-4 py-3 text-lg leading-snug text-foreground">{card.line}</p>
        {card.quote && <p className="max-w-xs text-base text-foreground italic">“{card.quote}”</p>}
      </div>

      {card.big.length > 0 && (
        <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-3">
          {card.big.map((b) =>
            b.label ? (
              <div key={b.value + b.label} className="flex flex-col items-center">
                <span className="text-3xl font-semibold text-foreground">{b.value}</span>
                <span className="text-sm text-ink-muted">{b.label}</span>
              </div>
            ) : (
              <span key={b.value} className="basis-full text-sm text-ink-muted">
                {b.value}
              </span>
            )
          )}
        </div>
      )}

      {card.bars && <Bars bars={card.bars} />}
      {card.moods && <Moods moods={card.moods} />}

      {card.list && card.list.length > 0 && (
        <ul className="flex max-w-sm flex-wrap justify-center gap-1.5">
          {card.list.map((item) => (
            <li key={item} className="rounded-full bg-surface-muted px-3 py-1 text-sm text-foreground">
              {item}
            </li>
          ))}
        </ul>
      )}

      {card.outro && <Outro week={week} win={win} prevWeek={prevWeek} nextWeek={nextWeek} />}
    </>
  );
}

function Bars({ bars }: { bars: NonNullable<StoryCard["bars"]> }) {
  const max = Math.max(...bars.values, bars.goal ?? 0) || 1;
  const fmt = (n: number) => (bars.format === "money" ? formatCurrency(n) : formatHours(n));
  return (
    <div className="w-full max-w-xs">
      <div className="relative flex h-24 items-end gap-1.5">
        {bars.goal !== undefined && bars.goal > 0 && (
          <span
            aria-hidden="true"
            className="absolute inset-x-0 border-t border-dashed border-ink-muted/60"
            style={{ bottom: `${(bars.goal / max) * 100}%` }}
          />
        )}
        {bars.values.map((v, i) => (
          <span
            key={bars.labels[i]}
            title={`${bars.labels[i]}: ${fmt(v)}`}
            className="flex-1 rounded-t-md bg-primary/85"
            style={{ height: `${Math.max(v > 0 ? 4 : 1, (v / max) * 100)}%`, opacity: v > 0 ? 1 : 0.25 }}
          />
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {bars.labels.map((l) => (
          <span key={l} className="flex-1 text-center text-xs text-ink-muted">
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function Moods({ moods }: { moods: (number | null)[] }) {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className="flex gap-2" aria-label="Mood per day">
      {moods.map((m, i) => {
        const mood = MOODS.find((x) => x.value === m);
        return (
          <div key={labels[i]} className="flex flex-col items-center gap-0.5">
            <span className="text-2xl" title={mood?.label ?? "No mood"}>
              {mood?.face ?? "·"}
            </span>
            <span className="text-xs text-ink-muted">{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function Outro({ week, win, prevWeek, nextWeek }: { week: string; win: string | null; prevWeek: string; nextWeek: string | null }) {
  const [state, action, pending] = useActionState<WinState, FormData>(saveWeekWin, null);
  return (
    <div className="flex w-full max-w-sm flex-col gap-4" data-no-tap>
      <form action={action} className="flex flex-col gap-2">
        <input type="hidden" name="week" value={week} />
        <input
          name="win"
          defaultValue={win ?? ""}
          maxLength={WIN_MAX}
          placeholder="Finally finished that essay…"
          aria-label="Win of the week"
          className="min-h-11 rounded-xl border border-border bg-surface px-3 text-foreground"
        />
        <button type="submit" disabled={pending} className="btn btn-primary inline-flex min-h-11 justify-center px-5 text-sm font-semibold">
          {pending ? "Saving…" : "Save the win"}
        </button>
        {state?.ok === true && <p className="text-sm text-positive-text">{state.win ? "Saved. Well done!" : "Cleared."}</p>}
        {state?.ok === false && <p className="text-sm text-critical">{state.error}</p>}
      </form>
      <div className="flex justify-between gap-2">
        <Link href={`/review?week=${prevWeek}`} className="btn btn-outline inline-flex min-h-11 flex-1 justify-center px-3 text-sm">
          ‹ Week before
        </Link>
        {nextWeek && (
          <Link href={`/review?week=${nextWeek}`} className="btn btn-outline inline-flex min-h-11 flex-1 justify-center px-3 text-sm">
            Week after ›
          </Link>
        )}
      </div>
      <Link href="/" className="btn btn-ghost inline-flex min-h-11 justify-center px-5 text-sm">
        Done
      </Link>
    </div>
  );
}
