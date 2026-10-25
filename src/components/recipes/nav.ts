import { Bookmark, Layers, type LucideIcon } from "lucide-react";

export const RECIPE_TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/recipes", label: "Swipe", icon: Layers },
  { href: "/recipes/saved", label: "Saved", icon: Bookmark },
];

/** Recipe detail pages belong to the Saved tab. */
export function isTabActive(pathname: string, href: string) {
  if (href === "/recipes") return pathname === href;
  return pathname.startsWith("/recipes/");
}
