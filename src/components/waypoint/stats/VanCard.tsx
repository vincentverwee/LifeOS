import Link from 'next/link';
import { Caravan, Sticker } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/waypoint/ui/card';
import type { Milestone, VanCountry, VanTime } from '@/lib/waypoint/stats';

/** Countries shown before "Show all". */
const SHOWN = 8;

const km = (n: number) => n.toLocaleString('nl-BE');

/** The van's own numbers on Stats: km towards the next milestone, nights in the van, countries. */
export function VanCard({
  vanKm,
  vanTrips,
  milestone,
  time,
  countries,
  stickers,
}: {
  vanKm: number;
  vanTrips: number;
  milestone: Milestone;
  time: VanTime;
  countries: VanCountry[];
  /** How many stickers in all (the wall link). */
  stickers: number;
}) {
  const chip = (c: VanCountry) => (
    <li key={c.country} className="rounded-full bg-muted/60 px-3 py-1 text-sm text-foreground">
      {c.country}
      {c.firstVisit && <span className="text-muted-foreground"> · {c.firstVisit.slice(0, 4)}</span>}
    </li>
  );

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Caravan size={18} aria-hidden="true" />
          The van
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">
            {km(vanKm)} <span className="text-lg text-muted-foreground">km</span>
          </p>
          <div
            role="progressbar"
            aria-label={`Towards ${km(milestone.next)} km`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(milestone.progress * 100)}
            className="h-2 w-full overflow-hidden rounded-full bg-muted/40"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${milestone.progress * 100}%` }} />
          </div>
          <p className="text-sm text-muted-foreground">
            {km(Math.max(0, Math.round(milestone.next - vanKm)))} km to {km(milestone.next)}
            {` · ${vanTrips} ${vanTrips === 1 ? 'trip' : 'trips'}`}
          </p>
        </div>

        <Link href="/waypoint/stickers" className="btn btn-outline inline-flex min-h-11 items-center gap-2 px-4 text-sm">
          <Sticker size={16} aria-hidden="true" />
          {stickers === 0 ? 'Sticker wall' : `${stickers} ${stickers === 1 ? 'sticker' : 'stickers'}`} ›
        </Link>

        {time.nights > 0 && (
          <div className="space-y-2">
            <p className="text-foreground">
              <span className="font-semibold tabular-nums">{time.nights}</span> {time.nights === 1 ? 'night' : 'nights'} in the
              van <span className="text-muted-foreground">· {time.days} days on the road</span>
            </p>
            {time.byYear.length > 1 && (
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {time.byYear.map((y) => (
                  <li key={y.year} className="tabular-nums">
                    {y.year}: <span className="text-foreground">{y.nights}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {countries.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {countries.length} {countries.length === 1 ? 'country' : 'countries'} by van
            </p>
            <ul className="flex flex-wrap gap-2">{countries.slice(0, SHOWN).map(chip)}</ul>
            {countries.length > SHOWN && (
              <details className="group space-y-2">
                <summary className="btn btn-ghost -mx-3 inline-flex min-h-11 cursor-pointer list-none px-3 text-sm [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">Show all {countries.length}</span>
                  <span className="hidden group-open:inline">Show fewer</span>
                </summary>
                <ul className="flex flex-wrap gap-2">{countries.slice(SHOWN).map(chip)}</ul>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
