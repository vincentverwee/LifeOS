"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { deletePub, mergePub, renamePub, setPubPosition, type BeerResult } from "@/lib/actions/beer";
import { MAX_PUB_NAME } from "@/lib/beer/types";
import { SheepSpinner } from "@/components/icons/SheepSpinner";
import { Disclosure } from "@/components/Disclosure";
import type { Position } from "./PositionPicker";

const PositionPicker = dynamic(() => import("./PositionPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-2xl bg-surface-muted">
      <SheepSpinner size={32} />
    </div>
  ),
});

const input = "rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground";

/** Rename, put on / take off the map, merge into another pub, delete. */
export function PubEditor({
  pub,
  others,
}: {
  pub: { id: string; name: string; position: Position | null };
  others: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState(pub.name);
  const [mergeInto, setMergeInto] = useState("");
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<BeerResult>, done?: string, then?: () => void) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return setError(result.error);
      if (done) setMessage(done);
      then?.();
    });
  }

  function putHere() {
    setError(null);
    setMessage(null);
    if (!("geolocation" in navigator)) return setError("This browser can't share its location.");
    navigator.geolocation.getCurrentPosition(
      (p) => run(() => setPubPosition(pub.id, { latitude: p.coords.latitude, longitude: p.coords.longitude }), "On the map."),
      () => setError("Couldn't get your location."),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  return (
    <Disclosure title="Edit pub">
      <div className="flex flex-col gap-4 pb-4">
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => renamePub(pub.id, name), "Renamed.");
          }}
        >
          <label htmlFor="pub-rename" className="text-sm text-ink-muted">
            Name
          </label>
          <div className="flex gap-2">
            <input
              id="pub-rename"
              value={name}
              maxLength={MAX_PUB_NAME}
              onChange={(e) => setName(e.target.value)}
              className={`${input} min-w-0 flex-1`}
            />
            <button type="submit" disabled={pending || !name.trim() || name.trim() === pub.name} className="btn btn-primary px-4 text-sm">
              Save
            </button>
          </div>
        </form>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-ink-muted">Map</span>
          {picking && (
            <>
              <p className="text-sm text-ink-muted">Search the pub or its town, then tap the map where it is (or drag the pin).</p>
              <PositionPicker initial={pub.position} onChange={setPicked} />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pending || !picked}
                  onClick={() => run(() => setPubPosition(pub.id, picked), "On the map.", () => setPicking(false))}
                  className="btn btn-primary min-h-11 px-4 text-sm"
                >
                  Save spot
                </button>
                <button type="button" onClick={() => setPicking(false)} className="btn btn-outline min-h-11 px-4 text-sm">
                  Cancel
                </button>
              </div>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            {!picking && (
              <button
                type="button"
                onClick={() => {
                  setPicked(null);
                  setPicking(true);
                }}
                className="btn btn-outline min-h-11 px-4 text-sm"
              >
                {pub.position ? "Move on the map" : "Pick on the map"}
              </button>
            )}
            <button type="button" onClick={putHere} disabled={pending} className="btn btn-outline min-h-11 px-4 text-sm">
              {pub.position ? "Move to where I am" : "Put it where I am"}
            </button>
            {pub.position && (
              <button
                type="button"
                onClick={() => run(() => setPubPosition(pub.id, null), "Taken off the map.")}
                disabled={pending}
                className="btn btn-ghost min-h-11 px-4 text-sm"
              >
                Take off the map
              </button>
            )}
          </div>
        </div>

        {others.length > 0 && (
          <div className="flex flex-col gap-2">
            <label htmlFor="pub-merge" className="text-sm text-ink-muted">
              Same pub twice? Merge its beers into
            </label>
            <div className="flex gap-2">
              <select id="pub-merge" value={mergeInto} onChange={(e) => setMergeInto(e.target.value)} className={`${input} min-w-0 flex-1`}>
                <option value="">Pick a pub…</option>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={pending || !mergeInto}
                onClick={() => {
                  const into = others.find((o) => o.id === mergeInto);
                  if (!into || !window.confirm(`Move every beer of ${pub.name} to ${into.name} and remove ${pub.name}?`)) return;
                  run(() => mergePub(pub.id, into.id), undefined, () => router.replace(`/beer/pubs/${into.id}`));
                }}
                className="btn btn-outline px-4 text-sm"
              >
                Merge
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Delete ${pub.name}? Its beers stay, without a pub.`)) return;
            run(() => deletePub(pub.id), undefined, () => router.replace("/beer/pubs"));
          }}
          className="btn btn-danger inline-flex min-h-11 self-start px-4 text-sm"
        >
          Delete pub
        </button>

        {pending && <SheepSpinner size={20} />}
        {message && <p className="text-sm text-positive-text">✓ {message}</p>}
        {error && <p className="text-sm text-critical">{error}</p>}
      </div>
    </Disclosure>
  );
}
