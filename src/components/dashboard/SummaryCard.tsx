type SummaryCardTone = "neutral" | "positive" | "negative";

export type SummaryCardProps = {
  label: string;
  value: string;
  tone?: SummaryCardTone;
  hint?: string;
  /** Override the tone arrow, e.g. "▼" for "less spending = good"; null hides it. */
  icon?: string | null;
};

const TONE_TEXT: Record<SummaryCardTone, string> = {
  neutral: "text-foreground",
  positive: "text-positive-text",
  negative: "text-critical",
};

const TONE_ICON: Record<SummaryCardTone, string> = {
  neutral: "",
  positive: "▲",
  negative: "▼",
};

export function SummaryCard({ label, value, tone = "neutral", hint, icon }: SummaryCardProps) {
  const arrow = icon === undefined ? TONE_ICON[tone] : icon;
  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface p-3 sm:p-4">
      <p className="text-xs text-ink-muted sm:text-sm">{label}</p>
      <p className={`mt-1 font-mono text-lg leading-tight font-semibold tabular-nums break-words sm:text-2xl ${TONE_TEXT[tone]}`}>
        {value}
      </p>
      {hint && (
        <p className={`mt-1 text-xs sm:text-sm ${TONE_TEXT[tone]}`}>
          {arrow && <span aria-hidden="true">{arrow} </span>}
          {hint}
        </p>
      )}
    </div>
  );
}
