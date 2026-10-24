"use client";

import { useEffect, useState } from "react";

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

// The first render is always the default so server and client markup match;
// a random phrase takes over right after mount.
export function SheepPhrase() {
  const [phrase, setPhrase] = useState(PHRASES[0]);

  useEffect(() => {
    setPhrase(PHRASES[Math.floor(Math.random() * PHRASES.length)]);
  }, []);

  return <p className="text-sm text-ink-muted">{phrase}</p>;
}
