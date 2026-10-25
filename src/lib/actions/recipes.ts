"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fetchRecipeInfo, findByIngredients } from "@/lib/recipes/spoonacular";
import { getSavedSpoonacularIds } from "@/lib/data/recipes";
import { parseDateKey } from "@/lib/format";
import { getTodayKey } from "@/lib/today";
import type { FridgeMatch, RecipeCard, RecipeIngredient, RecipeInfoResult } from "@/lib/recipes/types";

export type RecipeResult = { ok: true } | { ok: false; error: string };

// The deck itself loads through GET /api/recipes/deck (see that route for why).

const str = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 100_000 ? value : null;
const strList = (value: unknown, maxItems: number, maxLength: number): string[] =>
  Array.isArray(value) ? value.map((v) => str(v, maxLength)).filter((v): v is string => v !== null).slice(0, maxItems) : [];
/** Only Spoonacular's image host: next/image refuses (and breaks the page on) any other. */
const image = (value: unknown): string | null => {
  const url = str(value, 500);
  return url && url.startsWith("https://img.spoonacular.com/") ? url : null;
};
const link = (value: unknown): string | null => {
  const url = str(value, 1000);
  return url && (url.startsWith("https://") || url.startsWith("http://")) ? url : null;
};

/** Right swipe: stores a snapshot of the recipe in the saved list. */
export async function likeRecipe(card: RecipeCard): Promise<RecipeResult> {
  await requireAuth();
  // The snapshot comes from the browser, so keep only well-formed, bounded fields.
  const title = str(card?.title, 200);
  if (!Number.isInteger(card?.id) || card.id <= 0 || !title) return { ok: false, error: "That recipe looks broken." };
  const ingredients: RecipeIngredient[] = (Array.isArray(card.ingredients) ? card.ingredients : [])
    .slice(0, 100)
    .map((i) => ({
      name: str(i?.name, 120) ?? "",
      amount: num(i?.amount) ?? 0,
      unit: str(i?.unit, 40) ?? "",
      original: str(i?.original, 300) ?? str(i?.name, 120) ?? "",
    }))
    .filter((i) => i.name || i.original);
  const data = {
    title,
    image: image(card.image),
    readyInMinutes: num(card.readyInMinutes),
    servings: num(card.servings),
    cuisines: strList(card.cuisines, 20, 60),
    dishTypes: strList(card.dishTypes, 20, 60),
    sourceUrl: link(card.sourceUrl),
    summary: str(card.summary, 5000),
    ingredients,
    steps: strList(card.steps, 100, 2000),
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
  await requireAuth();
  if (date !== null) {
    if (!parseDateKey(date)) return { ok: false, error: "Pick a date." };
    if (date > (await getTodayKey())) return { ok: false, error: "That date is in the future." };
  }
  const { count } = await prisma.savedRecipe.updateMany({
    where: { id },
    data: { madeOn: date ? new Date(`${date}T00:00:00Z`) : null },
  });
  if (count === 0) return { ok: false, error: "That recipe is no longer saved." };
  revalidateRecipeRoutes();
  return { ok: true };
}

/**
 * Removes a saved recipe and goes back to the saved list. The redirect happens
 * here, in the same response: re-rendering the detail page of a recipe that no
 * longer exists would flash the 404 page first.
 */
export async function removeSavedRecipe(id: string): Promise<RecipeResult> {
  await requireAuth();
  const { count } = await prisma.savedRecipe.deleteMany({ where: { id } });
  if (count === 0) return { ok: false, error: "That recipe is no longer saved." };
  revalidatePath("/");
  revalidatePath("/recipes/fridge");
  redirect("/recipes/saved");
}

/** Full recipe for a search result (1 API point, cached for an hour). */
export async function getRecipeInfo(spoonacularId: number): Promise<RecipeInfoResult> {
  await requireAuth();
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
  await requireAuth();
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
  await requireAuth();
  const names = [...new Set(raw.split(/[,\n]/).map((n) => n.trim().toLowerCase()).filter(Boolean))];
  if (names.length === 0) return { ok: false, error: "Type an ingredient." };
  if (names.some((n) => n.length > 60)) return { ok: false, error: "That ingredient name is too long." };
  await prisma.pantryItem.createMany({ data: names.map((name) => ({ name })), skipDuplicates: true });
  revalidatePath("/recipes/fridge");
  return { ok: true };
}

export async function removePantryItem(id: string): Promise<RecipeResult> {
  await requireAuth();
  await prisma.pantryItem.deleteMany({ where: { id } });
  revalidatePath("/recipes/fridge");
  return { ok: true };
}

export async function clearPantry(): Promise<RecipeResult> {
  await requireAuth();
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
