import Link from "next/link";
import { SheepIllustration } from "@/components/icons/SheepIllustration";

type EmptyStateVariant = "cycle" | "trip" | "savings" | "no-periods" | "category-trend";

const COPY: Record<EmptyStateVariant, { heading: string; body: string }> = {
  cycle: {
    heading: "No spending yet",
    body: "Add a few expenses in this month to see the chart fill in.",
  },
  trip: {
    heading: "No expenses yet",
    body: "Log an expense against a category to see the breakdown here.",
  },
  savings: {
    heading: "Not enough entries yet",
    body: "Add a couple more savings entries to see the trend.",
  },
  "no-periods": {
    heading: "No budget periods yet",
    body: "Create a month or a trip to get started.",
  },
  "category-trend": {
    heading: "Not enough data for this category yet",
    body: "Log a couple more expenses in this category to see a trend.",
  },
};

type EmptyStateProps = {
  variant: EmptyStateVariant;
  className?: string;
};

export function EmptyState({ variant, className }: EmptyStateProps) {
  const copy = COPY[variant];

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center ${className ?? ""}`}
    >
      <SheepIllustration />
      <p className="font-medium text-foreground">{copy.heading}</p>
      <p className="max-w-xs text-sm text-ink-muted">{copy.body}</p>
      {variant === "no-periods" && (
        <Link
          href="/budget/settings"
          className="rounded-lg border border-primary bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          Create a month or trip
        </Link>
      )}
    </div>
  );
}
