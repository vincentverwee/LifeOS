import "server-only";
import type { DeckFilters, DeckResult, RecipeCard, RecipeIngredient } from "./types";

const SEARCH_URL = "https://api.spoonacular.com/recipes/complexSearch";
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

/** A random batch of recipes matching the filters. Never throws. */
export async function fetchDeck(filters: DeckFilters): Promise<DeckResult> {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return { ok: false, error: "No Spoonacular API key configured (SPOONACULAR_API_KEY)." };

  const params = new URLSearchParams({
    apiKey,
    sort: "random",
    number: String(BATCH_SIZE),
    addRecipeInformation: "true",
    fillIngredients: "true",
    instructionsRequired: "true",
  });
  if (filters.cuisine) params.set("cuisine", filters.cuisine);
  if (filters.type) params.set("type", filters.type);
  if (filters.maxReadyTime) params.set("maxReadyTime", String(filters.maxReadyTime));

  let res: Response;
  try {
    res = await fetch(`${SEARCH_URL}?${params}`, { cache: "no-store" });
  } catch {
    return { ok: false, error: "Couldn't reach the recipe service. Check your connection." };
  }

  if (res.status === 402) return { ok: false, error: "Daily recipe quota used up — try again tomorrow." };
  if (res.status === 401) return { ok: false, error: "The Spoonacular API key was rejected." };
  if (!res.ok) return { ok: false, error: `The recipe service answered ${res.status}. Try again.` };

  try {
    const body = (await res.json()) as { results?: ApiRecipe[] };
    return { ok: true, cards: (body.results ?? []).map(toCard) };
  } catch {
    return { ok: false, error: "The recipe service sent something unexpected. Try again." };
  }
}
