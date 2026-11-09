"use client";

import Link from "next/link";
import { Suspense, use, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Mascot, type MascotKind } from "@/components/icons/Mascot";
import type { MascotMood } from "@/lib/mascotMood";

type Moods = Partial<Record<MascotKind, MascotMood>>;

/** `name` is the mascot's (Penny, Hops…); `section` and `href` the page it opens. */
export type QuickSection = {
  kind: MascotKind;
  name: string;
  section: string;
  href: string;
};

/** The red dot on a section that needs something; the list arrives after the page. */
function AlertDot({ kind, alerts }: { kind: MascotKind; alerts: Promise<MascotKind[]> }) {
  if (!use(alerts).includes(kind)) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-critical">
      <span className="sr-only">, needs attention</span>
    </span>
  );
}

/** A section's mascot in today's mood (the same as its Home tile), once the moods arrive. */
function RailMascot({ kind, moods }: { kind: MascotKind; moods: Promise<Moods> }) {
  return <Mascot kind={kind} mood={use(moods)[kind]?.mood} size={44} decorative />;
}

/** Pages where the layout's rail stays out of the way. */
const GLOBAL_OFF = ["/preview", "/review", "/login", "/recipes/swipe", "/workouts/session"];

/** Touches that start in these keep their own sideways gestures (maps, the recipe deck, the review story). */
const OWN_GESTURES = "[data-no-rail], .maplibregl-map";

/** A swipe must travel this far sideways (and mostly sideways) to count. */
const SWIPE = 50;

/**
 * A column of section mascots that slides in from the right (where the thumb
 * is): swipe left anywhere on the page (or tap the edge tab) to show it, swipe
 * right (or tap outside, Esc) to hide it.
 * Tapping a mascot opens its section, like tapping its tile.
 * `contained` keeps it inside its own box (the phone frame on /preview), with
 * the children scrolling in there; otherwise it covers the screen's right side.
 */
