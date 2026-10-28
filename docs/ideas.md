# Ideas

Projects to pick up later, next one first.

## Next: Pint map (pub crawl)

- Tag a beer expense with the pub it was bought at: one tap on /budget/add finds where you are by GPS and suggests nearby pubs and bars from OpenStreetMap (Overpass), or type a name.
- A map of the pubs (reusing Waypoint's MapLibre setup), coloured by visits; price per pint per pub and over time; "places you haven't tried yet" from OSM.
- **Decided:** only expenses in beer categories (the category has a `pintPrice`) can get a pub.
- **Likely model:** a new `Pub` table (name, lat/lng, `osmId`) + optional `Expense.pubId` (`onDelete: SetNull`). Needs `db:push` + `apply-checks.ts` on **both** databases (own + cat).
- **Open:**
  1. Real per-pub price. Today pints = amount ÷ the category's `pintPrice` (`src/lib/monthStats.ts`), so every pub would show the same price. Suggestion: a 1/2/3/+ "how many pints" control when a pub is picked, so price per pint = amount ÷ pints.
  2. Where it lives: its own `/pubs` section with a hub tile, or inside Budget.
- **Watch out:** expenses saved offline (outbox) get no GPS or Overpass, so they save without a pub; tag it later from the expense edit.

## Later: Year in Review ("Wrapped")

- A swipeable story of tap-through cards for the year (or a semester), using existing data only: pints bought and how often, the most expensive day, study hours and the best week, km driven and the number of road trips, the recipe cooked most, Last done streaks.
- One shareable image per card (reuse `src/lib/waypoint/useImageExport.ts`, which already handles iOS). The sheep (or the cat) narrates.
- Aim to have it ready by late December 2026.
