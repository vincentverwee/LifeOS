import { isAuthed } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * A sticker photo's bytes, like /api/wardrobe/photo/[id]: behind the passcode, and a photo's
 * id is never rewritten (a new photo is a new row), so browsers may keep it for good.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/waypoint/sticker/[id]">) {
  if (!(await isAuthed())) return new Response("Not logged in.", { status: 401 });
  const { id } = await ctx.params;
  const photo = await prisma.stickerPhoto.findUnique({ where: { id }, select: { data: true, mime: true } });
  if (!photo) return new Response("Not found.", { status: 404 });
  return new Response(photo.data, {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
