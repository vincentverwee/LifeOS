import { SheepMark } from "@/components/icons/SheepMark";

type SummaryCardTone = "neutral" | "positive" | "negative";

export type SummaryCardProps = {
  label: string;
  value: string;
  tone?: SummaryCardTone;
  hint?: string;
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

export function SummaryCard({ label, value, tone = "neutral", hint }: SummaryCardProps) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-xl border border-border bg-surface p-3 sm:p-4">
      <SheepMark className="pointer-events-none absolute -right-3 -bottom-3 h-16 w-16 text-primary opacity-[0.06]" />
      <p className="text-xs text-ink-muted sm:text-sm">{label}</p>
      <p className={`mt-1 truncate font-mono text-lg font-semibold tabular-nums sm:text-2xl ${TONE_TEXT[tone]}`}>
        {value}
      </p>
      {hint && (
        <p className={`mt-1 text-xs sm:text-sm ${TONE_TEXT[tone]}`}>
          {TONE_ICON[tone] && <span aria-hidden="true">{TONE_ICON[tone]} </span>}
          {hint}
        </p>
      )}
    </div>
  );
}
