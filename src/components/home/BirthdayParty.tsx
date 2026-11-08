"use client";

import { useEffect, useState } from "react";
import { Mascot } from "@/components/icons/Mascot";
import { birthdaySeenKey, isBirthday } from "@/lib/birthday";

/** The note on the card: paragraphs, the last one is the signature. It comes from the server-only
 *  BIRTHDAY_NOTE env var (see birthdayNote() in src/lib/birthday.ts), never from the public repo. */
export type BirthdayNote = string[];

// Fixed party colours (not theme tokens): it's always pink, even on a sheep build or in dark mode.
const INK = "#8e2a58";
const PINK = "#b83a72";
const CONFETTI_COLORS = ["#b83a72", "#e86fa5", "#f7a8c9", "#ffd166", "#c45aa8", "#ffffff", "#ff8fab", "#ffb3c6"];
const PIECES = 90;

/** Deterministic 0–1 "random" per index and salt, so server and client agree and it looks scattered. */
function rand(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type Piece = { left: number; size: number; tall: number; round: boolean; color: string; dur: number; delay: number; drift: number; spin: number; restY: number };

const PIECE_LIST: Piece[] = (() => {
  return Array.from({ length: PIECES }, (_, i) => {
    const size = 6 + rand(i, 1) * 8;
    return {
      left: rand(i, 2) * 100,
      size,
      tall: rand(i, 3) > 0.5 ? size * 1.8 : size,
      round: rand(i, 4) > 0.75,
      color: CONFETTI_COLORS[Math.floor(rand(i, 5) * CONFETTI_COLORS.length)],
      dur: 3 + rand(i, 6) * 3,
      delay: rand(i, 7) * 2.5,
      drift: (rand(i, 8) - 0.5) * 120,
      spin: (rand(i, 9) > 0.5 ? 1 : -1) * (360 + rand(i, 10) * 720),
      restY: rand(i, 11) * 100,
    };
  });
})();

/** Dancing cats in party hats: size, dance speed, delay. */
const CATS = [
  { size: 64, dur: 0.9, delay: 0.1 },
  { size: 84, dur: 0.7, delay: 0.35 },
  { size: 104, dur: 0.8, delay: 0 },
  { size: 84, dur: 0.75, delay: 0.25 },
  { size: 64, dur: 0.85, delay: 0.45 },
];

function Party({ note, contained, onClose }: { note: BirthdayNote; contained: boolean; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Happy birthday"
      onClick={onClose}
      className={`${contained ? "absolute" : "fixed"} inset-0 z-[60] overflow-hidden`}
      style={
        {
          color: INK,
          background: "radial-gradient(ellipse at 50% 30%, #fff0f6 0%, #fcd3e4 55%, #f5a9c9 100%)",
          "--color-wool": "#ffffff",
        } as React.CSSProperties
      }
    >
      {/* confetti */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {PIECE_LIST.map((p, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={
              {
                left: `${p.left}%`,
                width: p.size,
                height: p.tall,
                background: p.color,
                borderRadius: p.round ? "9999px" : "2px",
                animationDuration: `${p.dur}s`,
                animationDelay: `${p.delay}s`,
                "--drift": `${p.drift}px`,
                "--spin": `${p.spin}deg`,
                "--rest-y": `${p.restY}%`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative flex h-full flex-col items-center justify-center gap-5 overflow-y-auto px-4 py-8 text-center">
        <h2 className="party-pop text-5xl leading-tight font-extrabold tracking-tight sm:text-6xl" style={{ color: PINK }}>
          Happy
          <br />
          birthday!
        </h2>

        <div aria-hidden="true" className="flex items-end justify-center">
          {CATS.map((c, i) => (
            <span
              key={i}
              className="cat-dance -mx-2 inline-block"
              style={{ animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s`, "--tilt": i % 2 ? "-10deg" : "10deg" } as React.CSSProperties}
            >
              <Mascot kind="people" mood="happy" animal="cat" size={c.size} decorative />
            </span>
          ))}
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          className="party-rise w-full max-w-sm rounded-3xl bg-white/90 p-5 text-left shadow-xl backdrop-blur"
        >
          {note.length > 0 && (
            <div className="mb-4 flex flex-col gap-3 text-base leading-relaxed">
              {note.map((line, i) =>
                i === note.length - 1 && note.length > 1 ? (
                  <p key={i} className="text-right font-semibold" style={{ color: PINK }}>
                    {line}
                  </p>
                ) : (
                  <p key={i}>{line}</p>
                ),
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn flex min-h-11 w-full text-base font-semibold text-white"
            style={{ background: PINK }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Birthday party (cat deployment, see src/lib/birthday.ts): on the day, the first Home visit on
 * a device plays the overlay; afterwards a card on Home can replay it. `force` plays it on mount
 * whatever the date (/preview?birthday=1), `contained` keeps it inside the phone frame.
 */
export function BirthdayParty({
  todayKey,
  note,
  force = false,
  contained = false,
}: {
  todayKey: string;
  note: BirthdayNote;
  force?: boolean;
  contained?: boolean;
}) {
  const [open, setOpen] = useState(force);
  const today = isBirthday(todayKey);

  useEffect(() => {
    if (force || !today) return;
    const key = birthdaySeenKey(todayKey);
    let seen = false;
    try {
      seen = localStorage.getItem(key) === "1";
      localStorage.setItem(key, "1");
    } catch {
      // private mode / blocked storage: just play it
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one read of this device's storage after mount
    if (!seen) setOpen(true);
  }, [force, today, todayKey]);

  if (open) return <Party note={note} contained={contained} onClose={() => setOpen(false)} />;

  if (force) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`btn ${contained ? "absolute" : "fixed"} bottom-4 left-1/2 z-[60] min-h-11 -translate-x-1/2 px-5 text-sm font-semibold text-white shadow-lg`}
        style={{ background: PINK }}
      >
        🎉 Replay party
      </button>
    );
  }

  if (!today) return null;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="tap mb-6 flex w-full items-center gap-3 rounded-2xl p-4 text-left"
      style={{ background: "#fcd3e4", color: INK, "--color-wool": "#ffffff" } as React.CSSProperties}
    >
      <Mascot kind="people" mood="happy" animal="cat" size={48} decorative />
      <span className="flex flex-1 flex-col">
        <span className="text-lg font-semibold">Happy birthday! 🎂</span>
        <span className="text-sm">Tap to see the party again.</span>
      </span>
    </button>
  );
}
