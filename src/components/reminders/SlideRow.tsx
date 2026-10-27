/** How long a row takes to slide out and close its gap (keep in step with the CSS in globals.css). */
export const SLIDE_OUT_MS = 650;

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One reminder row that can slide away: the card slides out sideways, then the row's height
 * closes so the rows below move up instead of jumping. `entering` slides it in from the right.
 */
export function SlideRow({
  leaving,
  entering,
  children,
}: {
  leaving?: "left" | "right" | null;
  entering?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li
      className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
        leaving ? "grid-rows-[0fr] delay-[400ms]" : "grid-rows-[1fr]"
      }`}
    >
      {/* clip only vertically: the card may slide past the list's sides (the body clips the page) */}
      <div className="min-h-0 overflow-y-clip">
        <div
          className={`pb-2 ${
            leaving === "right"
              ? "animate-slide-out-right"
              : leaving === "left"
                ? "animate-slide-out-left"
                : entering
                  ? "animate-slide-in-left"
                  : ""
          }`}
        >
          {children}
        </div>
      </div>
    </li>
  );
}
