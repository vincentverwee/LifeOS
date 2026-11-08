"use client";

import Link from "next/link";
import { Suspense, use, useEffect, useRef, useState, type ReactNode } from "react";
import { Mascot, type MascotKind } from "@/components/icons/Mascot";

/** `name` is the mascot's (Penny, Hops…); `section` and `href` the page it opens. */
export type QuickSection = { kind: MascotKind; name: string; section: string; href: string };

/** The red dot on a section that needs something; the list arrives after the page. */
function AlertDot({ kind, alerts }: { kind: MascotKind; alerts: Promise<MascotKind[]> }) {
  if (!use(alerts).includes(kind)) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-critical">
      <span className="sr-only">, needs attention</span>
    </span>
  );
}

/** A swipe must travel this far sideways (and mostly sideways) to count. */
const SWIPE = 50;

/**
 * A column of section mascots that slides in from the right (where the thumb
 * is): swipe left anywhere on the page (or tap the edge tab) to show it, swipe
 * right (or tap outside, Esc) to hide it.
 * Tapping a mascot opens its section, like tapping its tile.
 * `contained` keeps it inside its own box (the phone frame on /preview), with
 * the children scrolling in there; otherwise it covers the screen's left side.
 */
export function QuickRail({
  sections,
  alerts,
  contained = false,
  children,
}: {
  sections: QuickSection[];
  /** Sections that need something today (red dots), loaded without holding up the page. */
  alerts: Promise<MascotKind[]>;
  contained?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY };
    };
    const onEnd = (e: TouchEvent) => {
      const s = start.current;
      start.current = null;
      const box = root.current?.getBoundingClientRect();
      if (!s || !box) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      // A scroll, not a swipe.
      if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      // In the /preview phone frame only swipes inside the frame count.
      if (contained && (s.x < box.left || s.x > box.right || s.y < box.top || s.y > box.bottom)) return;
      setOpen(dx < 0);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("keydown", onKey);
    };
  }, [contained]);

  const place = contained ? "absolute" : "fixed";

  return (
    <div ref={root} className={contained ? "relative h-full overflow-hidden" : undefined}>
      {contained ? <div className="h-full overflow-y-auto px-4 py-4">{children}</div> : children}

      {/* the tab on the right edge (laptops, and a hint on phones) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Show sections"
        aria-expanded={open}
        className={`${place} top-1/2 right-0 z-30 flex h-20 w-5 -translate-y-1/2 items-center justify-center rounded-l-xl bg-primary/25 text-primary hover:bg-primary/40 ${
          open ? "pointer-events-none opacity-0" : ""
        }`}
      >
        <span aria-hidden="true" className="text-sm">
          ‹
        </span>
      </button>

      {/* backdrop: tap to close */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={`${place} inset-0 z-40 bg-black/25 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <nav
        aria-label="Sections"
        aria-hidden={!open}
        inert={!open}
        className={`${place} top-0 right-0 bottom-0 z-50 flex w-20 flex-col items-center gap-1 overflow-y-auto border-l border-border bg-surface py-3 shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={
          contained
            ? undefined
            : { paddingTop: "max(env(safe-area-inset-top), 0.75rem)", paddingBottom: "env(safe-area-inset-bottom)" }
        }
      >
        {sections.map((s) => (
          <Link
            key={s.kind}
            href={s.href}
            onClick={() => setOpen(false)}
            className="tap flex w-full flex-col items-center gap-0.5 rounded-xl py-1.5"
          >
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-primary">
              <Mascot kind={s.kind} size={44} decorative />
              <span className="sr-only">
                {s.name}: {s.section}
              </span>
              <Suspense fallback={null}>
                <AlertDot kind={s.kind} alerts={alerts} />
              </Suspense>
            </span>
            <span aria-hidden="true" className="px-1 text-center text-[11px] leading-tight text-ink-muted">
              {s.name}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
