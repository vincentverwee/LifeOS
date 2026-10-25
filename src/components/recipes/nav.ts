import { Bookmark, Layers, Refrigerator, type LucideIcon } from "lucide-react";

export const RECIPE_TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/recipes", label: "Swipe", icon: Layers },
  { href: "/recipes/fridge", label: "Fridge", icon: Refrigerator },
  { href: "/recipes/saved", label: "Saved", icon: Bookmark },
];

/** Recipe detail pages (/recipes/[id]) belong to the Saved tab. */
export function isTabActive(pathname: string, href: string) {
  if (href === "/recipes") return pathname === href;
  if (href === "/recipes/fridge") return pathname.startsWith(href);
  return pathname.startsWith("/recipes/") && !pathname.startsWith("/recipes/fridge");
}
