"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateBalances, updateMonthBudget, updateRent } from "@/lib/actions/cycles";
import { formatCurrency, parseAmount, parseSignedAmount } from "@/lib/format";
import type { BalanceOutlook } from "@/lib/monthStats";
import { SheepSpinner } from "@/components/icons/SheepSpinner";

type BalancesCardProps = {
  cycleId: string;
  budget: number;
  bank: number;
  tricount: number;
  cash: number;
  rent: number;
  rentDay: number | null;
  /** days since the balances were last saved; null = never */
  updatedDaysAgo: number | null;
  outlook: BalanceOutlook;
};

function updatedText(days: number | null): string {
  if (days === null) return "not filled in yet";
  if (days <= 0) return "updated today";
  if (days === 1) return "updated yesterday";
  return `updated ${days} days ago`;
}

const FIELDS = [
  { key: "bank", label: "Bank" },
  { key: "tricount", label: "Tricount" },
  { key: "cash", label: "Cash" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

function asInput(value: number): string {
  return value === 0 ? "" : String(value).replace(".", ",");
}

export function BalancesCard({
  cycleId,
  budget,
  bank,
  tricount,
  cash,
  rent,
  rentDay,
  updatedDaysAgo,
  outlook,
}: BalancesCardProps) {
  const router = useRouter();
  const saved: Record<FieldKey, number> = { bank, tricount, cash };
  const [values, setValues] = useState<Record<FieldKey, string>>({
    bank: asInput(bank),
    tricount: asInput(tricount),
    cash: asInput(cash),
  });
  const [budgetValue, setBudgetValue] = useState(String(budget).replace(".", ","));
  const [rentValue, setRentValue] = useState(asInput(rent));
  const [rentDayValue, setRentDayValue] = useState(rentDay !== null ? String(rentDay) : "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const parsed = Object.fromEntries(
    FIELDS.map(({ key }) => [key, values[key].trim() === "" ? 0 : parseSignedAmount(values[key])])
  ) as Record<FieldKey, number | null>;
  const invalid = FIELDS.some(({ key }) => parsed[key] === null);
  const dirty = FIELDS.some(({ key }) => parsed[key] !== saved[key]);

  const rentParsed = rentValue.trim() === "" ? 0 : parseAmount(rentValue);
  const rentDayParsed = rentDayValue.trim() === "" ? null : Number.parseInt(rentDayValue, 10);
  const rentInvalid =
    rentParsed === null ||
    (rentDayParsed !== null &&
      (!Number.isInteger(rentDayParsed) || rentDayParsed < 1 || rentDayParsed > 31));
  const rentDirty = rentParsed !== rent || rentDayParsed !== rentDay;
  const budgetParsed = parseAmount(budgetValue);
  const budgetInvalid = budgetParsed === null || budgetParsed <= 0;
  const budgetDirty = budgetParsed !== budget;

  function save() {
    setError(null);
    startTransition(async () => {
      if (dirty && !invalid) {
        const result = await updateBalances({
          cycleId,
          bank: parsed.bank!,
          tricount: parsed.tricount!,
          cash: parsed.cash!,
        });
        if (!result.ok) return setError(result.error);
      }
      if (budgetDirty && !budgetInvalid) {
        const result = await updateMonthBudget({ cycleId, budget: budgetParsed! });
        if (!result.ok) return setError(result.error);
      }
      if (rentDirty && !rentInvalid) {
        const result = await updateRent({ cycleId, rent: rentParsed!, rentDay: rentDayParsed });
        if (!result.ok) return setError(result.error);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h3 className="font-medium text-foreground">What I have</h3>
          <p
            className={`text-xs ${
              updatedDaysAgo === null || updatedDaysAgo >= 3 ? "text-warning-text" : "text-ink-muted"
            }`}
          >
            {updatedText(updatedDaysAgo)}
          </p>
        </div>
        <span className="font-mono text-sm tabular-nums text-ink-muted">
          {formatCurrency(outlook.total)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {FIELDS.map(({ key, label }) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-xs text-ink-muted">{label}</span>
            <input
              type="text"
              inputMode="decimal"
              value={values[key]}
              placeholder="0"
              onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
              onFocus={(e) => e.target.select()}
              className={`w-full rounded-lg border bg-surface px-2.5 py-2.5 font-mono text-base tabular-nums text-foreground ${
                parsed[key] === null ? "border-critical" : "border-border"
              }`}
            />
          </label>
        ))}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer py-1 text-ink-muted">
          Month settings · budget {formatCurrency(budget)}
          {rent > 0 ? ` · rent ${formatCurrency(rent)}${rentDay ? ` on day ${rentDay}` : ""}` : ""}
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-xs text-ink-muted">Monthly budget</span>
            <input
              type="text"
              inputMode="decimal"
              value={budgetValue}
              onChange={(e) => setBudgetValue(e.target.value)}
              className={`rounded-lg border bg-surface px-3 py-2 font-mono tabular-nums text-foreground ${
                budgetInvalid ? "border-critical" : "border-border"
              }`}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-muted">Monthly rent</span>
            <input
              type="text"
              inputMode="decimal"
              value={rentValue}
              placeholder="0"
              onChange={(e) => setRentValue(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 font-mono tabular-nums text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-muted">Day of month</span>
            <input
              type="text"
              inputMode="numeric"
              value={rentDayValue}
              placeholder="17"
              onChange={(e) => setRentDayValue(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 font-mono tabular-nums text-foreground"
            />
          </label>
        </div>
      </details>

      {(dirty || rentDirty || budgetDirty) && (
        <button
          type="button"
          onClick={save}
          disabled={invalid || rentInvalid || budgetInvalid || isPending}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {isPending ? (
            <span className="inline-flex items-center justify-center gap-2">
              <SheepSpinner size={18} />
              Saving…
            </span>
          ) : (
            "Save"
          )}
        </button>
      )}
      {error && <p className="text-sm text-critical">{error}</p>}

      <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-ink-muted">
            Available{outlook.rentStillDue > 0 ? " (after rent)" : ""}
          </dt>
          <dd
            className={`font-mono text-base font-semibold tabular-nums sm:text-lg ${
              outlook.available < 0 ? "text-critical" : "text-foreground"
            }`}
          >
            {formatCurrency(outlook.available)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Safe to spend per day</dt>
          <dd
            className={`font-mono text-base font-semibold tabular-nums sm:text-lg ${
              outlook.safePerDay !== null && outlook.safePerDay < 0
                ? "text-critical"
                : "text-foreground"
            }`}
          >
            {outlook.safePerDay !== null ? formatCurrency(outlook.safePerDay) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Predicted at month end</dt>
          <dd
            className={`font-mono text-base font-semibold tabular-nums sm:text-lg ${
              outlook.predictedEndBalance < 0 ? "text-critical" : "text-positive-text"
            }`}
          >
            {formatCurrency(outlook.predictedEndBalance)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
