/** A fund's palette colour as a small dot. */
export function FundDot({ color, className = "h-2.5 w-2.5" }: { color: string; className?: string }) {
  return <span aria-hidden="true" className={`${className} shrink-0 rounded-full`} style={{ backgroundColor: `var(--color-tag-${color})` }} />;
}