export function QuickRail({
  sections,
  alerts,
  moods,
  contained = false,
  global = false,
  children,
}: {
  sections: QuickSection[];
  /** Sections that need something today (red dots), loaded without holding up the page. Home only. */
  alerts?: Promise<MascotKind[]>;
  /** Each section mascot's mood today, loaded like the alerts. Home only. */
  moods?: Promise<Moods>;
  contained?: boolean;
  /**
   * The copy in the root layout: the same swipe on every other page (plain mascots,
   * no edge tab). Off on Home (it has its own, with moods and dots) and on pages
   * that are full-screen or have their own sideways swipes.
   */
  global?: boolean;
  children?: ReactNode;
}) {
  const pathname = usePathname();
  const off = global && (pathname === "/" || GLOBAL_OFF.some((p) => pathname.startsWith(p)));
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  /** The touch in progress: where it began, and once it's clear, which way it goes. */
  const touch = useRef<{
    x: number;
    y: number;
    mode: "swipe" | "scroll" | null;
  } | null>(null);

  useEffect(() => {
    const inBox = (x: number, y: number) => {
      const box = root.current?.getBoundingClientRect();
      return !!box && x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
    };
    /** A sideways-scrolling row (chips, a carousel) keeps its own swipes. */
    const inSideScroller = (el: EventTarget | null) => {
      for (let n = el instanceof Element ? el : null; n && n !== document.body; n = n.parentElement) {
        if (n.scrollWidth > n.clientWidth + 1) {
          const ox = getComputedStyle(n).overflowX;
          if (ox === "auto" || ox === "scroll") return true;
        }
      }
      return false;
    };
    const setDrag = (dx: number | null) => {
      const el = nav.current;
      if (!el) return;
      if (dx === null) {
        el.style.transform = "";
        el.style.transition = "";
        return;
      }
      el.style.transition = "none";
      el.style.transform = openRef.current ? `translateX(${Math.max(0, dx)}px)` : `translateX(calc(100% + ${Math.min(0, dx)}px))`;
    };

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      // In the /preview phone frame only touches inside the frame count.
      const ours =
        !off &&
        (!contained || inBox(t.clientX, t.clientY)) &&
        !inSideScroller(e.target) &&
        !(e.target instanceof Element && e.target.closest(OWN_GESTURES));
      touch.current = ours ? { x: t.clientX, y: t.clientY, mode: null } : null;
    };
    const onMove = (e: TouchEvent) => {
      const s = touch.current;
      // While the rail is open nothing behind it scrolls; the rail itself may.
      if (openRef.current && !(nav.current?.contains(e.target as Node) && s?.mode !== "swipe")) {
        if (e.cancelable) e.preventDefault();
      }
      if (!s) return;
      const t = e.touches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (s.mode === null && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
        s.mode = Math.abs(dx) > Math.abs(dy) ? "swipe" : "scroll";
      }
      if (s.mode === "swipe") {
        // Sideways: the page holds still and the rail follows the finger.
        if (e.cancelable) e.preventDefault();
        setDrag(dx);
      }
    };
    const onEnd = (e: TouchEvent) => {
      const s = touch.current;
      touch.current = null;
      if (!s || s.mode !== "swipe") return;
      setDrag(null);
      const dx = e.changedTouches[0].clientX - s.x;
      if (Math.abs(dx) >= SWIPE) setOpen(dx < 0);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
      window.removeEventListener("keydown", onKey);
    };
  }, [contained, off]);

  // The layout's copy stays mounted between pages: close it once a page changes.
  const [shownOn, setShownOn] = useState(pathname);
  if (shownOn !== pathname) {
    setShownOn(pathname);
    setOpen(false);
  }

  // No scrolling behind the open rail (wheel and scrollbars too, not just touch).
  useEffect(() => {
    if (!open) return;
    const el = contained ? scroller.current : document.documentElement;
    if (!el) return;
    const before = el.style.overflow;
    el.style.overflow = "hidden";
    return () => {
      el.style.overflow = before;
    };
  }, [open, contained]);

  const place = contained ? "absolute" : "fixed";
  if (off) return <>{children}</>;

  return (
    <div ref={root} className={contained ? "relative h-full overflow-hidden" : undefined}>
      {contained ? (
        <div ref={scroller} className="h-full overflow-y-auto px-4 py-4">
          {children}
        </div>
      ) : (
        children
      )}

      {/* the tab on the right edge (laptops, and a hint on phones); Home only */}
      {!global && (
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
      )}

      {/* backdrop: tap to close */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={`${place} inset-0 z-40 touch-none bg-black/25 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <nav
        ref={nav}
        aria-label="Sections"
        aria-hidden={!open}
        inert={!open}
        className={`${place} top-0 right-0 bottom-0 z-50 flex w-20 flex-col items-center gap-1 overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y border-l border-border bg-surface py-3 shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={
          contained
            ? undefined
            : {
                paddingTop: "max(env(safe-area-inset-top), 0.75rem)",
                paddingBottom: "env(safe-area-inset-bottom)",
              }
        }
      >
        {sections.map((s) => (
          <Link
            key={s.kind}
            href={s.href}
            onClick={() => setOpen(false)}
            aria-current={pathname.startsWith(s.href) ? "page" : undefined}
            className="tap flex w-full flex-col items-center gap-0.5 rounded-xl py-1.5"
          >
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-primary">
              <Suspense fallback={<Mascot kind={s.kind} size={44} decorative />}>
                {moods ? <RailMascot kind={s.kind} moods={moods} /> : <Mascot kind={s.kind} size={44} decorative />}
              </Suspense>
              <span className="sr-only">
                {s.name}: {s.section}
              </span>
              {alerts && (
                <Suspense fallback={null}>
                  <AlertDot kind={s.kind} alerts={alerts} />
                </Suspense>
              )}
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
