import type { ReactNode } from "react";

/**
 * The props each section's mascot holds or wears (see Mascot.tsx). Every prop is
 * drawn around its own origin and placed on an anchor of the animal, so the same
 * drawing fits both the sheep and the cat. Same two tones as the mark:
 * currentColor (O) and --color-wool (W).
 */

export type MascotAnimal = "sheep" | "cat";

export type MascotKind =
  | "plain"
  | "budget"
  | "lessons"
  | "reminders"
  | "diary"
  | "beer"
  | "wardrobe"
  | "people"
  | "waypoint"
  | "recipes";

export const MASCOT_KINDS: MascotKind[] = [
  "plain",
  "budget",
  "lessons",
  "reminders",
  "diary",
  "beer",
  "wardrobe",
  "people",
  "waypoint",
  "recipes",
];

const O = "currentColor";
const W = "var(--color-wool)";

type Point = { x: number; y: number; s: number };

type Anchors = {
  /** Middle of where a hat sits. */
  top: Point;
  /** Pulled down over the head, for the beanie. */
  cap: Point;
  /** Lower right, for things held in front. */
  front: Point;
  /** Up and to the right of the head, for the map pin. */
  pin: Point;
  /** Just under the chin, for Penny's tie. */
  chin: Point;
  /** The eye centres and lens radius, for glasses. */
  eyes: { lx: number; rx: number; y: number; r: number };
  /** Colour that shows on the face: the sheep's face is dark, the cat's light. */
  faceInk: string;
};

const ANCHORS: Record<MascotAnimal, Anchors> = {
  sheep: {
    top: { x: 50, y: 13, s: 1 },
    cap: { x: 50, y: 22, s: 1.15 },
    front: { x: 77, y: 65, s: 1.35 },
    pin: { x: 81, y: 25, s: 1.25 },
    chin: { x: 50, y: 69.5, s: 1.2 },
    eyes: { lx: 42.4, rx: 57.6, y: 44.5, r: 5.6 },
    faceInk: W,
  },
  cat: {
    top: { x: 50, y: 25, s: 0.9 },
    cap: { x: 50, y: 28, s: 1 },
    front: { x: 77, y: 67, s: 1.35 },
    pin: { x: 83, y: 32, s: 1.25 },
    chin: { x: 50, y: 73, s: 1.02 },
    eyes: { lx: 39.5, rx: 60.5, y: 46, r: 6.8 },
    faceInk: O,
  },
};

function At({ p, rotate = 0, mirror, children }: { p: Point; rotate?: number; mirror?: boolean; children: ReactNode }) {
  return (
    <g transform={`translate(${p.x} ${p.y}) rotate(${rotate}) scale(${mirror ? -p.s : p.s} ${p.s})`}>{children}</g>
  );
}

/** A spot moved a little (away from the face). */
function nudge(p: Point, dx: number, dy: number): Point {
  return { ...p, x: p.x + dx, y: p.y + dy };
}

/** The same spot on the other side of the face. */
function leftOf(p: Point): Point {
  return { ...p, x: 100 - p.x };
}

/** Like the fleece: an outline pass, then the wool fill on top, so overlapping
 *  shapes (foam, chef-hat puffs) only keep their outer edge. */
function Outlined({ width, children }: { width: number; children: ReactNode }) {
  return (
    <>
      <g fill={O} stroke={O} strokeWidth={width} strokeLinejoin="round">
        {children}
      </g>
      <g fill={W}>{children}</g>
    </>
  );
}

function Coin() {
  return (
    <>
      <circle r="12" fill={W} stroke={O} strokeWidth="3" />
      <circle r="8.5" fill="none" stroke={O} strokeWidth="1.4" />
      <g fill="none" stroke={O} strokeLinecap="round">
        <path d="M4.2 -4.6 A5.6 5.6 0 1 0 4.2 4.6" strokeWidth="2.2" />
        <path d="M-6.5 -1.6 H1.5 M-6.5 1.6 H1.5" strokeWidth="1.6" />
      </g>
    </>
  );
}

/** Penny's tie: a knot and a pointed blade with one stripe, hanging from the chin. */
function Tie() {
  return (
    <g stroke={W} strokeWidth="1.2" strokeLinejoin="round">
      <path d="M-3.4 -0.8 H3.4 L2.4 3.6 H-2.4 Z" fill={O} />
      <path d="M-2.4 3.6 H2.4 L4.6 14 L0 18.5 L-4.6 14 Z" fill={O} />
      <path d="M-3.2 9.4 L3.6 6.8" fill="none" strokeWidth="1.1" strokeLinecap="round" />
    </g>
  );
}

