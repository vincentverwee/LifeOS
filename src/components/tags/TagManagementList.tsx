"use client";

import { useState, useTransition } from "react";
import type { Tag } from "@/lib/data/tags";
import { archiveTag, deleteTag, reorderTags, unarchiveTag, updateTag } from "@/lib/actions/tags";
import { TAG_COLOR_SLOTS, type TagColorSlot } from "@/lib/tagPalette";
import { TagChip } from "@/components/tags/TagChip";

type TagManagementListProps = {
  initialTags: Tag[];
};

export function TagManagementList({ initialTags }: TagManagementListProps) {
  const [tags, setTags] = useState(initialTags);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= tags.length) return;
    const next = [...tags];
    [next[index], next[target]] = [next[target], next[index]];
    setTags(next);
    startTransition(() => {
      reorderTags({ orderedIds: next.map((t) => t.id) });
    });
  }

  function handleArchiveToggle(tag: Tag) {
    setTags((prev) => prev.map((t) => (t.id === tag.id ? { ...t, isArchived: !t.isArchived } : t)));
    startTransition(() => {
      if (tag.isArchived) unarchiveTag({ id: tag.id });
      else archiveTag({ id: tag.id });
    });
  }

  function handleDelete(tag: Tag) {
    if (tag.expenseCount > 0) return;
    startTransition(async () => {
      const result = await deleteTag({ id: tag.id });
      if (result.ok) setTags((prev) => prev.filter((t) => t.id !== tag.id));
    });
  }

  function handleSaveEdit(tag: Tag, name: string, color: TagColorSlot) {
    setTags((prev) => prev.map((t) => (t.id === tag.id ? { ...t, name, color } : t)));
    setEditingId(null);
    startTransition(() => {
      updateTag({ id: tag.id, name, color });
    });
  }

  return (
    <ul className="flex flex-col gap-2">
      {tags.map((tag, index) => (
        <li
          key={tag.id}
          className={`rounded-xl border border-border bg-surface p-3 ${tag.isArchived ? "opacity-60" : ""}`}
        >
          {editingId === tag.id ? (
            <TagEditRow tag={tag} onSave={(name, color) => handleSaveEdit(tag, name, color)} onCancel={() => setEditingId(null)} />
          ) : (
            <div className="flex items-center justify-between gap-2">
              <TagChip name={tag.name} color={tag.color} />
              <div className="flex items-center gap-1 text-sm">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="px-1 text-ink-muted disabled:opacity-30">
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === tags.length - 1}
                  className="px-1 text-ink-muted disabled:opacity-30"
                >
                  ▼
                </button>
                <button type="button" onClick={() => setEditingId(tag.id)} className="px-2 text-primary">
                  Edit
                </button>
                <button type="button" onClick={() => handleArchiveToggle(tag)} className="px-2 text-ink-muted">
                  {tag.isArchived ? "Unarchive" : "Archive"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(tag)}
                  disabled={tag.expenseCount > 0 || isPending}
                  title={tag.expenseCount > 0 ? "In use — archive instead of deleting" : "Delete"}
                  className="px-2 text-critical disabled:opacity-30"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function TagEditRow({
  tag,
  onSave,
  onCancel,
}: {
  tag: Tag;
  onSave: (name: string, color: TagColorSlot) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState<TagColorSlot>(tag.color);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
        />
        <button
          type="button"
          onClick={() => name.trim() && onSave(name.trim(), color)}
          className="rounded-lg border border-primary bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          Save
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-3 py-2 text-sm text-ink-muted">
          Cancel
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {TAG_COLOR_SLOTS.map((slot) => (
          <button
            key={slot}
            type="button"
            aria-label={slot}
            onClick={() => setColor(slot)}
            className={`h-6 w-6 rounded-full ${color === slot ? "ring-2 ring-primary ring-offset-2 ring-offset-surface" : ""}`}
            style={{ backgroundColor: `var(--color-tag-${slot})` }}
          />
        ))}
      </div>
    </div>
  );
}
