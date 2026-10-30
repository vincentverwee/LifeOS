"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  bounds,
  layoutWeb,
  type WebEdge,
  type WebNode,
} from "@/lib/people/web";

const NODE_R = 7;
/** The "You" node (ME_NODE in data/people.ts, which is server-only). */
const ME = "me";

/** "Who knows who": everyone with a link, linked people pulled together. Tap a name to open them. */
export function PeopleWeb({
  nodes,
  edges,
}: {
  nodes: WebNode[];
  edges: (WebEdge & { label: string | null })[];
}) {
  const router = useRouter();
  const placed = useMemo(() => layoutWeb(nodes, edges), [nodes, edges]);
  const at = new Map(placed.map((p) => [p.id, p]));
  const box = bounds(placed, 48);

  return (
    <svg
      viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
      className="h-auto max-h-[28rem] w-full touch-manipulation"
      role="img"
      aria-label={`${nodes.length} people and how they're linked`}
    >
      <g className="text-ink-muted" strokeOpacity={0.45}>
        {edges.map((e) => {
          const a = at.get(e.a);
          const b = at.get(e.b);
          if (!a || !b) return null;
          return (
            <line
              key={`${e.a}-${e.b}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="currentColor"
              strokeWidth={2}
            >
              {e.label && <title>{e.label}</title>}
            </line>
          );
        })}
      </g>
      {placed
        .filter((p) => p.id === ME)
        .map((p) => (
          <g key={p.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r={NODE_R + 4}
              className="fill-surface stroke-primary"
              strokeWidth={3}
            />
            <text
              x={p.x}
              y={p.y + NODE_R + 18}
              textAnchor="middle"
              fontSize={13}
              className="fill-primary font-semibold"
              style={{
                paintOrder: "stroke",
                stroke: "var(--color-background)",
                strokeWidth: 4,
                strokeLinejoin: "round",
              }}
            >
              {p.name}
            </text>
          </g>
        ))}
      {placed
        .filter((p) => p.id !== ME)
        .map((p) => (
          <g
            key={p.id}
            role="link"
            tabIndex={0}
            aria-label={p.name}
            onClick={() => router.push(`/people/${p.id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                router.push(`/people/${p.id}`);
            }}
            className="cursor-pointer outline-none focus-visible:[&>circle]:stroke-ring"
          >
            {/* A bigger invisible circle: a fingertip-sized target. */}
            <circle cx={p.x} cy={p.y} r={22} fill="transparent" />
            <circle
              cx={p.x}
              cy={p.y}
              r={NODE_R}
              className="fill-primary stroke-surface"
              strokeWidth={2}
            />
            <text
              x={p.x}
              y={p.y + NODE_R + 14}
              textAnchor="middle"
              fontSize={13}
              className="fill-foreground font-medium"
              style={{
                paintOrder: "stroke",
                stroke: "var(--color-background)",
                strokeWidth: 4,
                strokeLinejoin: "round",
              }}
            >
              {p.name}
            </text>
          </g>
        ))}
    </svg>
  );
}
