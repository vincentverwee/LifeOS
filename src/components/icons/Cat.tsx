type CatProps = {
  className?: string;
  size?: number;
  decorative?: boolean;
};

// Head and ears as one outline, so the stroke only runs around the outside.
const HEAD =
  "M22 52 C22 39 27 31.5 31.5 28.5 L28 11 L44.5 22.2 C48 21.4 52 21.4 55.5 22.2 L72 11 L68.5 28.5 C73 31.5 78 39 78 52 C78 66 66 74 50 74 C34 74 22 66 22 52 Z";

const WHISKERS = ["M35 57.5 L13 53.5", "M35 61 L13 62.5", "M65 57.5 L87 53.5", "M65 61 L87 62.5"];

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
      <path d={HEAD} fill="var(--color-wool)" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />

      {/* inner ears */}
      <g fill="currentColor" opacity="0.4">
        <path d="M34 27 L32 16.5 L42 23.2 Z" />
        <path d="M66 27 L68 16.5 L58 23.2 Z" />
      </g>

      {/* eyes with a light glint */}
      <g fill="currentColor">
        <ellipse cx="39.5" cy="46" rx="4" ry="5.4" />
        <ellipse cx="60.5" cy="46" rx="4" ry="5.4" />
      </g>
      <g fill="var(--color-wool)">
        <circle cx="40.9" cy="44.2" r="1.4" />
        <circle cx="61.9" cy="44.2" r="1.4" />
      </g>

      {/* nose, mouth, whiskers */}
      <path d="M46.6 55.5 L53.4 55.5 L50 59.3 Z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M50 59.3 Q50 63.6 45.6 64" strokeWidth="1.6" />
        <path d="M50 59.3 Q50 63.6 54.4 64" strokeWidth="1.6" />
        {WHISKERS.map((d) => (
          <path key={d} d={d} strokeWidth="1.5" />
        ))}
      </g>
    </svg>
  );
}
