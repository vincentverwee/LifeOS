"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CategorySpendTotal } from "@/lib/data/categoryAnalytics";
import { CategoryChip } from "@/components/categories/CategoryChip";

type CategorySelectorProps = {
  categories: CategorySpendTotal[];
  activeCategoryId: string;
};

export function CategorySelector({ categories, activeCategoryId }: CategorySelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("category", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {categories.map((category) => (
        <CategoryChip
          key={category.id}
          name={category.name}
          color={category.color}
          selected={category.id === activeCategoryId}
          onClick={() => select(category.id)}
        />
      ))}
    </div>
  );
}
