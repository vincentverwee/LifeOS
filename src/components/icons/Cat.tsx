type CatProps = {
  className?: string;
  size?: number;
  decorative?: boolean;
};

// Head and ears as one outline, so the stroke only runs around the outside.
const HEAD =
  "M22 52 C22 39 27 31.5 31.5 28.5 L28 11 L44.5 22.2 C48 21.4 52 21.4 55.5 22.2 L72 11 L68.5 28.5 C73 31.5 78 39 78 52 C78 66 66 74 50 74 C34 74 22 66 22 52 Z";

const WHISKERS = ["M35 57.5 L13 53.5", "M35 61 L13 62.5", "M65 57.5 L87 53.5", "M65 61 L87 62.5"];

/** One oval eye; the logo is { rx: 4, ry: 5.4, tilt: 0, dy: 0 }. `tilt` leans the top outwards;
 *  `closed` draws a happy ^ instead (Beer, the People wink). */
export type CatEye = { rx: number; ry: number; tilt: number; dy: number; closed?: boolean };
export const LOGO_CAT_EYE: CatEye = { rx: 4, ry: 5.4, tilt: 0, dy: 0 };

function CatEyeShape({ x, eye, side }: { x: number; eye: CatEye; side: 1 | -1 }) {
  const y = 46 + eye.dy;
  if (eye.closed) {
    return (
      <path
        d={`M${x - 4.4} ${y + 1.4} Q${x} ${y - 4.4} ${x + 4.4} ${y + 1.4}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    );
  }
  return (
    <g transform={`rotate(${eye.tilt * side} ${x} ${y})`}>
      <ellipse cx={x} cy={y} rx={eye.rx} ry={eye.ry} fill="currentColor" />
      {eye.ry > 2.6 && <circle cx={x + 1.4} cy={y - eye.ry / 3} r="1.4" fill="var(--color-wool)" />}
    </g>
  );
}

/**
 * The cat drawing itself (viewBox space "8 0 84 84"), shared by <Cat> and <Mascot>.
 * `eyes` lets a section mascot show a small mood with the logo's own eye shape.
 */
export function CatHead({ eyes }: { eyes?: { l: CatEye; r: CatEye } }) {
  return (
    <>
      <path d={HEAD} fill="var(--color-wool)" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />

      {/* inner ears */}
      <g fill="currentColor" opacity="0.4">
        <path d="M34 27 L32 16.5 L42 23.2 Z" />
        <path d="M66 27 L68 16.5 L58 23.2 Z" />
      </g>

      {/* nose and whiskers */}
      <path d="M46.6 55.5 L53.4 55.5 L50 59.3 Z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        {WHISKERS.map((d) => (
          <path key={d} d={d} strokeWidth="1.5" />
        ))}
      </g>

      {/* eyes with a light glint */}
      <CatEyeShape x={39.5} eye={eyes?.l ?? LOGO_CAT_EYE} side={-1} />
      <CatEyeShape x={60.5} eye={eyes?.r ?? LOGO_CAT_EYE} side={1} />
      {/* mouth */}
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M50 59.3 Q50 63.6 45.6 64" strokeWidth="1.6" />
        <path d="M50 59.3 Q50 63.6 54.4 64" strokeWidth="1.6" />
      </g>
    </>
  );
}

/**
 * The cat mark for THEME "cat" (see src/lib/theme.ts), drawn in the same two tones and
 * viewBox as the sheep: currentColor (outline, features) and --color-wool (fur).
 * Rendered through <Sheep>, so every sheep placement switches with the theme.
 */
export function Cat({ className, size = 100, decorative }: CatProps) {
  return (
    <svg
      viewBox="8 0 84 84"
      width={size}
      height={size}
      {...(decorative ? { "aria-hidden": "true" } : { role: "img", "aria-label": "Cat" })}
      className={className}
    >
      <CatHead />
    </svg>
  );
}
