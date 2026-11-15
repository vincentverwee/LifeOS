"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { knownError } from "@/lib/prismaErrors";
import { parseAmount, parseDateKey } from "@/lib/format";
import { getTodayKey } from "@/lib/today";
import { CATEGORY_COLOR_SLOTS, isCategoryColorSlot } from "@/lib/categoryPalette";
import { toTrade } from "@/lib/data/invest";
import { fetchCloses, refreshFund, refreshPricesIfStale, searchFunds } from "@/lib/data/investPrices";
import { refreshInflationIfStale } from "@/lib/data/inflation";
import { isIsin, normalizeTicker } from "@/lib/invest/prices";
import { addDays, firstOversell } from "@/lib/invest/stats";
import { isTradeType, LIMITS, PRICE_MANUAL_MIN_MS, type FundHit, type Trade } from "@/lib/invest/types";

export type FormState = { ok: true; at: number; id?: string } | { ok: false; error: string } | null;
export type Result = { ok: true } | { ok: false; error: string };

const utc = (key: string) => new Date(`${key}T00:00:00Z`);
const clean = (raw: unknown) => String(raw ?? "").replace(/\s+/g, " ").trim();

function revalidate() {
  revalidatePath("/");
  revalidatePath("/invest", "layout");
}

/** A positive decimal with a comma or a dot ("0,5"), up to `max`; null when invalid. */
function positive(raw: unknown, max: number): number | null {
  const n = Number(String(raw ?? "").trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 && n <= max ? n : null;
}

/** An amount box (calculations allowed); empty = 0. */
function money(raw: unknown, max: number): number | null {
  const s = String(raw ?? "").trim();
  if (!s) return 0;
  const n = parseAmount(s);
  return n !== null && n >= 0 && n <= max ? Math.round(n * 100) / 100 : null;
}

/** Replays the fund's trades with `next` in place of `replaceId` (or without it when null). */
async function oversellError(instrumentId: string, replaceId: string | null, next: Trade | null): Promise<string | null> {
  const rows = await prisma.investmentTx.findMany({ where: { instrumentId } });
  const trades = rows.map(toTrade).filter((t) => t.id !== replaceId);
  if (next) trades.push(next);
  const bad = firstOversell(trades);
  return bad ? `That would sell more units than you held on ${bad.date}.` : null;
}

export async function saveTrade(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAuth();
  const id = clean(formData.get("id")) || null;
  const instrumentId = clean(formData.get("instrumentId"));
  const type = clean(formData.get("type"));
  const date = parseDateKey(formData.get("date"));
  const todayKey = await getTodayKey();
  if (!isTradeType(type)) return { ok: false, error: "Pick buy, sell or dividend." };
  if (!date) return { ok: false, error: "Pick a date." };
  if (date > todayKey) return { ok: false, error: "That date is in the future." };
  const fund = await prisma.instrument.findUnique({ where: { id: instrumentId }, select: { id: true, ticker: true } });
  if (!fund) return { ok: false, error: "Pick a fund." };

  const fees = money(formData.get("fees"), LIMITS.fees);
  const tax = money(formData.get("tax"), LIMITS.fees);
  if (fees === null) return { ok: false, error: "The fee isn't a valid amount." };
  if (tax === null) return { ok: false, error: "The tax isn't a valid amount." };
  const note = clean(formData.get("note"));
  if (note.length > LIMITS.note) return { ok: false, error: `Keep the note to ${LIMITS.note} characters.` };

  let units: number | null = null;
  let price: number | null = null;
  let amount: number | null = null;
  if (type === "dividend") {
    amount = money(formData.get("amount"), LIMITS.amount);
    if (!amount) return { ok: false, error: "Fill in the dividend amount." };
  } else {
    units = positive(formData.get("units"), LIMITS.units);
    const p = parseAmount(String(formData.get("price") ?? ""));
    price = p !== null && p > 0 && p <= LIMITS.price ? p : null;
    if (units === null) return { ok: false, error: "Fill in how many units." };
    if (price === null) return { ok: false, error: "Fill in the price per unit." };
  }

  const trade: Trade = { id: id ?? "new", instrumentId, date, type, units, price, amount, fees, tax, note: note || null };
  if (id) {
    const old = await prisma.investmentTx.findUnique({ where: { id }, select: { instrumentId: true } });
    if (!old) return { ok: false, error: "That trade was deleted in the meantime." };
    // Moving a trade to another fund must also leave the old fund consistent.
    if (old.instrumentId !== instrumentId) {
      const err = await oversellError(old.instrumentId, id, null);
      if (err) return { ok: false, error: err };
    }
  }
  const err = await oversellError(instrumentId, id, trade);
  if (err) return { ok: false, error: err };

  const data = { instrumentId, date: utc(date), type, units, price, amount, fees, tax, note: note || null };
  let savedId: string;
  try {
    savedId = id ? (await prisma.investmentTx.update({ where: { id }, data })).id : (await prisma.investmentTx.create({ data })).id;
  } catch (e) {
    return knownError(e, { P2025: "That trade was deleted in the meantime.", P2003: "That fund was deleted in the meantime." });
  }

  // A trade dated before the stored closes: fetch the older ones so the chart starts right.
  const before = await prisma.instrumentPrice.findFirst({ where: { instrumentId, date: { lte: utc(date) } }, select: { id: true } });
  if (!before) await refreshFund(fund.id, fund.ticker).catch(() => false);

  revalidate();
  return { ok: true, at: Date.now(), id: savedId };
}

export async function deleteTrade(id: string): Promise<Result> {
  await requireAuth();
  const row = await prisma.investmentTx.findUnique({ where: { id }, select: { instrumentId: true } });
  if (!row) return { ok: true };
  const err = await oversellError(row.instrumentId, id, null);
  if (err) return { ok: false, error: `Can't delete: ${err.charAt(0).toLowerCase()}${err.slice(1)}` };
  await prisma.investmentTx.deleteMany({ where: { id } });
  revalidate();
  return { ok: true };
}

/** "0,12" (percent) → 0.0012; empty = the default. */
function tobRate(raw: unknown): number | null | undefined {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 5 ? Math.round(n * 1000) / 100000 : null;
}

function targetPct(raw: unknown): number | null | undefined {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 100) / 100 : undefined;
}

