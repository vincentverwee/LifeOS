"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { bounds, labelSpot, layoutWeb, type Box, type WebNode } from "@/lib/people/web";
import { groupColor } from "@/lib/people/family";
import type { WebLine } from "@/lib/data/people";

const NODE_R = 8;
const PAD = 56;
/** The SVG's max-h-[30rem], in px. */
const MAX_HEIGHT = 480;
/** A label's centre keeps this far (in drawing units, before scaling) from other lines. */
const LABEL_CLEARANCE = 9;

/** About how wide a text is drawn (an average glyph is ~0.58 em), plus room for its halo. */
function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.58 + fontSize * 0.4;
}
/** The "You" node (ME_NODE in data/people.ts, which is server-only). */
const ME = "me";

/**
 * How much to enlarge dots, names and tap targets: a wide web shrinks to fit a phone, and
 * 13-unit names would end up ~7 px. Keeps them at least their design size on screen (at
 * most doubled). 1 until measured, so the server and the first render agree.
 */
function useGrow(ref: React.RefObject<HTMLElement | null>, box: { width: number; height: number }) {
  const [grow, setGrow] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const scale = Math.min(el.clientWidth / box.width, MAX_HEIGHT / box.height);
      setGrow(scale > 0 ? Math.min(2, Math.max(1, 1 / scale)) : 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, box.width, box.height]);
  return grow;
}

/**
 * "Who knows who": you pinned in the middle, family in rows (parents above), dots in
 * their group's colour. Lines to you carry their label; tap someone to light up their
 * lines with labels, then "Open" to go to their page.
 */
export function PeopleWeb({ nodes, edges, groups }: { nodes: WebNode[]; edges: WebLine[]; groups: string[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const placed = useMemo(() => layoutWeb(nodes, edges, ME), [nodes, edges]);
  const at = new Map(placed.map((p) => [p.id, p]));
  const k = useGrow(wrapper, useMemo(() => bounds(placed, PAD), [placed]));
  const box = bounds(placed, PAD * k);
  // Text halo in the card's colour, so lines and labels never run through names.
  const halo = { paintOrder: "stroke", stroke: "var(--color-surface)", strokeWidth: 4 * k, strokeLinejoin: "round" } as const;
  // Every dot and the name under it, roughly measured: labels keep off them.
  const taken: Box[] = placed.flatMap((p) => [
    { x: p.x, y: p.y, w: (NODE_R + 4) * 2 * k, h: (NODE_R + 4) * 2 * k },
    { x: p.x, y: p.y + (NODE_R + (p.id === ME ? 20 : 16) - 4.5) * k, w: textWidth(p.name, 13 * k), h: 15 * k },
  ]);
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
    <div ref={wrapper} className="flex flex-col gap-3">
      <svg
        viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
        className="h-auto max-h-[30rem] w-full touch-manipulation select-none"
        // A group, not an image: an image hides the people (buttons) inside from VoiceOver.
        role="group"
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
              strokeWidth={(lit ? 3 : 2) * k}
            />
          );
        })}
        {edges.map((e) => {
          const a = at.get(e.a);
          const b = at.get(e.b);
          const label = labelOf(e);
          if (!a || !b || !label) return null;
          // Closer to the person the label describes (away from you / the one tapped),
          // so it clears the names in the middle, and slid along its line off any crossing.
          const [from, to] = e.a === (selected ?? ME) ? [a, b] : [b, a];
          const others = edges.flatMap((o) => {
            const oa = at.get(o.a);
            const ob = at.get(o.b);
            return o !== e && oa && ob ? [[oa, ob] as [typeof oa, typeof ob]] : [];
          });
          const size = { w: textWidth(label, 11 * k), h: 12 * k };
          const spot = labelSpot(from, to, size, others, taken, LABEL_CLEARANCE * k);
          return (
            <text
              key={`label-${e.a}-${e.b}`}
              x={spot.x}
              y={spot.y + 4 * k}
              textAnchor="middle"
              fontSize={11 * k}
              className={touches(e) ? "fill-primary font-semibold" : "fill-ink-muted"}
              style={halo}
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
                if (ev.key !== "Enter" && ev.key !== " ") return;
                ev.preventDefault(); // Space would scroll the page too
                setSelected((s) => (s === p.id ? null : p.id));
              }}
              className="cursor-pointer outline-none"
            >
              {/* A bigger invisible circle: a fingertip-sized target. */}
              <circle cx={p.x} cy={p.y} r={24 * k} fill="transparent" />
              {me ? (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={(NODE_R + 4) * k}
                  fill="var(--color-surface)"
                  stroke="var(--color-primary)"
                  strokeWidth={3 * k}
                />
              ) : (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={(selected === p.id ? NODE_R + 3 : NODE_R) * k}
                  fill={groupColor(p.group ?? null, groups)}
                  stroke="var(--color-surface)"
                  strokeWidth={2 * k}
                />
              )}
              <text
                x={p.x}
                y={p.y + (NODE_R + (me ? 20 : 16)) * k}
                textAnchor="middle"
                fontSize={13 * k}
                className={me ? "fill-primary font-semibold" : "fill-foreground font-medium"}
                style={halo}
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
