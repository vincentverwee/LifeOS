import { BookOpen, Bookmark, Layers, Refrigerator, type LucideIcon } from "lucide-react";

export type RecipesTab = { href: string; label: string; icon: LucideIcon };

export const COOKBOOK: RecipesTab = { href: "/recipes", label: "Cookbook", icon: BookOpen };
export const SWIPE: RecipesTab = { href: "/recipes/swipe", label: "Swipe", icon: Layers };
export const FRIDGE: RecipesTab = { href: "/recipes/fridge", label: "Fridge", icon: Refrigerator };
export const SAVED: RecipesTab = { href: "/recipes/saved", label: "Saved", icon: Bookmark };

/** Desktop text tabs, in order. */
export const RECIPE_LINKS = [
  { href: "/recipes", label: "Cookbook" },
  { href: "/recipes/swipe", label: "Swipe" },
  { href: "/recipes/add", label: "Add" },
  { href: "/recipes/fridge", label: "Fridge" },
  { href: "/recipes/saved", label: "Saved" },
];

const SECTIONS = ["/recipes/swipe", "/recipes/add", "/recipes/fridge", "/recipes/mine"];

/** Cookbook recipes (/recipes/mine/…) belong to Cookbook; saved recipe pages (/recipes/[id]) to Saved. */
export function isTabActive(pathname: string, href: string) {
  if (href === "/recipes") return pathname === href || pathname.startsWith("/recipes/mine");
  if (href === "/recipes/saved") {
    return pathname.startsWith("/recipes/") && !SECTIONS.some((section) => pathname.startsWith(section));
  }
  return pathname.startsWith(href);
}
