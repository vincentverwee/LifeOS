import { isAuthed } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * A clothing photo's bytes. Behind the passcode like everything else. A photo's id is
 * never rewritten (a new photo is a new row), so browsers may keep it for good.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/wardrobe/photo/[id]">) {
  if (!(await isAuthed())) return new Response("Not logged in.", { status: 401 });
  const { id } = await ctx.params;
  const photo = await prisma.clothingPhoto.findUnique({ where: { id }, select: { data: true, mime: true } });
  if (!photo) return new Response("Not found.", { status: 404 });
  return new Response(photo.data, {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
