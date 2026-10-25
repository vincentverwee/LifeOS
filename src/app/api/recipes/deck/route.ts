import { isAuthed } from "@/lib/auth";
import { fetchDeck } from "@/lib/recipes/spoonacular";
import { getSavedSpoonacularIds } from "@/lib/data/recipes";
import { parseDeckFilters, type DeckResult } from "@/lib/recipes/types";

/**
 * A fresh batch for the swipe deck, minus recipes that are already saved.
 * A GET route rather than a server action: Next runs actions one at a time per
 * client, so a refill would otherwise wait behind (and block) every like.
 */
export async function GET(request: Request): Promise<Response> {
  if (!(await isAuthed())) {
    const body: DeckResult = { ok: false, error: "Not logged in." };
    return Response.json(body, { status: 401 });
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const [result, saved] = await Promise.all([fetchDeck(parseDeckFilters(params)), getSavedSpoonacularIds()]);
  const body: DeckResult = result.ok ? { ...result, cards: result.cards.filter((card) => !saved.has(card.id)) } : result;
  // Random batches: never cache.
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
