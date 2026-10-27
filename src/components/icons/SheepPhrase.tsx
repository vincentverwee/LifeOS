"use client";

import { useSyncExternalStore } from "react";
import { THEME } from "@/lib/theme";

const SHEEP_PHRASES = [
  "Counting sheep…",
  "Herding the data…",
  "Following the flock…",
  "Ewe won't believe how fast this is…",
  "Baaaah-ck in a second…",
  "Getting our ducks… er, sheep in a row…",
  "Shear brilliance in progress…",
  "Wool you look at that…",
  "Separating the sheep from the bytes…",
  "Lost in the wool wide web…",
  "Untangling the yarn…",
  "Making baaah-ckups…",
  "Fleece and thank you…",
  "Every ewe-nique detail counts…",
  "A little ram-processing…",
  "Gathering the wool intel…",
  "Shear computing power…",
  "Minding the flock…",
  "Baaa-rly taking a second…",
  "Hold your sheep…",
  "Wool be right with you…",
  "The plot thickens…",
  "Sheep happens…",
  "Baaa-ckend magic at work…",
  "Calculating the baaa-lance…",
  "Taking the scenic pasture…",
  "Wandering off the beaten pasture…",
  "Mapping out greener pastures…",
  "Checking the flock's coordinates…",
  "Tracking down lost sheep…",
  "Finding our bearings… and our lambs…",
  "One small baaa for sheep…",
  "Just grazing through some data…",
  "Almost pasture bedtime…",
  "No need to get sheepish…",
  "The shepherd is on it…",
  "Keeping things wool-organised…",
  "Ram-ping up the speed…",
  "Don't have a cow, we're sheep…",
  "A fleece-second longer…",
  "Preparing for a baa-rilliant experience…",
  "Making the numbers flock together…",
  "Shear patience, please…",
  "Wool you wait just a moment…",
];

const CAT_PHRASES = [
  "Herding cats…",
  "Paws-ing for a second…",
  "Purr-cessing your data…",
  "Just a meow-ment…",
  "Fur-midable things are loading…",
  "Chasing the laser pointer…",
  "Knocking things off the table…",
  "Landing on our feet…",
  "Kneading the numbers…",
  "Cat-culating…",
  "Taking a quick cat nap…",
  "Un-purr-lievably close…",
  "Claw-ing through the details…",
  "Hiss-terically fast, almost…",
  "Whisker-ing your data over…",
  "Finding the sunny spot…",
  "Curiosity is on it…",
  "Coughing up a hairball… er, a result…",
  "Purr-paring something nice…",
  "Feline good about this…",
  "Stretching and yawning…",
  "Opurr-ating at full speed…",
  "Look what the cat dragged in…",
  "Ball of yarn, nearly untangled…",
  "Cat-ching up…",
  "Meow-sing over the numbers…",
  "Fetching… no wait, cats don't fetch…",
  "Nine lives, one more second…",
];

const PHRASES = THEME === "cat" ? CAT_PHRASES : SHEEP_PHRASES;

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
