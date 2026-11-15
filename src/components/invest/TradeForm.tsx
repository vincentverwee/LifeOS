"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveTrade, deleteTrade, type FormState } from "@/lib/actions/invest";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { evaluateAmount, formatCurrency } from "@/lib/format";
import { suggestedTob } from "@/lib/invest/stats";
import { TRADE_LABELS, TRADE_TYPES, type Fund, type Trade, type TradeType } from "@/lib/invest/types";

const num = (raw: string): number | null => {
  const n = Number(raw.trim().replace(",", "."));
  return raw.trim() && Number.isFinite(n) ? n : null;
};
const amount = (raw: string): number | null => (raw.trim() ? evaluateAmount(raw) : null);
const show = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n).replace(".", ","));

/**
 * Log or edit a buy, sell or dividend. The TOB box follows the fund's rate × the
 * amount until you type in it yourself (copy the number from Bolero's confirmation);
 * the fee starts at the last trade's fee. "Same as last buy" takes the fund, units and
 * fee of the last buy and the fund's latest close as the price (last time's price would
 * be stale with buys months or years apart).
 */
export function TradeForm({
  funds,
  todayKey,
  trade,
  lastBuy,
  lastFee,
  initialFundId,
  latestClose = {},
}: {
  funds: Fund[];
  todayKey: string;
  /** Editing this trade; none = a new one. */
  trade?: Trade;
  lastBuy?: Trade | null;
  lastFee?: number | null;
  initialFundId?: string | null;
  /** Newest stored close per fund id. */
  latestClose?: Record<string, number>;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState, FormData>(saveTrade, null);
  const [type, setType] = useState<TradeType>(trade?.type ?? "buy");
  const [fundId, setFundId] = useState(trade?.instrumentId ?? initialFundId ?? lastBuy?.instrumentId ?? funds[0]?.id ?? "");
  const [date, setDate] = useState(trade?.date ?? todayKey);
  const [units, setUnits] = useState(show(trade?.units));
  const [price, setPrice] = useState(show(trade?.price));
  const [dividend, setDividend] = useState(show(trade?.amount));
  const [fees, setFees] = useState(show(trade ? trade.fees : (lastFee ?? null)));
  const [tax, setTax] = useState(show(trade?.tax));
  const [taxTouched, setTaxTouched] = useState(Boolean(trade));
  const [note, setNote] = useState(trade?.note ?? "");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [priceFromClose, setPriceFromClose] = useState(false);

  const fund = funds.find((f) => f.id === fundId);
  const u = num(units);
  const p = amount(price);
  const autoTax = type !== "dividend" && fund && u && p ? suggestedTob(u, p, fund.tobRate) : null;
  const shownTax = taxTouched ? tax : show(autoTax);

  const total = useMemo(() => {
    const f = amount(fees) ?? 0;
    const t = amount(shownTax) ?? 0;
    if (type === "dividend") {
      const d = amount(dividend);
      return d === null ? null : d - t;
    }
    if (u === null || p === null) return null;
    return type === "buy" ? u * p + f + t : u * p - f - t;
  }, [type, u, p, fees, shownTax, dividend]);

  useEffect(() => {
    if (state?.ok) router.push(trade ? "/invest/trades" : "/invest");
  }, [state, router, trade]);

  function fillLastBuy() {
    if (!lastBuy) return;
    setType("buy");
    setFundId(lastBuy.instrumentId);
    setUnits(show(lastBuy.units));
    const close = latestClose[lastBuy.instrumentId];
    setPrice(show(close ?? lastBuy.price));
    setPriceFromClose(close !== undefined);
    setFees(show(lastBuy.fees));
    setTaxTouched(false);
  }

  if (funds.length === 0) return null;

  return (
    <form action={action} className="flex flex-col gap-4">
      {trade && <input type="hidden" name="id" value={trade.id} />}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="tax" value={shownTax} />

      <div role="radiogroup" aria-label="Kind of trade" className="grid grid-cols-3 gap-1 rounded-full bg-surface-muted p-1">
        {TRADE_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={`min-h-11 rounded-full px-2 text-sm font-medium ${type === t ? "bg-surface text-foreground shadow-sm" : "text-ink-muted"}`}
          >
            {TRADE_LABELS[t]}
          </button>
        ))}
      </div>

      {!trade && lastBuy && (
        <button type="button" onClick={fillLastBuy} className="btn btn-outline flex min-h-11 self-start px-4 text-sm">
          Same as last buy
        </button>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Fund</span>
        <select name="instrumentId" value={fundId} onChange={(e) => setFundId(e.target.value)} className="field">
          {funds.map((f) => (
            <option key={f.id} value={f.id}>
              {f.ticker} · {f.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Date</span>
        <input type="date" name="date" value={date} max={todayKey} onChange={(e) => setDate(e.target.value)} required className="field" />
      </label>

      {type === "dividend" ? (
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">Dividend (gross)</span>
          <input name="amount" inputMode="decimal" value={dividend} onChange={(e) => setDividend(e.target.value)} placeholder="0,00" className="field" />
        </label>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-ink-muted">Units</span>
            <input name="units" inputMode="decimal" value={units} onChange={(e) => setUnits(e.target.value)} placeholder="0" className="field" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-ink-muted">Price per unit</span>
            <input
              name="price"
              inputMode="decimal"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setPriceFromClose(false);
              }}
              placeholder="0,00"
              className="field"
            />
            {priceFromClose && <span className="text-xs text-ink-muted">Latest close · check Bolero&apos;s confirmation</span>}
          </label>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {type !== "dividend" ? (
          <label className="flex flex-col gap-1">
            <span className="text-sm text-ink-muted">Broker fee</span>
            <input name="fees" inputMode="decimal" value={fees} onChange={(e) => setFees(e.target.value)} placeholder="0,00" className="field" />
          </label>
        ) : (
          <input type="hidden" name="fees" value="0" />
        )}
        <label className="flex flex-col gap-1">
          <span className="text-sm text-ink-muted">{type === "dividend" ? "Tax withheld" : "TOB (tax)"}</span>
          <input
            inputMode="decimal"
            value={shownTax}
            onChange={(e) => {
              setTaxTouched(true);
              setTax(e.target.value);
            }}
            placeholder="0,00"
            className="field"
          />
          {type !== "dividend" && !taxTouched && fund && (
            <span className="text-xs text-ink-muted">{(fund.tobRate * 100).toLocaleString("nl-BE", { maximumFractionDigits: 3 })} % of the amount</span>
          )}
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Note</span>
        <input name="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Optional" className="field" />
      </label>

      {total !== null && (
        <p className="text-sm text-ink-muted">
          {type === "buy" ? "Total paid" : type === "sell" ? "You get" : "Net received"}{" "}
          <span className="font-semibold text-foreground tabular-nums">{formatCurrency(total)}</span>
        </p>
      )}

      {state && !state.ok && (
        <p role="alert" className="text-sm text-critical">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary flex w-full px-4 py-3 text-base font-semibold">
        {pending ? "Saving…" : trade ? "Save changes" : `Save ${TRADE_LABELS[type].toLowerCase()}`}
      </button>
      {trade && (
        <div className="flex">
          <ConfirmButton
            className="min-h-11 px-5 text-sm"
            onConfirm={async () => {
              const res = await deleteTrade(trade.id);
              if (res.ok) router.push("/invest/trades");
              else setDeleteError(res.error);
            }}
          >
            Delete
          </ConfirmButton>
        </div>
      )}
      {deleteError && (
        <p role="alert" className="text-sm text-critical">
          {deleteError}
        </p>
      )}
    </form>
  );
}
