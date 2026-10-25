import "server-only";
import type { DeckFilters, DeckResult, FridgeResult, RecipeCard, RecipeIngredient, RecipeInfoResult } from "./types";

const API = "https://api.spoonacular.com";
const BATCH_SIZE = 10;

// The subset of complexSearch's response (with addRecipeInformation +
// fillIngredients) that the deck uses.
type ApiRecipe = {
  id: number;
  title: string;
  image?: string;
  readyInMinutes?: number;
  servings?: number;
  cuisines?: string[];
  dishTypes?: string[];
  sourceUrl?: string;
  summary?: string;
  extendedIngredients?: { name?: string; amount?: number; unit?: string; original?: string }[];
  analyzedInstructions?: { steps?: { step?: string }[] }[];
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function toCard(r: ApiRecipe): RecipeCard {
  const ingredients: RecipeIngredient[] = (r.extendedIngredients ?? []).map((i) => ({
    name: i.name ?? "",
    amount: i.amount ?? 0,
    unit: i.unit ?? "",
    original: i.original ?? i.name ?? "",
  }));
  const steps = (r.analyzedInstructions ?? [])
    .flatMap((block) => block.steps ?? [])
    .map((s) => s.step?.trim() ?? "")
    .filter(Boolean);
  return {
    id: r.id,
    title: r.title,
    image: r.image ?? null,
    readyInMinutes: r.readyInMinutes ?? null,
    servings: r.servings ?? null,
    cuisines: r.cuisines ?? [],
    dishTypes: r.dishTypes ?? [],
    sourceUrl: r.sourceUrl ?? null,
    summary: r.summary ? stripHtml(r.summary) : null,
    ingredients,
    steps,
  };
}

type ApiResult<T> = { ok: true; data: T; quotaLeft: number | null } | { ok: false; error: string };

/**
 * GET a Spoonacular endpoint and parse the JSON, turning every failure into a
 * readable message. `revalidate` (seconds) lets Next cache identical requests,
 * which costs no quota; Spoonacular allows caching for up to an hour.
 */
async function apiGet<T>(path: string, params: Record<string, string>, revalidate?: number): Promise<ApiResult<T>> {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return { ok: false, error: "No Spoonacular API key configured (SPOONACULAR_API_KEY)." };

  const query = new URLSearchParams({ ...params, apiKey });
  let res: Response;
  try {
    res = await fetch(`${API}${path}?${query}`, revalidate ? { next: { revalidate } } : { cache: "no-store" });
  } catch {
    return { ok: false, error: "Couldn't reach the recipe service. Check your connection." };
  }

  if (res.status === 402) return { ok: false, error: "Daily recipe quota used up — try again tomorrow." };
  if (res.status === 401) return { ok: false, error: "The Spoonacular API key was rejected." };
  if (res.status === 404) return { ok: false, error: "That recipe doesn't exist anymore." };
  if (!res.ok) return { ok: false, error: `The recipe service answered ${res.status}. Try again.` };

  // Stale for cached responses, so only uncached calls (the deck) show it.
  const quotaLeft = Number.parseFloat(res.headers.get("X-API-Quota-Left") ?? "");
  try {
    return { ok: true, data: (await res.json()) as T, quotaLeft: Number.isFinite(quotaLeft) ? quotaLeft : null };
  } catch {
    return { ok: false, error: "The recipe service sent something unexpected. Try again." };
  }
}

/** A random batch of recipes matching the filters. Never throws. */
export async function fetchDeck(filters: DeckFilters): Promise<DeckResult> {
  const params: Record<string, string> = {
    sort: "random",
    number: String(BATCH_SIZE),
    addRecipeInformation: "true",
    fillIngredients: "true",
    instructionsRequired: "true",
  };
  if (filters.cuisine) params.cuisine = filters.cuisine;
  if (filters.type) params.type = filters.type;
  if (filters.maxReadyTime) params.maxReadyTime = String(filters.maxReadyTime);

  // Random on purpose, so never cached.
  const result = await apiGet<{ results?: ApiRecipe[] }>("/recipes/complexSearch", params);
  if (!result.ok) return result;
  return { ok: true, cards: (result.data.results ?? []).map(toCard), quotaLeft: result.quotaLeft };
}

type ApiFridgeMatch = {
  id: number;
  title: string;
  image?: string;
  usedIngredients?: { name?: string }[];
  missedIngredients?: { name?: string }[];
};

const names = (list?: { name?: string }[]) => [...new Set((list ?? []).map((i) => i.name?.trim() ?? "").filter(Boolean))];

/**
 * Recipes that use what's in the pantry, fewest missing ingredients first.
 * Salt, water, flour and other basics don't count as missing (`ignorePantry`).
 */
export async function findByIngredients(ingredients: string[]): Promise<FridgeResult> {
  const result = await apiGet<ApiFridgeMatch[]>(
    "/recipes/findByIngredients",
    {
      // Sorted, so the same pantry always hits the same cache entry.
      ingredients: [...ingredients].sort().join(","),
      number: "30",
      ranking: "2",
      ignorePantry: "true",
    },
    3600,
  );
  if (!result.ok) return result;
  return {
    ok: true,
    matches: result.data.map((m) => ({
      id: m.id,
      title: m.title,
      image: m.image ?? null,
      used: names(m.usedIngredients),
      missing: names(m.missedIngredients),
    })),
  };
}

/** The full recipe, for the detail sheet and for saving a search result. */
export async function fetchRecipeInfo(id: number): Promise<RecipeInfoResult> {
  const result = await apiGet<ApiRecipe>(`/recipes/${id}/information`, { includeNutrition: "false" }, 3600);
  if (!result.ok) return result;
  return { ok: true, card: toCard(result.data) };
}
