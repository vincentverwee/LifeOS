# Ideas

Projects to pick up later, next one first.

## Done: Pint map → the Beer section (/beer)

Built 2026-10-29: pub picker with OpenStreetMap Nearby + typing, a pints stepper for real prices per pub, its own section with map. See CLAUDE.md ("Beer").

## Done: Birthdays & gifts → the People contact book (/people)

Built 2026-10-30: everyone A–Z with groups and search, optional birthday (countdown, digest lines 7/1/0 days ahead), "Saw them today" with a catch-up nudge, things to remember, dated notes, gift ideas Idea → Bought → Given with a per-year history. See CLAUDE.md ("People"). Possible follow-ups: log a bought gift as an expense, other yearly occasions per person.

## Done: Wardrobe (/wardrobe)

Built 2026-11: clothes with photos (cut-outs kept see-through), the wash basket and drying rack, outfits with "Wore this today". See CLAUDE.md ("Wardrobe").

## Done: One line a day + "On this day" (/diary)

Built 2026-11-03: one line a day with an optional mood, a Home tile, and "On this day" that puts earlier years' lines next to beers, trips, study, outfits and recipes from the same date. See CLAUDE.md ("Diary"). Possible follow-ups: an "On this day" line in the morning digest, a reminder push at night when nothing is written, keeping every recipe make (not just the last).

## Done: Section mascots + Weekly review (/review)

Built 2026-11-08 after looking at other "LifeOS" projects: every section's sheep/cat gets a prop and a name (tweaked on /mascots), and the week is told as tap-through cards narrated by them, ending on a "win of the week". Also a System/Light/Dark switch in Settings. See CLAUDE.md ("Mascots", "Weekly review").

## Done: Living mascots

Built 2026-11-08: Home tile and quick-column mascots take a mood from your data (happy / sleepy / worried, see `src/lib/mascotMood.ts`), bob and blink, say a line when tapped, and show their name under the section. Penny traded the monocle for a tie; People is Dolly, Waypoint Ewe-lysses / Marco Purrlo.

## Ideas from other LifeOS projects (2026-11-08)

Looked at lifeos-app/lifeos (RPG habits, habit garden), manthanmtg/LifeOS (18 modules), Princeu3/LifeOS (body tracking, cross-domain insights), djaiss/journalOS (daily check-in modules), jontkaufman/LifeOS (weekly reviews, Wheel of Life), Aurboda (MCP access for Claude).

- "What goes with a good day": diary mood next to pints, study hours, people seen, spend, weather (data is all there already).
- One-tap energy + hours slept next to the diary mood (feeds the above).
- Save the day's weather with each diary day, so On this day can say "3°, rain".
- Bookshelf / reading list; shopping list fed by the Fridge's "Buy 1–2 things"; gym / workouts; savings and net worth over time (`SavingsEntry` has no entry UI yet).
- Ask Claude about your data (an MCP endpoint).

## Later: Year in Review ("Wrapped")

- A swipeable story of tap-through cards for the year (or a semester), using existing data only: pints bought and how often, the most expensive day, study hours and the best week, km driven and the number of road trips, the recipe cooked most, Last done streaks.
- One shareable image per card (reuse `src/lib/waypoint/useImageExport.ts`, which already handles iOS). The sheep (or the cat) narrates.
- Found "boring" on 2026-10-30; parked rather than next.

## Tile ideas not built yet (2026-10-30)

- Sky tile: NASA Astronomy Picture of the Day (fetched from the browser, cached) + moon phase, sunrise/sunset, ISS passes.
- Pet sheep/cat with moods from what you logged.
- Countdowns; bucket list; dinner/pub decider wheel; plant/pet care (≈ Last done); daily puzzle with a streak.
