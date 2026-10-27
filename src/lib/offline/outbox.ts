"use client";

import { createExpense, type ExpensePeriod } from "@/lib/actions/expenses";

/**
 * Expenses saved while offline, kept on the phone until they reach the server.
 * Lives in localStorage (public/offline.html reads the same key to show the count).
 * Each entry's `id` is sent as the expense's clientId, so a retry never saves it twice.
 */
export type PendingExpense = {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  date: string;
  period: ExpensePeriod;
  note: string | null;
  createdAt: string;
  /** set when the server refused it (category deleted, date outside the trip…) */
  error?: string;
};

const KEY = "lifeos-expense-outbox";
// Set when sending failed while the phone said it was online (logged out, server down,
// a page from an older build): reloading or logging in is needed, so it's shown.
const FAILED_KEY = "lifeos-expense-outbox-failed";
const EMPTY: PendingExpense[] = [];
const listeners = new Set<() => void>();
let cache: { raw: string | null; items: PendingExpense[] } = { raw: null, items: EMPTY };

/** A UUID for a new entry; randomUUID only exists on https (not the dev server over the LAN). */
export function newClientId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function readSyncFailed(): boolean {
  try {
    return localStorage.getItem(FAILED_KEY) !== null;
  } catch {
    return false;
  }
}

export const serverSyncFailed = () => false;

export function setSyncFailed(failed: boolean) {
  if (failed === readSyncFailed()) return;
  try {
    if (failed) localStorage.setItem(FAILED_KEY, new Date().toISOString());
    else localStorage.removeItem(FAILED_KEY);
  } catch {
    // blocked storage: the hint just doesn't show
  }
  listeners.forEach((listener) => listener());
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** Current entries; the same array until the stored value changes (for useSyncExternalStore). */
export function readOutbox(): PendingExpense[] {
  const raw = readRaw();
  if (raw !== cache.raw) {
    let items = EMPTY;
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) items = parsed as PendingExpense[];
    } catch {
      // unreadable: treat as empty
    }
    cache = { raw, items };
  }
  return cache.items;
}

export const serverOutbox = (): PendingExpense[] => EMPTY;

function write(items: PendingExpense[]) {
  try {
    if (items.length) localStorage.setItem(KEY, JSON.stringify(items));
    else localStorage.removeItem(KEY);
  } catch {
    // storage full or blocked: nothing more we can do
  }
  listeners.forEach((listener) => listener());
}

export function subscribeOutbox(listener: () => void): () => void {
  listeners.add(listener);
  // Other tabs (and the offline page) change the same key.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === FAILED_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function addToOutbox(item: PendingExpense) {
  write([...readOutbox().filter((i) => i.id !== item.id), item]);
}

export function removeFromOutbox(id: string) {
  write(readOutbox().filter((i) => i.id !== id));
}

let flushing = false;

/**
 * Sends the waiting entries one by one. Accepted → removed; refused → kept with the
 * error so it can be seen and removed; a thrown error (still offline, logged out, an
 * old build) stops the run until the next try, and while online also sets the
 * sync-failed flag (readSyncFailed). Returns how many were saved.
 */
export async function flushOutbox(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let saved = 0;
  try {
    for (const item of readOutbox()) {
      if (item.error) continue;
      let result;
      try {
        result = await createExpense({
          period: item.period,
          categoryId: item.categoryId,
          amount: item.amount,
          date: item.date,
          note: item.note,
          clientId: item.id,
        });
      } catch {
        if (navigator.onLine) setSyncFailed(true);
        break;
      }
      setSyncFailed(false);
      if (result.ok) {
        removeFromOutbox(item.id);
        saved++;
      } else {
        write(readOutbox().map((i) => (i.id === item.id ? { ...i, error: result.error } : i)));
      }
    }
  } finally {
    flushing = false;
  }
  return saved;
}

/** Retries entries the server refused earlier (e.g. after restoring an archived category). */
export function clearOutboxErrors() {
  write(readOutbox().map((item) => ({ ...item, error: undefined })));
}

const subscribeOnline = (listener: () => void) => {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
};

/** useSyncExternalStore arguments for "is the browser online" (server: assume yes). */
export const onlineStore = [subscribeOnline, () => navigator.onLine, () => true] as const;