export async function addFund(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAuth();
  const ticker = normalizeTicker(String(formData.get("ticker") ?? ""));
  if (!ticker) return { ok: false, error: "That doesn't look like a ticker (e.g. VWCE.DE)." };
  const target = targetPct(formData.get("targetPct"));
  if (target === undefined) return { ok: false, error: "The target is a percentage from 0 to 100." };
  const rate = tobRate(formData.get("tobRate"));
  if (rate === null) return { ok: false, error: "The TOB rate is a percentage like 0,12." };
  if (await prisma.instrument.findUnique({ where: { ticker }, select: { id: true } })) return { ok: false, error: `${ticker} is already in your list.` };

  const todayKey = await getTodayKey();
  const fetched = await fetchCloses(ticker, addDays(todayKey, -365));
  if (!fetched || fetched.prices.length === 0) return { ok: false, error: `No prices found for ${ticker}. Check the ticker (Yahoo's spelling, e.g. VWCE.DE).` };
  if (fetched.currency && fetched.currency !== "EUR")
    return { ok: false, error: `${ticker} trades in ${fetched.currency}. Pick the euro listing (often .DE or .AS).` };

  const name = clean(formData.get("name")).slice(0, LIMITS.name) || fetched.name?.slice(0, LIMITS.name) || ticker;
  const isinRaw = clean(formData.get("isin")).toUpperCase();
  if (isinRaw && !isIsin(isinRaw)) return { ok: false, error: "That ISIN isn't valid." };
  const used = await prisma.instrument.findMany({ select: { color: true, sortOrder: true } });
  const color = CATEGORY_COLOR_SLOTS.find((c) => !used.some((u) => u.color === c)) ?? CATEGORY_COLOR_SLOTS[used.length % CATEGORY_COLOR_SLOTS.length];
  const sortOrder = used.reduce((m, u) => Math.max(m, u.sortOrder + 1), 0);

  try {
    await prisma.instrument.create({
      data: {
        ticker,
        name,
        isin: isinRaw || null,
        color,
        sortOrder,
        targetPct: target,
        ...(rate !== undefined ? { tobRate: rate } : {}),
        pricesFetchedAt: new Date(),
        prices: { createMany: { data: fetched.prices.map((p) => ({ date: utc(p.date), close: p.close })) } },
      },
    });
  } catch (e) {
    return knownError(e, { P2002: `${ticker} is already in your list.` });
  }
  revalidate();
  return { ok: true, at: Date.now() };
}

