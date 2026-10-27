/** A pill toggle, for picking one option out of a few (deck filters, meal type). */
export function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`btn min-h-11 border px-3.5 text-sm capitalize ${
        selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-foreground hover:bg-surface-muted active:bg-surface-muted"
      }`}
    >
      {children}
    </button>
  );
}
