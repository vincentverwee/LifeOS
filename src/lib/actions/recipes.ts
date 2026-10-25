"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { fetchDeck } from "@/lib/recipes/spoonacular";
import { getSavedSpoonacularIds } from "@/lib/data/recipes";
import type { DeckFilters, DeckResult, RecipeCard } from "@/lib/recipes/types";

export type RecipeResult = { ok: true } | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A fresh batch for the swipe deck, minus recipes that are already saved. */
export async function loadDeck(filters: DeckFilters): Promise<DeckResult> {
  const [result, saved] = await Promise.all([fetchDeck(filters), getSavedSpoonacularIds()]);
  if (!result.ok) return result;
  return { ok: true, cards: result.cards.filter((card) => !saved.has(card.id)) };
}

/** Right swipe: stores a snapshot of the recipe in the saved list. */
export async function likeRecipe(card: RecipeCard): Promise<RecipeResult> {
  if (!Number.isInteger(card.id) || !card.title?.trim()) return { ok: false, error: "That recipe looks broken." };
  const data = {
    title: card.title.trim(),
    image: card.image,
    readyInMinutes: card.readyInMinutes,
    servings: card.servings,
    cuisines: card.cuisines,
    dishTypes: card.dishTypes,
    sourceUrl: card.sourceUrl,
    summary: card.summary,
    ingredients: card.ingredients,
    steps: card.steps,
  };
  await prisma.savedRecipe.upsert({
    where: { spoonacularId: card.id },
    create: { spoonacularId: card.id, ...data },
    update: data,
  });
  revalidateRecipeRoutes();
  return { ok: true };
}

/** Sets the day a recipe was made, or clears it (`null`) to put it back on the list. */
export async function markRecipeMade(id: string, date: string | null): Promise<RecipeResult> {
  if (date !== null && !DATE_RE.test(date)) return { ok: false, error: "Pick a date." };
  const existing = await prisma.savedRecipe.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, error: "That recipe is no longer saved." };
  await prisma.savedRecipe.update({
    where: { id },
    data: { madeOn: date ? new Date(`${date}T00:00:00Z`) : null },
  });
  revalidateRecipeRoutes();
  return { ok: true };
}

export async function removeSavedRecipe(id: string): Promise<RecipeResult> {
  const existing = await prisma.savedRecipe.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, error: "That recipe is no longer saved." };
  await prisma.savedRecipe.delete({ where: { id } });
  revalidateRecipeRoutes();
  return { ok: true };
}

function revalidateRecipeRoutes() {
  revalidatePath("/");
  revalidatePath("/recipes/saved");
  revalidatePath("/recipes/[id]", "page");
}
