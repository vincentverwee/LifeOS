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

export type RecipesGlance = { toMake: number; lastMade: string | null };

/** For the home tile. */
export async function getRecipesGlance(): Promise<RecipesGlance> {
  const [toMake, lastMade] = await Promise.all([
    prisma.savedRecipe.count({ where: { madeOn: null } }),
    prisma.savedRecipe.findFirst({
      where: { madeOn: { not: null } },
      orderBy: [{ madeOn: "desc" }, { likedAt: "desc" }],
      select: { title: true },
    }),
  ]);
  return { toMake, lastMade: lastMade?.title ?? null };
}
