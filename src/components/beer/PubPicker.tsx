"use client";

import { useState } from "react";
import { LocateFixed, Search, X } from "lucide-react";
import { SheepSpinner } from "@/components/icons/SheepSpinner";
import { distanceM, findNearby, NEARBY_RADIUS_M } from "@/lib/beer/nearby";
import { searchPubs } from "@/lib/beer/search";
import { MAX_PINTS, MAX_PUB_NAME, type PubChoice, type PubOption } from "@/lib/beer/types";
import { guessPints, MIN_PINT_AMOUNT } from "@/lib/monthStats";

/** A fix older than this isn't attached to a typed pub. */
const FIX_MAX_AGE_MS = 10 * 60_000;
const MAX_SUGGESTIONS = 5;

type Fix = { latitude: number; longitude: number; at: number };

type Suggestion = {
  key: string;
  name: string;
  choice: PubChoice;
  distance?: number;
  /** street, town, country (name search results) */
  place?: string;
  /** shown instead of `name` (the map's name, when it only places one of yours) */
  label?: string;
  mine: boolean;
};

/** "40 m", "3.2 km" */
function formatDistance(m: number): string {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`;
}

/**
 * The pints the stepper shows before it's touched: amount ÷ the pub's own latest
 * price, else the category's. Null under MIN_PINT_AMOUNT (counted as food).
 */
export function suggestedPints(amount: number | null, pintPrice: number, pub: PubOption | undefined): number | null {
  if (amount === null || amount < MIN_PINT_AMOUNT) return null;
  return guessPints(amount, pub?.pricePerPint ?? pintPrice);
}

/** The choice for a typed name: one of yours when it matches, else a new pub (with the fix, if fresh). */
function typedChoice(text: string, pubs: PubOption[], fix: Fix | null): PubChoice | null {
  const name = text.trim();
  if (!name) return null;
  const mine = pubs.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (mine) return { kind: "known", id: mine.id };
  const fresh = fix && Date.now() - fix.at < FIX_MAX_AGE_MS;
  return fresh ? { kind: "typed", name, latitude: fix.latitude, longitude: fix.longitude } : { kind: "typed", name };
}

function locate(): Promise<Fix> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, at: Date.now() }),
      reject,
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  });
}

/**
 * Pub + pints for a beer. Controlled: the form keeps `name`/`choice` (sent as JSON in
 * the hidden "pub" field) and `pints`. GPS is only asked for on the Nearby tap.
 */
export function PubPicker({
  pubs,
  name,
  onPick,
  pints,
  onPints,
}: {
  pubs: PubOption[];
  name: string;
  onPick: (name: string, choice: PubChoice | null) => void;
  pints: number | null;
  onPints: (pints: number) => void;
}) {
  const [fix, setFix] = useState<Fix | null>(null);
  const [status, setStatus] = useState<"idle" | "locating" | "searching" | "looking-up" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [nearby, setNearby] = useState<Suggestion[]>([]);
  const [typing, setTyping] = useState(false);
  // The name of a pub picked from a list, so "Find on the map" hides until it's edited.
  const [pickedName, setPickedName] = useState<string | null>(null);

  const query = name.trim().toLowerCase();
  const exact = pubs.some((p) => p.name.toLowerCase() === query);
  // One of yours without a spot on the map yet: looking it up places it.
  const unplaced = pubs.find((p) => p.name.toLowerCase() === query && p.latitude === null);
  const matches =
    typing && query && !exact
      ? pubs.filter((p) => p.name.toLowerCase().includes(query)).slice(0, MAX_SUGGESTIONS)
      : [];

  async function findNearbyPubs() {
    setMessage(null);
    setNearby([]);
    setStatus("locating");
    let here: Fix;
    try {
      here = await locate();
    } catch {
      setStatus("idle");
      setMessage("Couldn't get your location. Type the name instead.");
      return;
    }
    setFix(here);
    setStatus("searching");

    // Yours first (they work offline too), then OpenStreetMap's that aren't yours already.
    const mine: Suggestion[] = pubs
      .filter((p) => p.latitude !== null && p.longitude !== null)
      .map((p) => ({ p, distance: Math.round(distanceM(here.latitude, here.longitude, p.latitude!, p.longitude!)) }))
      .filter(({ distance }) => distance <= NEARBY_RADIUS_M)
      .sort((a, b) => a.distance - b.distance)
      .map(({ p, distance }) => ({ key: p.id, name: p.name, choice: { kind: "known", id: p.id }, distance, mine: true }));
    setNearby(mine);

    const places = navigator.onLine ? await findNearby(here.latitude, here.longitude) : [];
    const osm: Suggestion[] = places
      .filter((place) => !pubs.some((p) => p.osmId === place.osmId || p.name.toLowerCase() === place.name.toLowerCase()))
      .map((place) => ({
        key: place.osmId,
        name: place.name,
        choice: { kind: "osm", osmId: place.osmId, name: place.name, latitude: place.latitude, longitude: place.longitude },
        distance: place.distance,
        mine: false,
      }));
    setNearby([...mine, ...osm]);
    setStatus("done");
    if (mine.length + osm.length === 0) {
      setMessage(navigator.onLine ? "Nothing found nearby. Type the name instead." : "Offline: type the name instead.");
    }
  }

  /**
   * The typed name on OpenStreetMap (an explicit tap: Nominatim forbids search-as-you-type),
   * leaning toward where you are, else toward your latest pub on the map.
   */
  async function searchByName() {
    const text = name.trim();
    if (text.length < 2) return;
    setMessage(null);
    setNearby([]);
    setTyping(false);
    setStatus("looking-up");
    const freshFix = fix && Date.now() - fix.at < FIX_MAX_AGE_MS ? fix : null;
    const lastMapped = pubs.find((p) => p.latitude !== null && p.longitude !== null);
    const near = freshFix ?? (lastMapped ? { latitude: lastMapped.latitude!, longitude: lastMapped.longitude! } : null);
    const found = navigator.onLine ? await searchPubs(text, near) : [];
    const results: Suggestion[] = found
      .filter((f) => !pubs.some((p) => p.osmId === f.osmId))
      .map((f) => ({
        key: f.osmId,
        // For one of yours, picking a result only places it: your name stays.
        name: unplaced ? unplaced.name : f.name,
        label: f.name,
        choice: unplaced
          ? { kind: "known", id: unplaced.id, place: { osmId: f.osmId, latitude: f.latitude, longitude: f.longitude } }
          : { kind: "osm", osmId: f.osmId, name: f.name, latitude: f.latitude, longitude: f.longitude },
        distance: f.distance ?? undefined,
        place: f.place,
        mine: false,
      }));
    setNearby(results);
    setStatus("done");
    if (results.length === 0) {
      setMessage(
        navigator.onLine
          ? `No pub called "${text}" found. Add the town (e.g. "${text} Galway"), or keep the name as you typed it.`
          : "Offline: the name is kept as you typed it."
      );
    }
  }

  function pick(s: Suggestion) {
    onPick(s.name, s.choice);
    setPickedName(s.name);
    setTyping(false);
    setNearby([]);
    setMessage(null);
  }

  const busy = status === "locating" || status === "searching" || status === "looking-up";
  // A typed name that isn't one of yours (or a place already picked) can be looked up.
  const canSearch = name.trim().length >= 2 && (!exact || unplaced !== undefined) && !busy;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="pub-name" className="text-sm text-ink-muted">
            Pub <span className="text-ink-muted/80">(optional)</span>
          </label>
          <button
            type="button"
            onClick={findNearbyPubs}
            disabled={busy}
            className="btn btn-ghost -mr-3 inline-flex min-h-11 items-center gap-1.5 px-3 text-sm"
          >
            {status === "locating" || status === "searching" ? <SheepSpinner size={16} /> : <LocateFixed size={16} aria-hidden="true" />}
            {status === "locating" ? "Locating…" : status === "searching" ? "Searching…" : "Nearby"}
          </button>
        </div>
        <div className="relative">
          <input
            id="pub-name"
            type="text"
            autoComplete="off"
            enterKeyHint="done"
            maxLength={MAX_PUB_NAME}
            value={name}
            onChange={(e) => {
              setTyping(true);
              onPick(e.target.value, typedChoice(e.target.value, pubs, fix));
            }}
            onBlur={() => setTyping(false)}
            onKeyDown={(e) => {
              // Enter looks the name up instead of submitting the expense.
              if (e.key === "Enter" && canSearch) {
                e.preventDefault();
                void searchByName();
              }
            }}
            placeholder="Type a name or tap Nearby"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 pr-11 text-foreground"
          />
          {name && (
            <button
              type="button"
              onClick={() => onPick("", null)}
              aria-label="Clear pub"
              className="btn btn-ghost absolute top-0 right-0 flex h-11 w-11"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
          {matches.length > 0 && (
            <ul className="absolute inset-x-0 top-[calc(100%+0.25rem)] z-30 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
              {matches.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    // Before the input's blur hides the list.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick({ key: p.id, name: p.name, choice: { kind: "known", id: p.id }, mine: true })}
                    className="tap flex min-h-11 w-full items-center px-3 text-left text-foreground"
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {(canSearch || status === "looking-up") && name !== pickedName && (
          <button
            type="button"
            onClick={searchByName}
            disabled={!canSearch}
            className="btn btn-ghost -mx-3 inline-flex min-h-11 items-center gap-1.5 self-start px-3 text-sm"
          >
            {status === "looking-up" ? <SheepSpinner size={16} /> : <Search size={16} aria-hidden="true" />}
            {status === "looking-up" ? "Looking it up…" : `Find “${name.trim()}” on the map`}
          </button>
        )}
        {nearby.length > 0 && (
          <ul className="flex flex-col gap-2" aria-label="Pubs found">
            {nearby.map((s) => (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => pick(s)}
                  className="btn btn-outline flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-2 text-left text-sm"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-foreground">{s.label ?? s.name}</span>
                    {s.place && <span className="truncate text-xs text-ink-muted">{s.place}</span>}
                  </span>
                  {s.distance !== undefined && <span className="shrink-0 text-ink-muted">{formatDistance(s.distance)}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {message && <p className="text-sm text-ink-muted">{message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-ink-muted">Pints</span>
        <div className="flex gap-1 rounded-full bg-surface-muted p-1" role="group" aria-label="Pints">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onPints(n)}
              aria-pressed={pints === n}
              className={`btn flex min-h-11 flex-1 px-3 text-base font-semibold tabular-nums ${
                pints === n ? "bg-surface text-foreground shadow-sm" : "text-ink-muted hover:text-foreground"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onPints(Math.min(MAX_PINTS, Math.max(4, (pints ?? 0) + 1)))}
            disabled={pints !== null && pints >= MAX_PINTS}
            aria-label={pints !== null && pints > 3 ? `${pints} pints, one more` : "4 or more pints"}
            aria-pressed={pints !== null && pints > 3}
            className={`btn flex min-h-11 flex-1 px-3 text-base font-semibold tabular-nums ${
              pints !== null && pints > 3 ? "bg-surface text-foreground shadow-sm" : "text-ink-muted hover:text-foreground"
            }`}
          >
            {pints !== null && pints > 3 ? `${pints} +` : "+"}
          </button>
        </div>
      </div>
    </div>
  );
}
