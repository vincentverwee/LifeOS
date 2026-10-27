'use client';

import { useState, useRef } from 'react';
import { Input } from '@/components/waypoint/ui/input';
import { searchPlaces, extractCity, extractCountry, GeocodingResult } from '@/lib/waypoint/geocoding';
import { Search, MapPin, Loader2 } from 'lucide-react';
import type { CreateLocationInput } from '@/lib/actions/waypoint';

interface LocationSearchProps {
  tripId: string;
  onAdd: (loc: CreateLocationInput) => void;
}

export function LocationSearch({ tripId, onAdd }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Only the newest search may show its results: a slow earlier one is aborted.
  const requestRef = useRef<AbortController | null>(null);

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    requestRef.current?.abort();
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      requestRef.current = controller;
      setLoading(true);
      try {
        const found = await searchPlaces(value, controller.signal);
        setResults(found);
        setOpen(found.length > 0);
      } catch {
        if (controller.signal.aborted) return;
        setResults([]);
        setOpen(false);
      } finally {
        if (requestRef.current === controller) setLoading(false);
      }
    }, 350);
  }

  function selectResult(r: GeocodingResult) {
    onAdd({
      trip_id: tripId,
      name: r.display_name.split(',').slice(0, 2).join(',').trim(),
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
      country: extractCountry(r),
      city: extractCity(r),
      arrival_date: null,
      departure_date: null,
      notes: null,
    });
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search for a city or place…"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          className="pl-9"
        />
        {loading && (
          <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => selectResult(r)}
              className="flex w-full items-start gap-2.5 px-4 py-3 text-left text-sm hover:bg-surface-muted transition-colors"
            >
              <MapPin size={14} className="mt-0.5 shrink-0 text-primary" />
              <span className="line-clamp-2 leading-snug">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
