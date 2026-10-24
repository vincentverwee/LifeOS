// One-off copy of the standalone Waypoint app's Supabase data (trips + locations)
// into the WaypointTrip / WaypointLocation tables. Reads the old project over its
// REST API with the old anon key (never stored in .env). Safe to re-run: rows are
// upserted by their original UUID, so trip URLs keep working.
//
//   WAYPOINT_SUPABASE_URL=https://xxxx.supabase.co WAYPOINT_SUPABASE_ANON_KEY=... \
//     npx tsx prisma/import-waypoint.ts [--dry]
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DRY = process.argv.includes("--dry");
const URL_BASE = process.env.WAYPOINT_SUPABASE_URL;
const KEY = process.env.WAYPOINT_SUPABASE_ANON_KEY;

type TripRow = {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image: string | null;
  total_km: number | string | null;
  route_preference: string;
  route_geometry: unknown;
  created_at: string;
  updated_at: string;
};

type LocationRow = {
  id: string;
  trip_id: string;
  name: string;
  latitude: number | string;
  longitude: number | string;
  country: string | null;
  city: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  notes: string | null;
  visit_order: number;
  created_at: string;
  updated_at: string | null;
};

async function fetchAll<T>(table: string, order: string): Promise<T[]> {
  const res = await fetch(`${URL_BASE}/rest/v1/${table}?select=*&order=${order}`, {
    headers: { apikey: KEY!, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T[];
}

const day = (value: string | null) => (value ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : null);

async function main() {
  if (!URL_BASE || !KEY) {
    throw new Error("Set WAYPOINT_SUPABASE_URL and WAYPOINT_SUPABASE_ANON_KEY (the old Waypoint project).");
  }

  const [trips, locations] = await Promise.all([
    fetchAll<TripRow>("trips", "start_date.asc"),
    fetchAll<LocationRow>("locations", "trip_id.asc,visit_order.asc"),
  ]);

  const totalKm = trips.reduce((sum, t) => sum + Number(t.total_km ?? 0), 0);
  const countries = new Set(locations.map((l) => l.country).filter(Boolean));
  const cities = new Set(locations.map((l) => l.city).filter(Boolean));
  console.log(
    `Old Waypoint: ${trips.length} trips, ${locations.length} stops, ${countries.size} countries, ` +
      `${cities.size} cities, ${totalKm.toFixed(1)} km`
  );
  if (DRY) {
    for (const t of trips) console.log(`  ${t.start_date ?? "—"}  ${t.title}  (${t.total_km ?? 0} km)`);
    console.log("--dry: nothing written.");
    return;
  }

  for (const t of trips) {
    const data = {
      title: t.title,
      description: t.description,
      startDate: day(t.start_date),
      endDate: day(t.end_date),
      coverImage: t.cover_image,
      totalKm: t.total_km === null ? null : new Prisma.Decimal(t.total_km),
      routePreference: t.route_preference,
      routeGeometry:
        t.route_geometry == null ? Prisma.DbNull : (t.route_geometry as Prisma.InputJsonValue),
      createdAt: new Date(t.created_at),
    };
    await prisma.waypointTrip.upsert({ where: { id: t.id }, create: { id: t.id, ...data }, update: data });
  }

  for (const l of locations) {
    const data = {
      tripId: l.trip_id,
      name: l.name,
      latitude: new Prisma.Decimal(l.latitude),
      longitude: new Prisma.Decimal(l.longitude),
      country: l.country,
      city: l.city,
      arrivalDate: day(l.arrival_date),
      departureDate: day(l.departure_date),
      notes: l.notes,
      visitOrder: l.visit_order,
      createdAt: new Date(l.created_at),
    };
    await prisma.waypointLocation.upsert({ where: { id: l.id }, create: { id: l.id, ...data }, update: data });
  }

  const [tripCount, stopCount] = await Promise.all([
    prisma.waypointTrip.count(),
    prisma.waypointLocation.count(),
  ]);
  console.log(`LifeOS now has ${tripCount} Waypoint trips and ${stopCount} stops.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
