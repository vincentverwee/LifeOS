"use client";

import { useActionState, useState } from "react";
import { deleteSavingsAccount, saveSavingsAccount, setSavingsAccountArchived } from "@/lib/actions/savings";
import type { FormState } from "@/lib/actions/invest";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Disclosure } from "@/components/Disclosure";
import { FundDot } from "./FundDot";
import { ErrorLine, useRun } from "./formBits";

export type SavingsAccountRow = { id: string; name: string; ratePct: number | null; color: string; isArchived: boolean; balances: number };

const comma = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));

/** Add an account, or edit one in place of its row. */
function AccountForm({ account, onDone }: { account?: SavingsAccountRow; onDone?: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const res = await saveSavingsAccount(prev, formData);
    if (res?.ok) onDone?.();
    return res;
  }, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      {account && <input type="hidden" name="id" value={account.id} />}
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">Name</span>
          <input name="name" defaultValue={account?.name ?? ""} required maxLength={60} placeholder="Savings account" className="field" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">Interest %</span>
          <input name="ratePct" inputMode="decimal" defaultValue={comma(account?.ratePct ?? null)} placeholder="2,5" className="field" />
        </label>
      </div>
      {!account && <p className="text-xs text-ink-muted">Base rate plus loyalty premium, as your bank shows it. You type its balance on Investments → Overview.</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary flex min-h-11 self-start px-4 text-sm">
          {account ? "Save" : "Add account"}
        </button>
        {account && (
          <button type="button" onClick={onDone} className="btn btn-ghost flex min-h-11 px-3 text-sm">
            Cancel
          </button>
        )}
      </div>
      <ErrorLine error={state && !state.ok ? state.error : null} />
    </form>
  );
}

/** Savings accounts like the fund list: tap to edit, Archive on the row, Delete only while it has no balances. */
export function SavingsAccountList({ accounts }: { accounts: SavingsAccountRow[] }) {
  const { error, pending, run } = useRun();
  const [editing, setEditing] = useState<string | null>(null);
  const active = accounts.filter((a) => !a.isArchived);
  const archived = accounts.filter((a) => a.isArchived);

  const row = (a: SavingsAccountRow) =>
    editing === a.id ? (
      <li key={a.id} className="py-3">
        <AccountForm account={a} onDone={() => setEditing(null)} />
      </li>
    ) : (
      <li key={a.id} className="flex min-h-14 items-center gap-2 py-1">
        <FundDot color={a.color} />
        <button type="button" onClick={() => setEditing(a.id)} className="flex min-h-11 min-w-0 flex-1 flex-col items-start text-left">
          <span className="w-full truncate font-medium text-foreground">{a.name}</span>
          <span className="w-full truncate text-xs text-ink-muted">
            {a.ratePct !== null ? `${comma(a.ratePct)}% interest` : "No rate"} · {a.balances} {a.balances === 1 ? "balance" : "balances"}
          </span>
        </button>
        {a.balances === 0 ? (
          <button type="button" disabled={pending} onClick={() => run(() => deleteSavingsAccount(a.id))} className="btn btn-ghost flex min-h-11 px-3 text-sm text-critical">
            Delete
          </button>
        ) : (
          <>
            <button type="button" disabled={pending} onClick={() => run(() => setSavingsAccountArchived(a.id, !a.isArchived))} className="btn btn-ghost flex min-h-11 px-3 text-sm">
              {a.isArchived ? "Bring back" : "Archive"}
            </button>
            {a.isArchived && (
              <ConfirmButton quiet disabled={pending} className="min-h-11 px-3 text-sm" onConfirm={() => run(() => deleteSavingsAccount(a.id))}>
                Delete
              </ConfirmButton>
            )}
          </>
        )}
      </li>
    );

  return (
    <div className="flex flex-col gap-3">
      {active.length > 0 && <ul className="divide-y divide-border">{active.map(row)}</ul>}
      <AccountForm key={accounts.length} />
      {archived.length > 0 && (
        <Disclosure title={`Archived (${archived.length})`}>
          <p className="text-sm text-ink-muted">Deleting an archived account also deletes its balances.</p>
          <ul className="divide-y divide-border">{archived.map(row)}</ul>
        </Disclosure>
      )}
      <ErrorLine error={error} />
    </div>
  );
}
