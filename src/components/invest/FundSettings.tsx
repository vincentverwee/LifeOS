"use client";

import { useActionState, useState, useTransition } from "react";
import { addFund, deleteFund, lookupFunds, setFundArchived, updateFund, type FormState } from "@/lib/actions/invest";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { CATEGORY_COLOR_SLOTS } from "@/lib/categoryPalette";
import { FundDot } from "./FundDot";
import type { Fund, FundHit } from "@/lib/invest/types";

const pct = (rate: number) => String(Math.round(rate * 100000) / 1000).replace(".", ",");

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
    <section className="card flex flex-col gap-4 p-5">
      <h2 className="section-title">Add a fund</h2>
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
            placeholder="Name, ticker or ISIN (e.g. VWCE)"
            className="field w-full"
          />
        </label>
        <button type="button" onClick={search} disabled={searching || query.trim().length < 2} className="btn btn-outline min-h-11 px-4 text-sm">
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
                className={`tap flex w-full items-center justify-between gap-3 p-3 text-left ${ticker === h.ticker ? "bg-surface-muted" : ""}`}
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
            <span className="text-sm font-medium text-foreground">Ticker</span>
            <input name="ticker" value={ticker} onChange={(e) => setTicker(e.target.value)} required placeholder="VWCE.DE" autoCapitalize="characters" className="field" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Target %</span>
            <input name="targetPct" inputMode="decimal" placeholder="Optional" className="field" />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">Name</span>
          <input name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Filled in from the ticker" maxLength={80} className="field" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">TOB %</span>
            <input name="tobRate" inputMode="decimal" defaultValue="0,12" className="field" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">ISIN</span>
            <input name="isin" placeholder="Optional" autoCapitalize="characters" className="field" />
          </label>
        </div>
        <p className="text-xs text-ink-muted">
          Use the euro listing you buy on Bolero (Xetra = .DE, Amsterdam = .AS, Brussels = .BR). Adding fetches a year of prices.
        </p>
        {state && !state.ok && (
          <p role="alert" className="text-sm text-critical">
            {state.error}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn btn-primary min-h-11 self-start px-5 text-sm font-semibold">
          {pending ? "Checking prices…" : "Add fund"}
        </button>
      </form>
    </section>
  );
}

/** One fund's row: tap to edit name, target, TOB rate, ISIN and colour; archive or delete. */
export function FundRow({ fund, tradeCount }: { fund: Fund; tradeCount: number }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const res = await updateFund(prev, formData);
    if (res?.ok) setOpen(false);
    return res;
  }, null);
  const [color, setColor] = useState(fund.color);
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="p-4">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="tap -m-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl p-2 text-left">
        <FundDot color={fund.color} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-foreground">{fund.ticker}</span>
          <span className="block truncate text-sm text-ink-muted">
            {fund.name}
            {fund.targetPct !== null && ` · target ${String(fund.targetPct).replace(".", ",")}%`}
          </span>
        </span>
        <span className="shrink-0 text-xs text-ink-muted">{tradeCount} {tradeCount === 1 ? "trade" : "trades"}</span>
      </button>

      {open && (
        <form action={action} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="id" value={fund.id} />
          <input type="hidden" name="color" value={color} />
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Name</span>
            <input name="name" defaultValue={fund.name} required maxLength={80} className="field" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">Target %</span>
              <input name="targetPct" inputMode="decimal" defaultValue={fund.targetPct === null ? "" : String(fund.targetPct).replace(".", ",")} placeholder="None" className="field" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">TOB %</span>
              <input name="tobRate" inputMode="decimal" defaultValue={pct(fund.tobRate)} className="field" />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">ISIN</span>
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
          {(state && !state.ok) || error ? (
            <p role="alert" className="text-sm text-critical">
              {state && !state.ok ? state.error : error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className="btn btn-primary min-h-11 px-5 text-sm font-semibold">
              Save
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => start(async () => void (await setFundArchived(fund.id, !fund.isArchived)))}
              className="btn btn-outline min-h-11 px-4 text-sm"
            >
              {fund.isArchived ? "Bring back" : "Archive"}
            </button>
            {tradeCount === 0 && (
              <ConfirmButton
                quiet
                onConfirm={() =>
                  start(async () => {
                    const res = await deleteFund(fund.id);
                    if (!res.ok) setError(res.error);
                  })
                }
              >
                Delete
              </ConfirmButton>
            )}
          </div>
        </form>
      )}
    </li>
  );
}
