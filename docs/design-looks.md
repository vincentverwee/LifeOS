# Design looks (ideas, Nov 2026)

Directions for a more refined LifeOS, tried as Home mockups on `/preview`.

**Picked (live since 2026-11-09): Bento Glass**, see below. The real Home (`HomeContent`) is built
in that style; the mockup stays on `/preview?look=bento-glass` for comparison.

**See them all:** `/preview?look=<id>` with `bento-glass`, `refined`, `widgets`, `bento`, `agenda`,
`compact`, `pastel`, `glass`, `notebook`, `mono`, `soft`, `ink`, `midnight`, `editorial`
(add `&frame=full` for full width, `&mode=dark|light` for the mockups drawn in both, `&slot=dawn|day|dusk|night`
for another time of day's hero).
Filled with today's real numbers from `getHomeSnapshot()` (`src/lib/data/homeSnapshot.ts`), one
flat summary per section that every look arranges its own way. Code: `src/components/preview/looks/`
(shared bits in `shared.tsx`: brand colours per theme, `Bar`, `Spark`, `arrangeGrid`), fonts
(Inter, Caveat; Fraunces from `src/components/home/fonts.ts`) in `src/app/preview/fonts.ts`. Each follows the build's brand hue (green / pink on cat).

## Soft — Apple-like
- `#f2f2f7` grey canvas, white cards (radius ~22 px, soft shadow, no borders), system font.
- A "Today" card on top: left today big + spending ring, then study hours and workouts x/goal with thin bars.
- Sections as iOS Settings-style grouped lists ("Today", "Collections"): tinted rounded-square icon
  with a **small mascot badge**, name + status line, value right, chevron.

## Ink — minimal mono
- White, Inter, near-black text, **no mascots**.
- Sections as cells of a 2-column grid with 1 px hairlines; label 11 px uppercase tracked, big
  tabular number, one status line. Budget spans the top row (40 px number + detail).
- Brand colour only on 2 px progress lines; problems = a small red dot + muted red text.

## Midnight — dark-first
- `#0b0d12` page, `#12151c` cards, 1 px translucent borders.
- Budget hero card with a faint brand-colour glow, mono numbers, progress bar with "where you should be" tick.
- Bento 2-column grid, mini 7-day bar charts (study, workouts), sentence tiles (Diary) full width at the end.
- **Mascots as quiet grey line marks** (outline only, "wool" = card colour).

## Editorial — serif
- Warm paper `#f6f1e7`, Fraunces serif headings, Inter body, deep forest (plum on cat) ink.
- Masthead ("Life, daily" + small sheep), the date as a big serif headline, greeting in italics.
- Fact of the day as a pull quote with a coloured rule.
- Sections as numbered rows (01 Budget … € 35,32) separated by thin rules, unit in small caps under the value.

## If one is picked
Turn it into real tokens in `src/app/globals.css` (colours, a heading font, radius/shadow scale) so the
whole app follows, then rework Home's `HomeContent`/`FeatureTile` to the chosen structure. Mixing is
possible (e.g. Midnight's cards with Editorial's type).

## Bento Glass (live)
- A photo hero per time of day (`public/hero/`, focus points in `src/lib/homePhotos.ts`): logo row,
  date, greeting in Fraunces, fact of the day, weather, all white on the photo; it fades into the page.
- Sections as frosted `glass-card` tiles, **one per row** on phones (two columns on wide screens), each
  with its stock photo faint behind it (`src/lib/sectionPhotos.ts`) and a small strip at the bottom
  where it says something (budget bar, study/beer bars, workout dots, diary moods).
- Mascots kept, drawn as round line badges (wool = the badge colour), still live (moods, taps).
- Photos stay on Home: section pages only got the mascot badge in their header (photos there looked bad).

## Other mockups added 2026-11-09
- **Refined**: today's Meadow tidied (one tile anatomy), on the app's own tokens.
- **Widgets**: an iPhone widget grid, one colour per section.
- **Bento**: whatever needs you most takes the big brand-coloured cell.
- **Agenda**: a vertical "today" timeline of what's due, everything else as small numbers.
- **Compact**: Settings-style grouped rows, everything on one screen.
- **Pastel**: each section its own soft colour block, mascot peeking in.
- **Glass**: frosted panes over a soft gradient (the other half of Bento Glass).
- **Notebook**: ruled paper, handwritten headings (Caveat), tilted mascots.
- **Mono**: terminal/teletext, block-character bars, no mascots.
