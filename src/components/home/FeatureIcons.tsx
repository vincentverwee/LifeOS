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

/** Reminders: a checklist, the top line ticked. */
export function RemindersIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M7 14l3.5 3.5L17 11" />
      <path d="M23 14.5h18M23 25h18M23 35.5h18" />
      <rect x="8" y="21.5" width="7" height="7" rx="2" />
      <rect x="8" y="32" width="7" height="7" rx="2" />
    </svg>
  );
}

/** People: a wrapped present with a bow. */
export function PeopleIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="7" y="17" width="34" height="8" rx="2" />
      <path d="M10 25v15a2 2 0 0 0 2 2h24a2 2 0 0 0 2-2V25" />
      <path d="M24 17v25" />
      <path d="M24 17c-2-5-9-9-11-5s4 5 11 5c7 0 13-1 11-5s-9 0-11 5z" />
    </svg>
  );
}

/** Beer: a pint glass with a head of foam. */
export function BeerIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 15h20l-2.5 26h-15z" />
      <path d="M12 15c-2.5 0-4-2-4-4.2C8 8 10.5 6.5 13 7.3 14 5 16.5 4 19 5c1.5-1.5 5-1.5 6.5 0 2.5-1 5.5.3 6 3 2.4.2 4 2 3.6 4.3-.3 1.6-1.7 2.7-3.1 2.7" />
      <path d="M32 20h3.5a4.5 4.5 0 0 1 4.5 4.5v4a4.5 4.5 0 0 1-4.5 4.5H31" />
    </svg>
  );
}
