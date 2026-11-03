import { Layers, Shirt, WashingMachine, type LucideIcon } from "lucide-react";

export type WardrobeTab = { href: string; label: string; icon: LucideIcon };

export const WASH: WardrobeTab = { href: "/wardrobe", label: "Wash", icon: WashingMachine };
export const ITEMS: WardrobeTab = { href: "/wardrobe/items", label: "Items", icon: Shirt };
export const OUTFITS: WardrobeTab = { href: "/wardrobe/outfits", label: "Outfits", icon: Layers };

/** Desktop text tabs, in order. */
export const WARDROBE_LINKS = [
  { href: "/wardrobe", label: "Wash" },
  { href: "/wardrobe/items", label: "Items" },
  { href: "/wardrobe/outfits", label: "Outfits" },
];

export function isTabActive(pathname: string, href: string) {
  if (href === "/wardrobe") return pathname === "/wardrobe";
  return pathname.startsWith(href);
}
