"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(pointer: coarse)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Chart tooltip trigger: hover with a mouse, tap on touch screens — so a finger scrolling past
 *  a chart doesn't drag the tooltip along, and a tap shows (and a second tap hides) the values. */
export function useTooltipTrigger(): "hover" | "click" {
  const coarse = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
  return coarse ? "click" : "hover";
}
