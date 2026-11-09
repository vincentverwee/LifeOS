"use client";

import { usePathname } from "next/navigation";
import { SectionTabBar } from "@/components/ui/SectionTabBar";
import { ITEMS, OUTFITS, SETTINGS, WASH, isTabActive } from "./nav";

/** Wardrobe's phone tabs; + adds what the tab you're on lists (an outfit on Outfits, else a piece). */
export function WardrobeTabBar() {
  const pathname = usePathname();
  const onOutfits = pathname.startsWith("/wardrobe/outfits");
  const addHref = onOutfits ? "/wardrobe/outfits/add" : "/wardrobe/items/add";
  const onAdd = pathname === addHref;
  return (
    <SectionTabBar
      label="Wardrobe"
      tabs={[
        { ...ITEMS, active: isTabActive(pathname, ITEMS.href) && !onAdd },
        { ...WASH, active: isTabActive(pathname, WASH.href) },
        { ...OUTFITS, active: isTabActive(pathname, OUTFITS.href) && !onAdd },
        { ...SETTINGS, active: isTabActive(pathname, SETTINGS.href) },
      ]}
      add={{ href: addHref, label: onOutfits ? "Add an outfit" : "Add a clothing item", active: onAdd }}
    />
  );
}
