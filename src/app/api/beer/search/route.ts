import { isAuthed } from "@/lib/auth";
import { parsePubSearch, PUB_SEARCH_VIEWBOX_DEG } from "@/lib/beer/search";

/**
 * Pubs and bars by name, proxied to Nominatim (like /api/waypoint/geocode: the server can
 * send the User-Agent its policy asks for, and repeats come from the fetch cache for a day).
 * `lat`/`lng` lean the results toward that spot without excluding anywhere else. Only on
 * an explicit Search tap: Nominatim's policy forbids search-as-you-type.
 */
export async function GET(request: Request): Promise<Response> {
  if (!(await isAuthed())) return Response.json([], { status: 401 });

  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 100) return Response.json([]);
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const near = params.has("lat") && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "20");
  url.searchParams.set("addressdetails", "1");
  if (near) {
    // Rounded so nearby searches share the cache.
    const [la, ln] = [Math.round(lat * 10) / 10, Math.round(lng * 10) / 10];
    const d = PUB_SEARCH_VIEWBOX_DEG;
    url.searchParams.set("viewbox", `${ln - d},${la + d},${ln + d},${la - d}`);
    url.searchParams.set("bounded", "0");
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "LifeOS/1.0 (personal pint map)" },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return Response.json([], { status: 502 });
    return Response.json(parsePubSearch(await res.json(), near ? { latitude: lat, longitude: lng } : null));
  } catch {
    return Response.json([], { status: 502 });
  }
}