function Pint() {
  return (
    <>
      <path d="M-8.5 -9 L8.5 -9 L6.5 14 L-6.5 14 Z" fill={W} stroke={O} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M-7.4 -4 L7.4 -4 L5.8 12.2 L-5.8 12.2 Z" fill={O} opacity="0.5" />
      <g fill={W}>
        <circle cx="-2" cy="6" r="0.9" />
        <circle cx="2.5" cy="2.5" r="0.9" />
        <circle cx="0.5" cy="9" r="0.9" />
      </g>
      <Outlined width={2.4}>
        <circle cx="-5.5" cy="-9.5" r="4.2" />
        <circle cx="0" cy="-12" r="4.8" />
        <circle cx="5.5" cy="-9.5" r="4.2" />
        <path d="M-8.5 -9.5 H8.5 V-5 H-8.5 Z" />
      </Outlined>
    </>
  );
}

function Notebook() {
  return (
    <>
      <rect x="-10" y="-12" width="20" height="24" rx="2.5" fill={W} stroke={O} strokeWidth="2.6" />
      <path d="M-6 -12 V12" stroke={O} strokeWidth="2" />
      <path d="M2 6 C-4.5 1.5 -3.5 -4.5 2 -1.5 C7.5 -4.5 8.5 1.5 2 6 Z" fill={O} />
    </>
  );
}

function AlarmClock() {
  return (
    <>
      {/* bells (half hidden behind the face) and the hammer between them */}
      <g fill={O}>
        <circle cx="-7.2" cy="-8.6" r="4.4" />
        <circle cx="7.2" cy="-8.6" r="4.4" />
        <rect x="-1.2" y="-14.5" width="2.4" height="4" rx="1" />
      </g>
      <path d="M-6.5 9 L-9 13 M6.5 9 L9 13" stroke={O} strokeWidth="2.4" strokeLinecap="round" />
      <circle r="10.5" fill={W} stroke={O} strokeWidth="2.6" />
      <path d="M0 0 V-6.2 M0 0 L4.2 2.4" fill="none" stroke={O} strokeWidth="1.9" strokeLinecap="round" />
      <circle r="1.3" fill={O} />
    </>
  );
}

function Mortarboard() {
  return (
    <>
      <path d="M-10 0 L-9 -7 L9 -7 L10 0 Q0 3 -10 0 Z" fill={O} />
      <path d="M0 -15 L21 -8.5 L0 -2 L-21 -8.5 Z" fill={O} stroke={O} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M-21 -8.5 L0 -2 L21 -8.5" fill="none" stroke={W} strokeWidth="1" strokeLinejoin="round" />
      <circle cx="0" cy="-8.5" r="1.3" fill={W} />
      <path d="M0 -8.5 Q12 -7 15 -4 L15 3" fill="none" stroke={O} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="13.5" y="2" width="3" height="5.5" rx="1" fill={O} />
    </>
  );
}

function Glasses({ a }: { a: Anchors }) {
  const { lx, rx, y, r } = a.eyes;
  return (
    <g fill="none" stroke={a.faceInk} strokeWidth="1.8" strokeLinecap="round">
      <circle cx={lx} cy={y} r={r} />
      <circle cx={rx} cy={y} r={r} />
      <path d={`M${lx + r} ${y} Q50 ${y - 3} ${rx - r} ${y}`} />
    </g>
  );
}

function PartyHat() {
  return (
    <>
      <path d="M-10 0 L10 0 L1 -19 Z" fill={W} stroke={O} strokeWidth="2.4" strokeLinejoin="round" />
      <g fill={O}>
        <circle cx="-2" cy="-5" r="1.6" />
        <circle cx="4" cy="-3" r="1.4" />
        <circle cx="3" cy="-11" r="1.4" />
        <circle cx="-0.5" cy="-13.5" r="1.1" />
        <circle cx="1" cy="-20" r="3.2" />
      </g>
    </>
  );
}

