import { isAuthed } from '@/lib/auth';

/**
 * Place search for adding stops, proxied to Nominatim. From the server we can send the
 * identifying User-Agent its usage policy asks for (browsers drop that header), and
 * repeated searches are served from Next's fetch cache for a day.
 */
export async function GET(request: Request): Promise<Response> {
  if (!(await isAuthed())) return Response.json([], { status: 401 });

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2 || q.length > 200) return Response.json([]);

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'LifeOS-Waypoint/1.0 (personal travel journal)' },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return Response.json([], { status: 502 });
    return Response.json(await res.json());
  } catch {
    return Response.json([], { status: 502 });
  }
}
