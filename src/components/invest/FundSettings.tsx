"use client";

import { useActionState, useState, useTransition } from "react";
import { addFund, deleteFund, lookupFunds, setFundArchived, updateFund, type FormState } from "@/lib/actions/invest";
import { Disclosure } from "@/components/Disclosure";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { CATEGORY_COLOR_SLOTS } from "@/lib/categoryPalette";
import { FundDot } from "./FundDot";
import { ErrorLine, useRun } from "./formBits";
import type { Fund, FundHit } from "@/lib/invest/types";

const pct = (rate: number) => String(Math.round(rate * 100000) / 1000).replace(".", ",");
const comma = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));

/** Edit one fund in place of its row: name, target, TOB rate, ISIN, colour. */
function FundForm({ fund, onDone }: { fund: Fund; onDone: () => void }) {
  const [color, setColor] = useState(fund.color);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const res = await updateFund(prev, formData);
    if (res?.ok) onDone();
    return res;
  }, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={fund.id} />
      <input type="hidden" name="color" value={color} />
      <p className="text-sm font-medium text-foreground">{fund.ticker}</p>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Name</span>
        <input name="name" defaultValue={fund.name} required maxLength={80} className="field" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">Target %</span>
          <input name="targetPct" inputMode="decimal" defaultValue={comma(fund.targetPct)} placeholder="None" className="field" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">TOB %</span>
          <input name="tobRate" inputMode="decimal" defaultValue={pct(fund.tobRate)} className="field" />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">ISIN</span>
        <input name="isin" defaultValue={fund.isin ?? ""} autoCapitalize="characters" className="field" />
      </label>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Colour">
        {CATEGORY_COLOR_SLOTS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={c}
            onClick={() => setColor(c)}
            className={`flex h-11 w-11 items-center justify-center rounded-full ${color === c ? "ring-2 ring-foreground" : ""}`}
          >
            <FundDot color={c} className="h-6 w-6" />
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary flex min-h-11 px-4 text-sm">
          Save
        </button>
        <button type="button" onClick={onDone} className="btn btn-ghost flex min-h-11 px-3 text-sm">
          Cancel
        </button>
      </div>
      <ErrorLine error={state && !state.ok ? state.error : null} />
    </form>
  );
}

/** Your funds like Workouts' activities: tap a row to edit it; Archive (or Delete without trades) on the row. */
export function FundList({ funds, counts }: { funds: Fund[]; counts: Record<string, number> }) {
  const { error, pending, run } = useRun();
  const [editing, setEditing] = useState<string | null>(null);
  const active = funds.filter((f) => !f.isArchived);
  const archived = funds.filter((f) => f.isArchived);

  const row = (f: Fund) => {
    const trades = counts[f.id] ?? 0;
    return editing === f.id ? (
      <li key={f.id} className="py-3">
        <FundForm fund={f} onDone={() => setEditing(null)} />
      </li>
    ) : (
      <li key={f.id} className="flex min-h-14 items-center gap-2 py-1">
        <FundDot color={f.color} />
        <button type="button" onClick={() => setEditing(f.id)} className="flex min-h-11 min-w-0 flex-1 flex-col items-start text-left">
          <span className="w-full truncate font-medium text-foreground">{f.ticker}</span>
          <span className="w-full truncate text-xs text-ink-muted">
            {f.name}
            {f.targetPct !== null && ` · target ${comma(f.targetPct)}%`} · {trades} {trades === 1 ? "trade" : "trades"}
          </span>
        </button>
        {trades === 0 ? (
          <ConfirmButton quiet disabled={pending} className="min-h-11 px-3 text-sm" onConfirm={() => run(() => deleteFund(f.id))}>
            Delete
          </ConfirmButton>
        ) : (
          <button type="button" disabled={pending} onClick={() => run(() => setFundArchived(f.id, !f.isArchived))} className="btn btn-ghost flex min-h-11 px-3 text-sm">
            {f.isArchived ? "Bring back" : "Archive"}
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {active.length > 0 ? (
        <ul className="divide-y divide-border">{active.map(row)}</ul>
      ) : (
        <p className="text-sm text-ink-muted">No funds yet. Add the ETF you buy below.</p>
      )}
      {archived.length > 0 && (
        <Disclosure title={`Archived (${archived.length})`}>
          <p className="text-sm text-ink-muted">Kept for their trades; prices aren&apos;t updated.</p>
          <ul className="divide-y divide-border">{archived.map(row)}</ul>
        </Disclosure>
      )}
      <ErrorLine error={error} />
    </div>
  );
}

/** Search Yahoo by name, ticker or ISIN and add the euro listing you buy on Bolero. */
export function AddFund() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<FundHit[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, start] = useTransition();
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  // The form's own inputs reset after the action; the search and picked ticker are cleared here.
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const res = await addFund(prev, formData);
    if (res?.ok) {
      setTicker("");
      setName("");
      setHits(null);
      setQuery("");
    }
    return res;
  }, null);

  function search() {
    start(async () => {
      const res = await lookupFunds(query);
      if (res.ok) {
        setHits(res.hits);
        setSearchError(res.hits.length === 0 ? "Nothing found. Try the fund's name or ticker." : null);
      } else {
        setHits(null);
        setSearchError(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Search by name, ticker or ISIN</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                search();
              }
            }}
            placeholder="Name or ticker (e.g. VWCE)"
            className="field w-full"
          />
        </label>
        <button type="button" onClick={search} disabled={searching || query.trim().length < 2} className="btn btn-outline flex min-h-11 px-4 text-sm">
          {searching ? "…" : "Search"}
        </button>
      </div>
      {searchError && <p className="text-sm text-ink-muted">{searchError}</p>}
      {hits && hits.length > 0 && (
        <ul className="card-list">
          {hits.map((h) => (
            <li key={h.ticker}>
              <button
                type="button"
                onClick={() => {
                  setTicker(h.ticker);
                  setName(h.name);
                }}
                className={`tap flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left ${ticker === h.ticker ? "bg-surface-muted" : ""}`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{h.ticker}</span>
                  <span className="block truncate text-xs text-ink-muted">{h.name}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-muted">{h.exchange}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-ink-muted">Ticker</span>
            <input name="ticker" value={ticker} onChange={(e) => setTicker(e.target.value)} required placeholder="VWCE.DE" autoCapitalize="characters" className="field" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-ink-muted">Target %</span>
            <input name="targetPct" inputMode="decimal" placeholder="Optional" className="field" />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">Name</span>
          <input name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Filled in from the ticker" maxLength={80} className="field" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-ink-muted">TOB %</span>
            <input name="tobRate" inputMode="decimal" defaultValue="0,12" className="field" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-ink-muted">ISIN</span>
            <input name="isin" placeholder="Optional" autoCapitalize="characters" className="field" />
          </label>
        </div>
        <p className="text-xs text-ink-muted">
          Use the euro listing you buy on Bolero (Xetra = .DE, Amsterdam = .AS, Brussels = .BR). Adding fetches a year of prices.
        </p>
        <ErrorLine error={state && !state.ok ? state.error : null} />
        <button type="submit" disabled={pending} className="btn btn-primary flex min-h-11 self-start px-4 text-sm">
          {pending ? "Checking prices…" : "Add fund"}
        </button>
      </form>
    </div>
  );
}
