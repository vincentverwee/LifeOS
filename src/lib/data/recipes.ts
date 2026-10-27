import "server-only";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/format";
import type { RecipeIngredient } from "@/lib/recipes/types";

export type SavedRecipeSummary = {
  id: string;
  title: string;
  image: string | null;
  readyInMinutes: number | null;
  /** "YYYY-MM-DD", null = still to make */
  madeOn: string | null;
};

export type SavedRecipeDetail = SavedRecipeSummary & {
  servings: number | null;
  cuisines: string[];
  dishTypes: string[];
  sourceUrl: string | null;
  summary: string | null;
  ingredients: RecipeIngredient[];
  steps: string[];
};

const SUMMARY_SELECT = { id: true, title: true, image: true, readyInMinutes: true, madeOn: true } as const;

function toSummary(row: { id: string; title: string; image: string | null; readyInMinutes: number | null; madeOn: Date | null }): SavedRecipeSummary {
  return { ...row, madeOn: row.madeOn ? dayKey(row.madeOn) : null };
}

/** Still to make (newest liked first) and made (most recently made first). */
export async function getSavedRecipes(): Promise<{ toMake: SavedRecipeSummary[]; made: SavedRecipeSummary[] }> {
  const [toMake, made] = await Promise.all([
    prisma.savedRecipe.findMany({ where: { madeOn: null }, orderBy: { likedAt: "desc" }, select: SUMMARY_SELECT }),
    prisma.savedRecipe.findMany({
      where: { madeOn: { not: null } },
      orderBy: [{ madeOn: "desc" }, { likedAt: "desc" }],
      select: SUMMARY_SELECT,
    }),
  ]);
  return { toMake: toMake.map(toSummary), made: made.map(toSummary) };
}

export async function getSavedRecipe(id: string): Promise<SavedRecipeDetail | null> {
  const row = await prisma.savedRecipe.findUnique({ where: { id } });
  if (!row) return null;
  return {
    ...toSummary(row),
    servings: row.servings,
    cuisines: row.cuisines,
    dishTypes: row.dishTypes,
    sourceUrl: row.sourceUrl,
    summary: row.summary,
    ingredients: row.ingredients as RecipeIngredient[],
    steps: row.steps as string[],
  };
}

export async function getSavedSpoonacularIds(): Promise<Set<number>> {
  const rows = await prisma.savedRecipe.findMany({ select: { spoonacularId: true } });
  return new Set(rows.map((r) => r.spoonacularId));
}

export type RecipesGlance = { cookbook: number; toMake: number; lastMade: string | null };

/** For the home tile. */
export async function getRecipesGlance(): Promise<RecipesGlance> {
  const [cookbook, toMake, lastMade] = await Promise.all([
    prisma.myRecipe.count(),
    prisma.savedRecipe.count({ where: { madeOn: null } }),
    prisma.savedRecipe.findFirst({
      where: { madeOn: { not: null } },
      orderBy: [{ madeOn: "desc" }, { likedAt: "desc" }],
      select: { title: true },
    }),
  ]);
  return { cookbook, toMake, lastMade: lastMade?.title ?? null };
}

export type PantryEntry = { id: string; name: string };

export async function getPantry(): Promise<PantryEntry[]> {
  return prisma.pantryItem.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
}

/** Ingredient names from saved recipes, for autocomplete in the pantry input (costs no API quota). */
export async function getIngredientSuggestions(): Promise<string[]> {
  const rows = await prisma.savedRecipe.findMany({ select: { ingredients: true } });
  const names = new Set<string>();
  for (const row of rows) {
    for (const ingredient of row.ingredients as RecipeIngredient[]) {
      const name = ingredient.name?.trim().toLowerCase();
      if (name) names.add(name);
    }
  }
  return [...names].sort();
}

export type MyRecipeSummary = {
  id: string;
  title: string;
  readyInMinutes: number | null;
  mealType: string | null;
  /** Ingredient lines, for searching the Cookbook. */
  ingredients: string[];
  /** "YYYY-MM-DD", null = never marked as made */
  lastMadeOn: string | null;
};

export type MyRecipeDetail = MyRecipeSummary & {
  servings: number | null;
  steps: string[];
  notes: string | null;
  sourceUrl: string | null;
};

/** The Cookbook, A–Z. */
export async function getMyRecipes(): Promise<MyRecipeSummary[]> {
  const rows = await prisma.myRecipe.findMany({
    orderBy: { title: "asc" },
    select: { id: true, title: true, readyInMinutes: true, mealType: true, ingredients: true, lastMadeOn: true },
  });
  return rows.map((row) => ({ ...row, lastMadeOn: row.lastMadeOn ? dayKey(row.lastMadeOn) : null }));
}

export async function getMyRecipe(id: string): Promise<MyRecipeDetail | null> {
  const row = await prisma.myRecipe.findUnique({ where: { id } });
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    readyInMinutes: row.readyInMinutes,
    mealType: row.mealType,
    ingredients: row.ingredients,
    lastMadeOn: row.lastMadeOn ? dayKey(row.lastMadeOn) : null,
    servings: row.servings,
    steps: row.steps,
    notes: row.notes,
    sourceUrl: row.sourceUrl,
  };
}
