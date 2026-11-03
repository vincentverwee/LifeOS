import { Layers, Settings, Shirt, WashingMachine, type LucideIcon } from "lucide-react";

export type WardrobeTab = { href: string; label: string; icon: LucideIcon };

export const WASH: WardrobeTab = { href: "/wardrobe/wash", label: "Wash", icon: WashingMachine };
export const ITEMS: WardrobeTab = { href: "/wardrobe/items", label: "Items", icon: Shirt };
export const OUTFITS: WardrobeTab = { href: "/wardrobe/outfits", label: "Outfits", icon: Layers };
export const SETTINGS: WardrobeTab = { href: "/wardrobe/settings", label: "Settings", icon: Settings };

/** Desktop text tabs, in order (Items first: Wardrobe opens there). */
export const WARDROBE_LINKS = [
  { href: "/wardrobe/items", label: "Items" },
  { href: "/wardrobe/wash", label: "Wash" },
  { href: "/wardrobe/outfits", label: "Outfits" },
  { href: "/wardrobe/settings", label: "Settings" },
];

export function isTabActive(pathname: string, href: string) {
  return pathname.startsWith(href);
}
