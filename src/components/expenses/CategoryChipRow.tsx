import type { CategoryUsageStat } from "@/lib/data/categories";

type CategoryChipRowProps = {
  chips: CategoryUsageStat[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMore: () => void;
};

export function CategoryChipRow({ chips, selectedId, onSelect, onMore }: CategoryChipRowProps) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {chips.map((chip) => {
        const isSelected = chip.id === selectedId;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onSelect(chip.id)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap ${
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-foreground"
            }`}
          >
            {chip.name}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onMore}
        className="shrink-0 rounded-full border border-dashed border-border bg-surface px-4 py-2 text-sm font-medium whitespace-nowrap text-ink-muted"
      >
        More…
      </button>
    </div>
  );
}
