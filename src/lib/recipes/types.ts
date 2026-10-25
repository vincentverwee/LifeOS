export type RecipeIngredient = {
  name: string;
  amount: number;
  unit: string;
  /** The line as written in the recipe, e.g. "2 cloves garlic, minced". */
  original: string;
};

/** One recipe in the swipe deck, and the snapshot stored when it's liked. */
export type RecipeCard = {
  /** Spoonacular recipe id. */
  id: number;
  title: string;
  image: string | null;
  readyInMinutes: number | null;
  servings: number | null;
  cuisines: string[];
  dishTypes: string[];
  sourceUrl: string | null;
  summary: string | null;
  ingredients: RecipeIngredient[];
  steps: string[];
};

export type DeckFilters = {
  cuisine?: string;
  type?: string;
  maxReadyTime?: number;
};

/** `quotaLeft`: Spoonacular points left today, as reported with the batch (null if unknown). */
export type DeckResult = { ok: true; cards: RecipeCard[]; quotaLeft: number | null } | { ok: false; error: string };

export type RecipeInfoResult = { ok: true; card: RecipeCard } | { ok: false; error: string };

/** A recipe from the "what can I make" search, with what you have and what you'd need to buy. */
export type FridgeMatch = {
  /** Spoonacular recipe id. */
  id: number;
  title: string;
  image: string | null;
  used: string[];
  missing: string[];
};

export type FridgeResult = { ok: true; matches: FridgeMatch[] } | { ok: false; error: string };

// Values Spoonacular's complexSearch accepts for `cuisine` and `type`.
export const CUISINES = [
  "Italian",
  "Mexican",
  "Asian",
  "Indian",
  "Thai",
  "Chinese",
  "Japanese",
  "Korean",
  "Vietnamese",
  "French",
  "Greek",
  "Mediterranean",
  "Middle Eastern",
  "Spanish",
  "American",
  "British",
  "Irish",
] as const;

export const MEAL_TYPES = [
  "main course",
  "breakfast",
  "soup",
  "salad",
  "side dish",
  "dessert",
  "snack",
] as const;

export const MAX_TIMES = [15, 30, 45, 60] as const;

/** Reads deck filters from URL search params, ignoring anything unknown. */
export function parseDeckFilters(params: Record<string, string | string[] | undefined>): DeckFilters {
  const one = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : undefined;
  };
  const cuisine = one("cuisine");
  const type = one("type");
  const maxTime = Number(one("maxTime"));
  return {
    cuisine: CUISINES.find((c) => c.toLowerCase() === cuisine?.toLowerCase()),
    type: MEAL_TYPES.find((t) => t === type),
    maxReadyTime: MAX_TIMES.find((m) => m === maxTime),
  };
}
