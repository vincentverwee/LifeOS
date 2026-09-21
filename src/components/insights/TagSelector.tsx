"use client";

import { usePathname, useRouter } from "next/navigation";
import type { Tag } from "@/lib/data/tags";
import { TagChip } from "@/components/tags/TagChip";

type TagSelectorProps = {
  tags: Tag[];
  activeTagId: string;
};

export function TagSelector({ tags, activeTagId }: TagSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {tags.map((tag) => (
        <TagChip
          key={tag.id}
          name={tag.name}
          color={tag.color}
          selected={tag.id === activeTagId}
          onClick={() => router.push(`${pathname}?tag=${encodeURIComponent(tag.id)}`)}
        />
      ))}
    </div>
  );
}
