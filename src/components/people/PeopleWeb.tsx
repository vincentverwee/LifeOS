"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { bounds, layoutWeb, type WebNode } from "@/lib/people/web";
import { groupColor } from "@/lib/people/family";
import type { WebLine } from "@/lib/data/people";

const NODE_R = 8;
/** Where along a line its label sits, from the person it's seen from. */
const LABEL_AT = 0.62;
/** The "You" node (ME_NODE in data/people.ts, which is server-only). */
const ME = "me";
/** Text halo in the card's colour, so lines and labels never run through names. */
const HALO = { paintOrder: "stroke", stroke: "var(--color-surface)", strokeWidth: 4, strokeLinejoin: "round" } as const;

/**
 * "Who knows who": you pinned in the middle, family in rows (parents above), dots in
 * their group's colour. Lines to you carry their label; tap someone to light up their
 * lines with labels, then "Open" to go to their page.
 */
export function PeopleWeb({ nodes, edges, groups }: { nodes: WebNode[]; edges: WebLine[]; groups: string[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const placed = useMemo(() => layoutWeb(nodes, edges, ME), [nodes, edges]);
  const at = new Map(placed.map((p) => [p.id, p]));
  const box = bounds(placed, 56);
  const usedGroups = groups.filter((g) => nodes.some((n) => n.group === g));
  const chosen = selected ? at.get(selected) : undefined;
  const touches = (e: WebLine) => selected !== null && (e.a === selected || e.b === selected);

  /** The label at a line's middle: what the far end is to the selected person, or on your lines what they are to you. */
  function labelOf(e: WebLine): string | null {
    if (selected === null) return e.a === ME ? e.bIs : null;
    if (!touches(e)) return null;
    if (e.a === ME && selected !== ME) return "you";
    return e.a === selected ? e.bIs : e.aIs;
  }

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
        className="h-auto max-h-[30rem] w-full touch-manipulation select-none"
        role="img"
        aria-label={`${nodes.length} people and how they're linked`}
        onClick={() => setSelected(null)}
      >
        {edges.map((e) => {
          const a = at.get(e.a);
          const b = at.get(e.b);
          if (!a || !b) return null;
          const lit = touches(e);
          return (
            <line
              key={`${e.a}-${e.b}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={lit ? "var(--color-primary)" : "var(--color-ink-muted)"}
              strokeOpacity={selected === null ? 0.45 : lit ? 0.9 : 0.12}
              strokeWidth={lit ? 3 : 2}
            />
          );
        })}
        {edges.map((e) => {
          const a = at.get(e.a);
          const b = at.get(e.b);
          const label = labelOf(e);
          if (!a || !b || !label) return null;
          // Closer to the person the label describes (away from you / the one tapped),
          // so it clears the names in the middle and the crossings.
          const [from, to] = e.a === (selected ?? ME) ? [a, b] : [b, a];
          return (
            <text
              key={`label-${e.a}-${e.b}`}
              x={from.x + (to.x - from.x) * LABEL_AT}
              y={from.y + (to.y - from.y) * LABEL_AT + 4}
              textAnchor="middle"
              fontSize={11}
              className={touches(e) ? "fill-primary font-semibold" : "fill-ink-muted"}
              style={HALO}
            >
              {label}
            </text>
          );
        })}
        {placed.map((p) => {
          const me = p.id === ME;
          const near = edges.some((e) => touches(e) && (e.a === p.id || e.b === p.id));
          const dim = selected !== null && selected !== p.id && !near;
          return (
            <g
              key={p.id}
              role="button"
              tabIndex={0}
              aria-label={me ? "You" : p.name}
              aria-pressed={selected === p.id}
              opacity={dim ? 0.35 : 1}
              onClick={(ev) => {
                ev.stopPropagation();
                setSelected((s) => (s === p.id ? null : p.id));
              }}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") setSelected((s) => (s === p.id ? null : p.id));
              }}
              className="cursor-pointer outline-none"
            >
              {/* A bigger invisible circle: a fingertip-sized target. */}
              <circle cx={p.x} cy={p.y} r={24} fill="transparent" />
              {me ? (
                <circle cx={p.x} cy={p.y} r={NODE_R + 4} fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth={3} />
              ) : (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={selected === p.id ? NODE_R + 3 : NODE_R}
                  fill={groupColor(p.group ?? null, groups)}
                  stroke="var(--color-surface)"
                  strokeWidth={2}
                />
              )}
              <text
                x={p.x}
                y={p.y + NODE_R + (me ? 20 : 16)}
                textAnchor="middle"
                fontSize={13}
                className={me ? "fill-primary font-semibold" : "fill-foreground font-medium"}
                style={HALO}
              >
                {p.name}
              </text>
            </g>
          );
        })}
      </svg>

      <div aria-live="polite" className="min-h-11">
        {chosen && chosen.id !== ME ? (
          <div className="flex items-center justify-between gap-3 rounded-full bg-surface-muted py-1 pr-1 pl-4">
            <span className="min-w-0 truncate text-sm text-foreground">{chosen.name}</span>
            <Link href={`/people/${chosen.id}`} className="btn btn-primary inline-flex min-h-11 shrink-0 px-4 text-sm">
              Open ›
            </Link>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Tap someone to see how they&apos;re linked.</p>
        )}
      </div>

      {usedGroups.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted" aria-label="Group colours">
          {usedGroups.map((g) => (
            <li key={g} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: groupColor(g, groups) }} />
              {g}
            </li>
          ))}
          {nodes.some((n) => n.id !== ME && !n.group) && (
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: groupColor(null, groups) }} />
              No group
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
