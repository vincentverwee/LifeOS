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
const EMPTY: PendingExpense[] = [];
const listeners = new Set<() => void>();
let cache: { raw: string | null; items: PendingExpense[] } = { raw: null, items: EMPTY };

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
    if (e.key === KEY) listener();
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
 * old build) stops the run until the next try. Returns how many were saved.
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
        break;
      }
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
