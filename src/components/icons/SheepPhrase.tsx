"use client";

import { useSyncExternalStore } from "react";

const PHRASES = [
  "Counting sheep…",
  "Fleecing the numbers…",
  "Herding the data…",
  "Getting our ewe-s in a row…",
  "Shearing through the spreadsheet…",
  "Wool be right with you…",
  "Baaa-lancing the books…",
  "Following the flock…",
  "Lamb-basting the ledger…",
  "Don't have a cow, it's a sheep…",
  "Knitting your numbers together…",
  "Ram-ping up…",
  "Sheep happens, hold on…",
  "Counting every last lamb…",
  "Making sure nobody's sheepish…",
  "Fetching the wool-y details…",
  "Ewe won't believe how fast this is…",
  "Off to the baa-nk…",
  "Spinning some wool…",
  "Sheepishly loading…",
  "Rounding up the stragglers…",
  "Leaping over the fence…",
  "Baa-ck in a second…",
  "Having a ewe-nique moment…",
];

// Picked once per page load in the browser.
const clientPhrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
const subscribe = () => () => {};

// The server (and hydration) render the default so markup matches; React then
// switches to the random phrase on the client.
export function SheepPhrase() {
  const phrase = useSyncExternalStore(
    subscribe,
    () => clientPhrase,
    () => PHRASES[0]
  );

  return <p className="text-sm text-ink-muted">{phrase}</p>;
}
