"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { Mascot, type MascotAnimal, type MascotKind, type Mood } from "@/components/icons/Mascot";

const BUBBLE_MS = 3200;

/**
 * A mascot that's alive: it bobs (slower when sleepy), blinks now and then, and on a tap
 * bounces (wobbles when worried) and says its line in a small bubble. Idle motion is off
 * with reduced motion; the bubble still shows. `delay` (s) keeps tiles out of step.
 * The tap never reaches a link around it, so it can sit on a tile whose card opens the section.
 */
export function LiveMascot({
  kind,
  mood = "default",
  name,
  line,
  animal,
  size = 52,
  delay = 0,
}: {
  kind: MascotKind;
  mood?: Mood;
  name: string;
  line: string;
  animal?: MascotAnimal;
  size?: number;
  delay?: number;
}) {
  const [talking, setTalking] = useState(false);
  const [taps, setTaps] = useState(0);
  const [reacting, setReacting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function onTap(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setTaps((n) => n + 1);
    setReacting(true);
    setTalking(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTalking(false), BUBBLE_MS);
  }

  return (
    <span className="relative z-10 inline-flex">
      <button
        type="button"
        onClick={onTap}
        aria-label={`${name}: ${line}`}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-muted text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span
          key={taps}
          data-mood={mood}
          style={{ "--mascot-delay": `${-delay}s` } as CSSProperties}
          className={`mascot-live ${reacting ? (mood === "worried" ? "mascot-wobble" : "mascot-bounce") : ""}`}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) setReacting(false);
          }}
        >
          <Mascot kind={kind} mood={mood} animal={animal} size={size} decorative />
        </span>
      </button>
      {talking && (
        <span
          role="status"
          className="animate-pop-in pointer-events-none absolute top-1/2 left-full z-20 ml-2 w-max max-w-52 origin-left -translate-y-1/2 rounded-2xl border border-border bg-surface px-3 py-2 text-sm leading-snug text-foreground shadow-md"
        >
          {line}
        </span>
      )}
    </span>
  );
}
