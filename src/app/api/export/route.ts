import { isAuthed } from "@/lib/auth";
import { exportEverything } from "@/lib/data/export";
import { THEME } from "@/lib/theme";
import { getTodayKey } from "@/lib/today";

/** "Download everything" on /settings: all data as one JSON file. A GET so it doesn't queue behind server actions. */
export async function GET(): Promise<Response> {
  if (!(await isAuthed())) return Response.json(null, { status: 401 });
  const [data, today] = await Promise.all([exportEverything(), getTodayKey()]);
  const filename = `lifeos${THEME === "cat" ? "-cat" : ""}-${today}.json`;
  // Compact: Waypoint route lines are most of the size, and indenting puts every point on its own line.
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