export async function updateFund(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAuth();
  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));
  if (!name) return { ok: false, error: "Give the fund a name." };
  if (name.length > LIMITS.name) return { ok: false, error: `Keep the name to ${LIMITS.name} characters.` };
  const target = targetPct(formData.get("targetPct"));
  if (target === undefined) return { ok: false, error: "The target is a percentage from 0 to 100." };
  const rate = tobRate(formData.get("tobRate"));
  if (rate === null) return { ok: false, error: "The TOB rate is a percentage like 0,12." };
  const isinRaw = clean(formData.get("isin")).toUpperCase();
  if (isinRaw && !isIsin(isinRaw)) return { ok: false, error: "That ISIN isn't valid." };
  const color = clean(formData.get("color"));
  try {
    await prisma.instrument.update({
      where: { id },
      data: {
        name,
        isin: isinRaw || null,
        targetPct: target,
        ...(rate !== undefined ? { tobRate: rate } : {}),
        ...(isCategoryColorSlot(color) ? { color } : {}),
      },
    });
  } catch (e) {
    return knownError(e, { P2025: "That fund was deleted in the meantime." });
  }
  revalidate();
  return { ok: true, at: Date.now() };
}

export async function setFundArchived(id: string, archived: boolean): Promise<Result> {
  await requireAuth();
  await prisma.instrument.updateMany({ where: { id }, data: { isArchived: archived } });
  revalidate();
  return { ok: true };
}

/** Only a fund without trades can be deleted (its prices go with it); archive the others. */
export async function deleteFund(id: string): Promise<Result> {
  await requireAuth();
  try {
    await prisma.instrument.deleteMany({ where: { id } });
  } catch (e) {
    return knownError(e, { P2003: "This fund has trades. Archive it instead." });
  }
  revalidate();
  return { ok: true };
}

/** The "Refresh prices" button: does nothing within 10 minutes of the last fetch. */
export async function refreshPrices(): Promise<{ ok: true; refreshed: number; failed: string[] } | { ok: false; error: string }> {
  await requireAuth();
  const newest = await prisma.instrument.findFirst({
    where: { isArchived: false },
    orderBy: { pricesFetchedAt: { sort: "desc", nulls: "last" } },
    select: { pricesFetchedAt: true },
  });
  if (newest?.pricesFetchedAt && Date.now() - newest.pricesFetchedAt.getTime() < PRICE_MANUAL_MIN_MS) {
    return { ok: false, error: "Prices were just updated. Try again in a few minutes." };
  }
  await prisma.instrument.updateMany({ where: { isArchived: false }, data: { pricesFetchedAt: null } });
  const { refreshed, failed } = await refreshPricesIfStale();
  revalidate();
  return { ok: true, refreshed: refreshed.length, failed };
}

/** Settings' search box: Yahoo's matches for an ISIN, name or ticker. */
export async function lookupFunds(query: string): Promise<{ ok: true; hits: FundHit[] } | { ok: false; error: string }> {
  await requireAuth();
  const q = query.trim();
  if (q.length < 2 || q.length > 60) return { ok: false, error: "Type at least two characters." };
  try {
    return { ok: true, hits: await searchFunds(q) };
  } catch {
    return { ok: false, error: "The search didn't answer. Type the ticker instead." };
  }
}

/** The Inflation page's "Fetch now" while no figures are stored (the cron fetches them otherwise). */
export async function fetchInflation(): Promise<Result> {
  await requireAuth();
  try {
    await refreshInflationIfStale();
  } catch {
    return { ok: false, error: "Eurostat didn't answer. Try again in a bit." };
  }
  revalidate();
  return { ok: true };
}
