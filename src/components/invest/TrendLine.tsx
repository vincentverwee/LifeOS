/**
 * A small line without axes or labels: the shape only, never amounts (used on the
 * Home tile, where money numbers stay hidden). Green ending up, red ending down.
 */
export function TrendLine({ values, className = "h-10 w-full" }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${((i / (values.length - 1)) * 100).toFixed(2)} ${(28 - ((v - min) / span) * 24).toFixed(2)}`)
    .join(" ");
  const up = values.at(-1)! >= values[0];
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={`${className} ${up ? "text-positive-text" : "text-critical"}`} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
