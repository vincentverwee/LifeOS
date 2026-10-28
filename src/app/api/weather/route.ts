import { isAuthed } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dayKeyIn, getTimeZone } from "@/lib/today";
import { weatherLine } from "@/lib/push/weather";

export type HomeWeather = { place: string; line: string } | null;

/**
 * Today's weather line for this device (the home greeting), from the location set
 * on /settings, which belongs to the device's push subscription: `?endpoint=` names it.
 * A GET route so it doesn't queue behind server actions.
 */
export async function GET(request: Request): Promise<Response> {
  if (!(await isAuthed())) return Response.json(null, { status: 401 });
  const endpoint = new URL(request.url).searchParams.get("endpoint");
  const device = endpoint
    ? await prisma.pushSubscription.findUnique({
        where: { endpoint },
        select: { latitude: true, longitude: true, placeLabel: true },
      })
    : null;

  let body: HomeWeather = null;
  if (device?.latitude != null && device.longitude != null) {
    const timeZone = await getTimeZone();
    const line = await weatherLine({ latitude: device.latitude, longitude: device.longitude, timeZone }, dayKeyIn(timeZone));
    if (line) body = { place: device.placeLabel ?? "", line };
  }
  // The forecast itself is cached by weatherLine; this reply is per device.
  return Response.json(body, { headers: { "Cache-Control": "private, no-store" } });
}