function ChefHat() {
  return (
    <>
      <Outlined width={2.6}>
        <circle cx="-8" cy="-10" r="6" />
        <circle cx="0" cy="-13.5" r="7" />
        <circle cx="8" cy="-10" r="6" />
        <path d="M-10 -9 H10 V0 H-10 Z" />
      </Outlined>
      <g fill="none" stroke={O} strokeWidth="1.3" strokeLinecap="round">
        <path d="M-10 -3.5 H10" />
        <path d="M-3.5 -8.5 V-5 M3.5 -8.5 V-5" opacity="0.6" />
      </g>
    </>
  );
}

function FoldedMap() {
  return (
    <>
      <path
        d="M-12 -9 L-4 -11 L4 -8 L12 -10 L12 10 L4 12 L-4 9 L-12 11 Z"
        fill={W}
        stroke={O}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M-4 -11 V9 M4 -8 V12" fill="none" stroke={O} strokeWidth="1.3" />
      <path d="M-8.5 6 Q-6 -1 -1 1.5 T7.5 -4" fill="none" stroke={O} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
      <path d="M6 -6.5 L9 -3.5 M9 -6.5 L6 -3.5" stroke={O} strokeWidth="1.5" strokeLinecap="round" />
    </>
  );
}

function Whisk() {
  return (
    <>
      <rect x="-1.9" y="3" width="3.8" height="13" rx="1.6" fill={O} />
      <path
        d="M-1.6 3.5 C-8.5 -4 -7 -17 0 -17 C7 -17 8.5 -4 1.6 3.5 Z"
        fill={W}
        stroke={O}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M-0.8 3.5 C-4.4 -4 -3.6 -16 0 -16.6 C3.6 -16 4.4 -4 0.8 3.5 M0 3.5 V-16.8" fill="none" stroke={O} strokeWidth="1.2" />
    </>
  );
}

function Pin() {
  return (
    <>
      <path
        d="M0 0 C-3 -5 -9 -10 -9 -16 A9 9 0 1 1 9 -16 C9 -10 3 -5 0 0 Z"
        fill={O}
        stroke={O}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <circle cx="0" cy="-16" r="3.6" fill={W} />
    </>
  );
}

/** A knitted beanie with a bobble, pulled down over the head (Wardrobe). */
function Beanie() {
  return (
    <>
      <circle cx="0" cy="-18.5" r="4.6" fill={O} stroke={W} strokeWidth="1.4" />
      <path d="M-15 -2 Q-15 -17 0 -17 Q15 -17 15 -2 Z" fill={O} stroke={W} strokeWidth="1.4" strokeLinejoin="round" />
      <rect x="-16.5" y="-4.5" width="33" height="7" rx="2.5" fill={W} stroke={O} strokeWidth="2.2" />
      <path d="M-11 -3 V1 M-5.5 -3 V1 M0 -3 V1 M5.5 -3 V1 M11 -3 V1" stroke={O} strokeWidth="1.3" strokeLinecap="round" />
    </>
  );
}

/** The prop layer for one kind, drawn on top of the head. */
export function MascotProp({ kind, animal }: { kind: MascotKind; animal: MascotAnimal }) {
  const a = ANCHORS[animal];
  switch (kind) {
    case "plain":
      return null;
    case "budget":
      return (
        <>
          <At p={a.chin}>
            <Tie />
          </At>
          <At p={nudge(a.front, 3, 2)}>
            <Coin />
          </At>
        </>
      );
    case "beer":
      return (
        <At p={a.front}>
          <Pint />
        </At>
      );
    case "diary":
      return (
        <At p={nudge(a.front, 3, 2)} rotate={10} mirror>
          <Notebook />
        </At>
      );
    case "reminders":
      return (
        <At p={nudge(a.front, 3, 2)} rotate={8} mirror>
          <AlarmClock />
        </At>
      );
    case "lessons":
      return (
        <>
          <Glasses a={a} />
          <At p={a.top}>
            <Mortarboard />
          </At>
        </>
      );
    case "wardrobe":
      return (
        <At p={a.cap}>
          <Beanie />
        </At>
      );
    case "people":
      return (
        <At p={a.top} rotate={-14}>
          <PartyHat />
        </At>
      );
    case "recipes":
      return (
        <>
          <At p={a.top}>
            <ChefHat />
          </At>
          <At p={a.front} rotate={20} mirror>
            <Whisk />
          </At>
        </>
      );
    case "waypoint":
      return (
        <>
          <At p={a.pin}>
            <Pin />
          </At>
          <At p={nudge(leftOf(a.front), -3, 2)} rotate={-8} mirror>
            <FoldedMap />
          </At>
        </>
      );
  }
}
