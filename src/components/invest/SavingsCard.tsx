"use client";

import { useActionState, useState } from "react";
import { ChevronDown } from "lucide-react";
import { deleteSavingsBalance, saveSavingsBalance } from "@/lib/actions/savings";
import type { FormState } from "@/lib/actions/invest";
import type { SavingsAccountView } from "@/lib/data/inflation";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { formatCurrency } from "@/lib/format";
import { formatDay, formatPct, formatSignedCurrency, formatSignedPct, gainClass } from "@/lib/invest/format";
import { inTodaysEuros, monthOf, realRate, type CpiPoint } from "@/lib/invest/inflation";
import { FundDot } from "./FundDot";
import { ErrorLine, useRun } from "./formBits";

/**
 * One savings account: balance and what it earns after inflation up front; "Update
 * balance" opens the form, the sum behind the real rate and the history inline (no
 * nested card, so the form keeps its width on a phone).
 */
export function SavingsCard({ account, cpi, inflation, todayKey }: { account: SavingsAccountView; cpi: CpiPoint[]; inflation: number | null; todayKey: string }) {
  const { error, pending, run } = useRun();
  const latest = account.balances[0] ?? null;
  const [open, setOpen] = useState(!latest);
  const [formKey, setFormKey] = useState(0);
  const [state, action, saving] = useActionState<FormState, FormData>(async (prev, formData) => {
    const res = await saveSavingsBalance(prev, formData);
    if (res?.ok) {
      setFormKey((k) => k + 1);
      setOpen(false);
    }
    return res;
  }, null);

  const first = account.balances.at(-1) ?? null;
  const rate = account.ratePct !== null ? account.ratePct / 100 : null;
  const real = rate !== null && inflation !== null ? realRate(rate, inflation) : null;
  const firstToday = first && cpi.length > 0 && first !== latest ? inTodaysEuros(first.balance, monthOf(first.date), cpi) : null;

  return (
    <section className="card flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <FundDot color={account.color} />
        <h3 className="min-w-0 flex-1 truncate font-medium text-foreground">{account.name}</h3>
        {latest && <span className="shrink-0 text-xs text-ink-muted">{formatDay(latest.date, todayKey)}</span>}
      </div>

      {latest ? (
        <div>
          <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">{formatCurrency(latest.balance)}</p>
          {real !== null ? (
            <p className="text-sm text-ink-muted">
              <span className={gainClass(real)}>{formatSignedCurrency(latest.balance * real)}</span> a year in buying power (
              <span className={gainClass(real)}>{formatSignedPct(real)}</span> after inflation)
            </p>
          ) : (
            <p className="text-sm text-ink-muted">{rate === null ? "Add the interest rate in Settings to compare it with inflation." : "Waiting for inflation figures."}</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-ink-muted">No balance yet. Type what your banking app shows.</p>
      )}

      {latest && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="btn btn-ghost -mx-3 inline-flex min-h-11 self-start px-3 text-sm"
        >
          Update balance
          <ChevronDown size={16} aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}

      {open && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <form key={formKey} action={action} className="flex flex-col gap-2">
            <input type="hidden" name="accountId" value={account.id} />
            <label className="flex flex-col gap-1">
              <span className="text-sm text-ink-muted">Balance</span>
              <input name="balance" inputMode="decimal" required placeholder="0,00" className="field" />
            </label>
            <div className="flex items-end gap-2">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-sm text-ink-muted">On</span>
                <input type="date" name="date" defaultValue={todayKey} max={todayKey} required className="field w-full" />
              </label>
              <button type="submit" disabled={saving} className="btn btn-primary flex min-h-11 px-5 text-sm font-semibold">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
          <ErrorLine error={state && !state.ok ? state.error : error} />

          {real !== null && rate !== null && inflation !== null && (
            <p className="text-xs text-ink-muted">
              {formatPct(rate, 2)} interest − {formatPct(inflation)} inflation over the last 12 months = {formatSignedPct(real)} real.
            </p>
          )}
          {firstToday !== null && first && (
            <p className="text-xs text-ink-muted">
              Your first balance ({formatCurrency(first.balance)}, {formatDay(first.date, todayKey)}) is {formatCurrency(firstToday)} in today&apos;s money.
            </p>
          )}

          {account.balances.length > 0 && (
            <ul className="divide-y divide-border">
              {account.balances.map((b) => (
                <li key={b.id} className="flex min-h-12 items-center justify-between gap-3 text-sm">
                  <span className="text-ink-muted">{formatDay(b.date, todayKey)}</span>
                  <span className="flex items-center gap-1">
                    <span className="tabular-nums text-foreground">{formatCurrency(b.balance)}</span>
                    <ConfirmButton quiet disabled={pending} className="min-h-11 px-3 text-sm" onConfirm={() => run(() => deleteSavingsBalance(b.id))}>
                      Delete
                    </ConfirmButton>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
