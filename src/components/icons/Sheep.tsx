import { Cat } from "@/components/icons/Cat";
import { THEME } from "@/lib/theme";

type SheepProps = {
  className?: string;
  /** Rendered size in px (the mark is square). */
  size?: number;
  animate?: boolean;
  /** True for purely decorative uses (e.g. a card watermark) — hides it from assistive tech. */
  decorative?: boolean;
};

// Fleece: 16 evenly spaced puffs around a circle give the scalloped edge.
const FLEECE_PUFFS = Array.from({ length: 16 }, (_, i) => {
  const a = (2 * Math.PI * i) / 16;
  return [50 + 30 * Math.cos(a), 42 + 30 * Math.sin(a)] as const;
});

// Two rows of curls over the forehead.
const FRINGE: [cx: number, cy: number, r: number][] = [
  [41.6, 31.2, 4.6],
  [46.6, 29.6, 5.2],
  [53.4, 29.6, 5.2],
  [58.4, 31.2, 4.6],
  [44.2, 35, 4.2],
  [50, 34.2, 5],
  [55.8, 35, 4.2],
];

const FACE =
  "M50 28 C61 28 65 35 65 45 C65 55 61.5 62.5 57.5 66.5 C55 69 45 69 42.5 66.5 C38.5 62.5 35 55 35 45 C35 35 39 28 50 28 Z";

// Leaf-shaped eye, drawn for the left eye at the origin; mirrored for the right.
const EYE = "M-4.4 -0.6 Q-1.6 -3.6 3.4 0.2 Q-0.6 2.6 -4.4 -0.6 Z";
const EYE_SLANT = 22;

function Fleece() {
  return (
    <>
      {FLEECE_PUFFS.map(([cx, cy]) => (
        <circle key={`${cx.toFixed(2)}-${cy.toFixed(2)}`} cx={cx} cy={cy} r="7.2" />
      ))}
      <circle cx="50" cy="42" r="30" />
    </>
  );
}

/**
 * The one shared sheep mark: a dark sheep face set in a round, scalloped
 * fleece. Two tones only — currentColor (outline, ears, face) and
 * --color-wool (fleece and facial features, light in both themes). Every
 * other sheep placement wraps this component. `public/icon.svg` is a static
 * copy for the favicon and must be updated alongside this file, then the PNG
 * icons regenerated (see CLAUDE.md).
 */
export function Sheep({ className, size = 100, animate, decorative }: SheepProps) {
  const classes = [animate ? "animate-sheep-spin" : "", className].filter(Boolean).join(" ");
  // The cat theme swaps the mascot here, so every placement follows it.
  if (THEME === "cat") return <Cat className={classes} size={size} decorative={decorative} />;

  return (
    <svg
      viewBox="8 0 84 84"
      width={size}
      height={size}
      {...(decorative ? { "aria-hidden": "true" } : { role: "img", "aria-label": "Sheep" })}
      className={classes}
    >
      {/* fleece: outline pass (stroke around every puff), then the fill on top
          hides the inner strokes so only the outer scalloped edge remains */}
      <g fill="currentColor" stroke="currentColor" strokeWidth="6" strokeLinejoin="round">
        <Fleece />
      </g>
      <g fill="var(--color-wool)">
        <Fleece />
      </g>

      {/* ears and face */}
      <g fill="currentColor">
        <path d="M36 37 C29 34 21 35 17 39 C22 42.5 30 42.5 36 40 Z" />
        <path d="M64 37 C71 34 79 35 83 39 C78 42.5 70 42.5 64 40 Z" />
        <path d={FACE} />
      </g>

      <g fill="var(--color-wool)">
        {/* forehead wool */}
        {FRINGE.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
        {/* eyes, slanted up at the outer corners */}
        <path d={EYE} transform={`translate(42.4 44.5) rotate(${EYE_SLANT})`} />
        <path d={EYE} transform={`translate(57.6 44.5) rotate(${-EYE_SLANT}) scale(-1 1)`} />
      </g>

      {/* nose: one bow, with a line down to the chin */}
      <g fill="none" stroke="var(--color-wool)" strokeLinecap="round" opacity="0.9">
        <path d="M46.2 59.6 Q50 63 53.8 59.6" strokeWidth="1.3" />
        <path d="M50 61.3 L50 67.4" strokeWidth="1.1" />
      </g>
    </svg>
  );
}
