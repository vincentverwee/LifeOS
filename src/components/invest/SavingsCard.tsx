"use client";

import { useActionState, useState } from "react";
import { deleteSavingsBalance, saveSavingsBalance } from "@/lib/actions/savings";
import type { FormState } from "@/lib/actions/invest";
import type { SavingsAccountView } from "@/lib/data/inflation";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Disclosure } from "@/components/Disclosure";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatSignedCurrency, formatSignedPct, gainClass } from "@/lib/invest/format";
import { inTodaysEuros, monthOf, realRate, type CpiPoint } from "@/lib/invest/inflation";
import { FundDot } from "./FundDot";
import { ErrorLine, useRun } from "./formBits";

const pct = (share: number) => `${(share * 100).toLocaleString("nl-BE", { maximumFractionDigits: 2 })}%`;

/** One savings account vs inflation: balance, real interest, buying power a year, balance updates. */
export function SavingsCard({ account, cpi, inflation, todayKey }: { account: SavingsAccountView; cpi: CpiPoint[]; inflation: number | null; todayKey: string }) {
  const { error, pending, run } = useRun();
  const [formKey, setFormKey] = useState(0);
  const [state, action, saving] = useActionState<FormState, FormData>(async (prev, formData) => {
    const res = await saveSavingsBalance(prev, formData);
    if (res?.ok) setFormKey((k) => k + 1);
    return res;
  }, null);

  const latest = account.balances[0] ?? null;
  const first = account.balances.at(-1) ?? null;
  const rate = account.ratePct !== null ? account.ratePct / 100 : null;
  const real = rate !== null && inflation !== null ? realRate(rate, inflation) : null;
  const firstToday = first && cpi.length > 0 && first !== latest ? inTodaysEuros(first.balance, monthOf(first.date), cpi) : null;

  return (
    <section className="card flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <FundDot color={account.color} />
        <h3 className="min-w-0 flex-1 truncate font-medium text-foreground">{account.name}</h3>
        {latest && <span className="shrink-0 text-xs text-ink-muted">{formatDate(latest.date)}</span>}
      </div>

      {latest ? (
        <div>
          <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">{formatCurrency(latest.balance)}</p>
          {real !== null && rate !== null && inflation !== null ? (
            <p className="text-sm text-ink-muted">
              {pct(rate)} interest − {pct(inflation)} inflation = <span className={gainClass(real)}>{formatSignedPct(real)}</span> real ·{" "}
              <span className={gainClass(real)}>{formatSignedCurrency(latest.balance * real)}</span> a year in buying power
            </p>
          ) : (
            <p className="text-sm text-ink-muted">{rate === null ? "Add the interest rate in Settings to compare it with inflation." : "Waiting for inflation data."}</p>
          )}
          {firstToday !== null && first && (
            <p className="mt-1 text-sm text-ink-muted">
              Your first balance ({formatCurrency(first.balance)}, {formatDate(first.date)}) is {formatCurrency(firstToday)} in today&apos;s money.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-ink-muted">No balance yet. Type what your banking app shows.</p>
      )}

      <form key={formKey} action={action} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="accountId" value={account.id} />
        <label className="flex min-w-32 flex-1 flex-col gap-1">
          <span className="text-sm text-ink-muted">Balance</span>
          <input name="balance" inputMode="decimal" required placeholder="0,00" className="field" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">On</span>
          <input type="date" name="date" defaultValue={todayKey} max={todayKey} required className="field" />
        </label>
        <button type="submit" disabled={saving} className="btn btn-primary flex min-h-11 px-4 text-sm">
          {latest ? "Update" : "Save"}
        </button>
      </form>
      <ErrorLine error={state && !state.ok ? state.error : error} />

      {account.balances.length > 1 && (
        <Disclosure title={`History (${account.balances.length})`}>
          <ul className="divide-y divide-border">
            {account.balances.map((b) => (
              <li key={b.id} className="flex min-h-12 items-center justify-between gap-3 text-sm">
                <span className="text-ink-muted">{formatDate(b.date)}</span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums text-foreground">{formatCurrency(b.balance)}</span>
                  <ConfirmButton quiet disabled={pending} className="min-h-11 px-3 text-sm" onConfirm={() => run(() => deleteSavingsBalance(b.id))}>
                    Delete
                  </ConfirmButton>
                </span>
              </li>
            ))}
          </ul>
        </Disclosure>
      )}
    </section>
  );
}
