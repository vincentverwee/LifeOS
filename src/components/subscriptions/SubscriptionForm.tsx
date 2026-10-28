"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSubscription, updateSubscription } from "@/lib/actions/subscriptions";
import { anchorsFrom, describeSchedule, SUBSCRIPTION_REPEATS, type Subscription, type SubscriptionRepeat } from "@/lib/subscriptions/schedule";
import { parseDateKey } from "@/lib/format";
import type { CategoryColorSlot } from "@/lib/categoryPalette";
import { CategoryGrid } from "@/components/expenses/CategoryGrid";
import { SheepSpinner } from "@/components/icons/SheepSpinner";

type CategoryOption = { id: string; name: string; color: CategoryColorSlot };

const input = "rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground";
const REPEAT_LABELS: Record<SubscriptionRepeat, string> = { monthly: "Monthly", yearly: "Yearly" };

/** Add (no `subscription`) or edit one. The next charge date sets the day it renews on. */
export function SubscriptionForm({
  subscription,
  categories: initialCategories,
  todayKey,
}: {
  subscription?: Subscription;
  categories: CategoryOption[];
  todayKey: string;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState(subscription?.name ?? "");
  const [amount, setAmount] = useState(subscription ? String(subscription.amount).replace(".", ",") : "");
  const [repeat, setRepeat] = useState<SubscriptionRepeat>(subscription?.repeat ?? "monthly");
  const [nextDueOn, setNextDueOn] = useState(subscription?.nextDueOn ?? todayKey);
  const [categoryId, setCategoryId] = useState<string | null>(subscription?.categoryId ?? null);
  const [note, setNote] = useState(subscription?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const date = parseDateKey(nextDueOn);
  const hint = date ? `${describeSchedule({ repeat, ...anchorsFrom(date, repeat) })}, next on that date.` : "Pick the date of the next charge.";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!categoryId) return setError("Pick a category.");
    setError(null);
    setAdded(null);
    const fields = { name, amount, categoryId, repeat, nextDueOn, note };
    startTransition(async () => {
      const result = subscription ? await updateSubscription(subscription.id, fields) : await createSubscription(fields);
      if (!result.ok) return setError(result.error);
      if (subscription) {
        router.push("/budget/subscriptions");
        return;
      }
      setAdded(name.trim());
      setName("");
      setAmount("");
      setNote("");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-sm text-ink-muted">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoComplete="off"
            placeholder="Spotify"
            className={input}
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-sm text-ink-muted">Price (€)</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            autoComplete="off"
            placeholder="10,99"
            className={`${input} font-mono tabular-nums`}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-ink-muted">Renews</span>
        <div className="flex gap-1 rounded-full bg-surface-muted p-1">
          {SUBSCRIPTION_REPEATS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRepeat(value)}
              aria-pressed={repeat === value}
              className={`btn flex min-h-11 flex-1 px-3 text-sm ${
                repeat === value ? "bg-surface text-foreground shadow-sm" : "text-ink-muted hover:text-foreground"
              }`}
            >
              {REPEAT_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Next charge</span>
        <input type="date" value={nextDueOn} onChange={(e) => setNextDueOn(e.target.value)} className={input} />
        <span className="text-sm text-ink-muted">{hint}</span>
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-ink-muted">Category</span>
        <CategoryGrid
          categories={categories}
          selectedId={categoryId}
          onSelect={setCategoryId}
          onCreated={(category) => {
            setCategories((prev) => [...prev, category]);
            setCategoryId(category.id);
          }}
        />
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Note (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Family plan" className={input} />
      </label>

      {error && <p className="text-sm text-critical">{error}</p>}
      {added && <p className="text-sm text-positive-text">✓ {added} added.</p>}

      <button type="submit" disabled={isPending} className="btn btn-primary flex w-full px-4 py-3 text-base font-semibold">
        {isPending ? <SheepSpinner size={20} /> : subscription ? "Save changes" : "Add subscription"}
      </button>
    </form>
  );
}
