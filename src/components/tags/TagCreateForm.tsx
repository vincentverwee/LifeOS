"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createTag } from "@/lib/actions/tags";
import { TAG_COLOR_SLOTS, type TagColorSlot } from "@/lib/tagPalette";

export function TagCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState<TagColorSlot>(TAG_COLOR_SLOTS[0]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result = await createTag({ name: trimmed, color });
      if (result.ok) {
        setName("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-2 text-sm font-medium text-foreground">New tag</p>
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tag name"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!name.trim() || isPending}
          className="rounded-lg border border-primary bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Add tag
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {TAG_COLOR_SLOTS.map((slot) => (
          <button
            key={slot}
            type="button"
            aria-label={slot}
            onClick={() => setColor(slot)}
            className={`h-7 w-7 rounded-full ${color === slot ? "ring-2 ring-primary ring-offset-2 ring-offset-surface" : ""}`}
            style={{ backgroundColor: `var(--color-tag-${slot})` }}
          />
        ))}
      </div>

      {error && <p className="mt-2 text-sm text-critical">{error}</p>}
    </div>
  );
}
