"use client";

import dynamic from "next/dynamic";
import { SheepSpinner } from "@/components/icons/SheepSpinner";
import type { MapPub } from "./PubMap";

/** MapLibre needs the browser, so the map loads on the client only (like Waypoint's MapWrapper). */
export const PubMapLoader = dynamic(() => import("./PubMap"), {
  ssr: false,
  loading: () => (
    <div role="status" className="flex h-full w-full items-center justify-center rounded-2xl bg-surface-muted">
      <SheepSpinner size={40} />
    </div>
  ),
});

export type { MapPub };
