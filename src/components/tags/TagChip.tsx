import type { TagColorSlot } from "@/lib/tagPalette";

type TagChipProps = {
  name: string;
  color: TagColorSlot;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
};

export function TagChip({ name, color, selected, onClick, className }: TagChipProps) {
  const dot = (
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: `var(--color-tag-${color})` }}
      aria-hidden="true"
    />
  );

  const classes = `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
    selected ? "border-primary bg-surface-muted text-foreground" : "border-border bg-surface text-foreground"
  } ${className ?? ""}`;

  if (!onClick) {
    return (
      <span className={classes}>
        {dot}
        {name}
      </span>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {dot}
      {name}
    </button>
  );
}
