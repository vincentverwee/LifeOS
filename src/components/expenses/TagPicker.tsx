"use client";

import { useState } from "react";
import type { Tag } from "@/lib/data/tags";
import { TagChip } from "@/components/tags/TagChip";

type TagPickerProps = {
  tags: Tag[];
  selectedIds: string[];
  onToggle: (id: string) => void;
};

export function TagPicker({ tags, selectedIds, onToggle }: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-sm font-medium text-primary"
      >
        {selectedIds.length > 0 ? `Tags (${selectedIds.length})` : "+ Add tags"}
      </button>
    );
  }

  const filtered = tags.filter((tag) => tag.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Tags</p>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-ink-muted">
          Done
        </button>
      </div>

      {tags.length > 8 && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tags"
          className="mb-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
        />
      )}

      <div className="flex flex-wrap gap-2">
        {filtered.map((tag) => (
          <TagChip
            key={tag.id}
            name={tag.name}
            color={tag.color}
            selected={selectedIds.includes(tag.id)}
            onClick={() => onToggle(tag.id)}
          />
        ))}
        {filtered.length === 0 && <p className="text-sm text-ink-muted">No tags match.</p>}
      </div>
    </div>
  );
}
