type SheepProps = {
  className?: string;
  width?: number;
  height?: number;
  animate?: boolean;
  /** True for purely decorative uses (e.g. a card watermark) — hides it from assistive tech. */
  decorative?: boolean;
};

/**
 * The one shared sheep mark. Flat, single-tone silhouette (currentColor) with
 * a single "punched" eye dot in the surface color — no gradients, no shading,
 * no overlapping fills. Every other sheep placement wraps this component;
 * `src/app/icon.svg` is a hand-kept static copy (favicons can't import a
 * component) and must be updated alongside this file.
 */
export function Sheep({ className, width = 100, height = 80, animate, decorative }: SheepProps) {
  return (
    <svg
      viewBox="0 0 100 80"
      width={width}
      height={height}
      {...(decorative ? { "aria-hidden": "true" } : { role: "img", "aria-label": "Sheep" })}
      className={[animate ? "animate-sheep-hop" : "", className].filter(Boolean).join(" ")}
    >
      <g fill="currentColor">
        {/* legs */}
        <rect x="24" y="60" width="5" height="14" rx="2.5" />
        <rect x="38" y="63" width="5" height="14" rx="2.5" />
        <rect x="54" y="63" width="5" height="14" rx="2.5" />
        <rect x="66" y="60" width="5" height="14" rx="2.5" />

        {/* ears */}
        <path d="M70 22 L62 14 L68 12 Z" />
        <path d="M78 26 L88 20 L86 27 Z" />

        {/* body — a single soft-bumped silhouette, no overlapping shapes */}
        <path
          d="M18 55
             C18 41 27 31 41 31
             C44 24 53 21 61 25
             C67 19 78 21 80 29
             C89 30 94 40 91 50
             C90 61 81 67 69 67
             L27 67
             C20 67 18 61 18 55
             Z"
        />

        {/* head */}
        <circle cx="80" cy="34" r="13" />
      </g>

      {/* punched eye — the one intentional second tone */}
      <circle cx="85" cy="30" r="2" fill="var(--color-surface)" />
    </svg>
  );
}
