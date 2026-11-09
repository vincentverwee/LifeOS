"use client";

import { usePathname } from "next/navigation";
import { SectionTabBar } from "@/components/ui/SectionTabBar";
import { COOKBOOK, FRIDGE, SAVED, SWIPE, isTabActive } from "./nav";

/** Recipes' phone tabs; + adds a recipe to the cookbook. */
export function RecipesTabBar() {
  const pathname = usePathname();
  const t = (tab: typeof COOKBOOK) => ({ ...tab, active: isTabActive(pathname, tab.href) });
  return (
    <SectionTabBar
      label="Recipes"
      tabs={[t(COOKBOOK), t(SWIPE), t(FRIDGE), t(SAVED)]}
      add={{ href: "/recipes/add", label: "Add a recipe", active: pathname.startsWith("/recipes/add") }}
    />
  );
}
