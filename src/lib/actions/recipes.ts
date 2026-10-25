"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { fetchDeck, fetchRecipeInfo, findByIngredients } from "@/lib/recipes/spoonacular";
import { getSavedSpoonacularIds } from "@/lib/data/recipes";
import type { DeckFilters, DeckResult, FridgeMatch, RecipeCard, RecipeInfoResult } from "@/lib/recipes/types";

export type RecipeResult = { ok: true } | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A fresh batch for the swipe deck, minus recipes that are already saved. */
export async function loadDeck(filters: DeckFilters): Promise<DeckResult> {
  const [result, saved] = await Promise.all([fetchDeck(filters), getSavedSpoonacularIds()]);
  if (!result.ok) return result;
  return { ...result, cards: result.cards.filter((card) => !saved.has(card.id)) };
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

/** Full recipe for a search result (1 API point, cached for an hour). */
export async function getRecipeInfo(spoonacularId: number): Promise<RecipeInfoResult> {
  if (!Number.isInteger(spoonacularId)) return { ok: false, error: "That recipe looks broken." };
  return fetchRecipeInfo(spoonacularId);
}

export type FridgeSearchResult =
  | { ok: true; matches: FridgeMatch[]; savedIds: number[]; searched: string[] }
  | { ok: false; error: string };

/**
 * "What can I make" with the current pantry. Only runs when you press the button, so editing
 * the list costs no quota; the same list again within an hour is served from cache.
 */
export async function searchFridge(): Promise<FridgeSearchResult> {
  const pantry = await prisma.pantryItem.findMany({ select: { name: true } });
  if (pantry.length === 0) return { ok: false, error: "Add some ingredients first." };
  const names = pantry.map((p) => p.name);
  const [result, saved] = await Promise.all([findByIngredients(names), getSavedSpoonacularIds()]);
  if (!result.ok) return result;
  return {
    ok: true,
    // Only matches that use at least one of your ingredients.
    matches: result.matches.filter((m) => m.used.length > 0),
    savedIds: [...saved],
    searched: names,
  };
}

/** Adds one or more ingredients ("eggs, spinach" or one per line) to the pantry. */
export async function addPantryItems(raw: string): Promise<RecipeResult> {
  const names = [...new Set(raw.split(/[,\n]/).map((n) => n.trim().toLowerCase()).filter(Boolean))];
  if (names.length === 0) return { ok: false, error: "Type an ingredient." };
  if (names.some((n) => n.length > 60)) return { ok: false, error: "That ingredient name is too long." };
  await prisma.pantryItem.createMany({ data: names.map((name) => ({ name })), skipDuplicates: true });
  revalidatePath("/recipes/fridge");
  return { ok: true };
}

export async function removePantryItem(id: string): Promise<RecipeResult> {
  await prisma.pantryItem.deleteMany({ where: { id } });
  revalidatePath("/recipes/fridge");
  return { ok: true };
}

export async function clearPantry(): Promise<RecipeResult> {
  await prisma.pantryItem.deleteMany();
  revalidatePath("/recipes/fridge");
  return { ok: true };
}

function revalidateRecipeRoutes() {
  revalidatePath("/");
  revalidatePath("/recipes/saved");
  revalidatePath("/recipes/fridge");
  revalidatePath("/recipes/[id]", "page");
}
