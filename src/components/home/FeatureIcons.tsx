type IconProps = { className?: string };

const base = {
  viewBox: "0 0 48 48",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Budget: a coin with a euro sign. */
export function BudgetIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="24" cy="24" r="18" />
      <path d="M31 17.5A9 9 0 1 0 31 30.5" />
      <path d="M15.5 21.5h12M15.5 26.5h12" />
    </svg>
  );
}

/** Lessons: an open book with a bookmark. */
export function LessonsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M24 13c-4-3.5-10-4-17-3v26c7-1 13-.5 17 3 4-3.5 10-4 17-3V10c-7-1-13-.5-17 3z" />
      <path d="M24 13v26" />
      <path d="M31 9.5V20l3-2.5 3 2.5V9.3" />
    </svg>
  );
}

/** Waypoint: a map pin at the end of a dashed route. */
export function WaypointIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="39" r="3" />
      <path d="M12 39h8c4 0 5-5 1-6.5l-4-1.5c-4-1.5-3-6.5 1-6.5h3" strokeDasharray="1 5" />
      <path d="M34 6c-5.5 0-10 4.3-10 9.7 0 7 10 16.3 10 16.3s10-9.3 10-16.3C44 10.3 39.5 6 34 6z" />
      <circle cx="34" cy="15.5" r="3.5" />
    </svg>
  );
}

/** Recipes: a cloche on a plate. */
export function RecipesIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M8 33a16 16 0 0 1 32 0z" />
      <path d="M5 38h38" />
      <circle cx="24" cy="13.5" r="2.5" />
      <path d="M17 24a9 9 0 0 1 5-4" />
    </svg>
  );
}
