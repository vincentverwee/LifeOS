import type { Debt } from "@/lib/data/debts";
import { formatCurrency } from "@/lib/format";

type DebtsListProps = {
  debts: Debt[];
};

export function DebtsList({ debts }: DebtsListProps) {
  if (debts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-ink-muted">
        No debts on record.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {debts.map((debt) => {
        const isOwedToUser = debt.amount >= 0;
        return (
          <li key={debt.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{debt.name}</p>
              {debt.note && <p className="truncate text-sm text-ink-muted">{debt.note}</p>}
            </div>
            <div className="shrink-0 text-right">
              <p
                className={`font-mono tabular-nums font-medium ${
                  isOwedToUser ? "text-positive-text" : "text-critical"
                }`}
              >
                {formatCurrency(Math.abs(debt.amount))}
              </p>
              <p className="text-xs text-ink-muted">
                {isOwedToUser ? "owed to you" : "you owe"}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
