// One-off: "Bier - Pub" + "Bier - Sult" → one "Bier" category, now that a beer has a pub.
//   npx tsx prisma/merge-beer-categories.ts [--dry]
// 1. Every beer in either without a counted number gets the pints its old category's price
//    gave it (guessPints, as in monthStats.ts), so past pint counts don't change.
// 2. The Sult beers get the pub "Sult" (on the map if Overpass finds it near the campus,
//    else the first Nearby tap there puts it on) and move to "Bier - Pub".
// 3. "Bier - Pub" is renamed "Bier" and the empty "Bier - Sult" deleted.
// Idempotent. Your data only: never run it against the cat database.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { guessPints, MIN_PINT_AMOUNT } from "../src/lib/monthStats";
import { parseNearby } from "../src/lib/beer/nearby";

const dry = process.argv.includes("--dry");
const CAT_PROJECT = "ipcjkxtwyiumfvijxmsg";
const PUB_CATEGORY = "Bier - Pub";
const SULT_CATEGORY = "Bier - Sult";
const MERGED_NAME = "Bier";
const SULT = "Sult";
/** University of Galway campus, where Sult is. */
const CAMPUS = { latitude: 53.279, longitude: -9.06 };

if ((process.env.DATABASE_URL ?? "").includes(CAT_PROJECT)) {
  console.error("This is the cat database: this script is for your own data only.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
});

async function findSult(): Promise<{ osmId: string; latitude: number; longitude: number } | null> {
  const query = `[out:json][timeout:10];nwr["name"~"^sult$",i](around:1500,${CAMPUS.latitude},${CAMPUS.longitude});out center 5;`;
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: new URLSearchParams({ data: query }),
      headers: { "User-Agent": "LifeOS/1.0 (one-off pub import)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const [place] = parseNearby(await res.json(), CAMPUS.latitude, CAMPUS.longitude);
    return place ? { osmId: place.osmId, latitude: place.latitude, longitude: place.longitude } : null;
  } catch {
    return null;
  }
}

async function main() {
  const [pubCategory, sultCategory] = await Promise.all([
    prisma.category.findFirst({ where: { name: { in: [PUB_CATEGORY, MERGED_NAME] }, pintPrice: { not: null } } }),
    prisma.category.findUnique({ where: { name: SULT_CATEGORY }, include: { _count: { select: { subscriptions: true } } } }),
  ]);
  if (!pubCategory) {
    console.log(`No "${PUB_CATEGORY}" (or "${MERGED_NAME}") beer category: nothing to do.`);
    return;
  }

  // 1. Freeze the guessed pints with each category's own price.
  const sources = [pubCategory, sultCategory].filter((c) => c !== null);
  let backfilled = 0;
  for (const category of sources) {
    const price = category.pintPrice?.toNumber();
    if (!price) continue;
    const rows = await prisma.expense.findMany({
      where: { categoryId: category.id, pints: null, amount: { gte: MIN_PINT_AMOUNT } },
      select: { id: true, amount: true },
    });
    backfilled += rows.length;
    if (!dry) {
      for (const row of rows) {
        await prisma.expense.update({ where: { id: row.id }, data: { pints: guessPints(row.amount.toNumber(), price) } });
      }
    }
  }
  console.log(`Pints frozen on ${backfilled} beers.`);

  // 2. Sult beers → pub Sult, in the pub category.
  const sultBeers = sultCategory ? await prisma.expense.count({ where: { categoryId: sultCategory.id } }) : 0;
  if (sultCategory && sultBeers > 0) {
    let sult = await prisma.pub.findFirst({ where: { name: { equals: SULT, mode: "insensitive" } } });
    if (!sult) {
      const place = await findSult();
      console.log(place ? `Found Sult on OpenStreetMap (${place.osmId}).` : "Sult not found on OpenStreetMap (or Overpass busy): no position yet.");
      if (!dry) {
        sult = await prisma.pub.create({
          data: { name: SULT, ...(place && { osmId: place.osmId, latitude: place.latitude, longitude: place.longitude }) },
        });
      }
    }
    if (!dry && sult) {
      await prisma.expense.updateMany({
        where: { categoryId: sultCategory.id },
        data: { categoryId: pubCategory.id, pubId: sult.id },
      });
    }
  }
  console.log(`Moved ${sultBeers} Sult beers to "${pubCategory.name}" with pub ${SULT}.`);

  // 3. One "Bier", the empty Sult category gone.
  if (pubCategory.name !== MERGED_NAME) {
    const taken = await prisma.category.findUnique({ where: { name: MERGED_NAME } });
    if (taken) console.log(`"${MERGED_NAME}" already exists: "${pubCategory.name}" keeps its name.`);
    else if (!dry) await prisma.category.update({ where: { id: pubCategory.id }, data: { name: MERGED_NAME } });
    if (!taken) console.log(`Renamed "${pubCategory.name}" → "${MERGED_NAME}".`);
  }
  if (sultCategory) {
    if (sultCategory._count.subscriptions > 0) {
      console.log(`"${SULT_CATEGORY}" has subscriptions: archived instead of deleted.`);
      if (!dry) await prisma.category.update({ where: { id: sultCategory.id }, data: { isArchived: true } });
    } else {
      if (!dry) await prisma.category.delete({ where: { id: sultCategory.id } });
      console.log(`Deleted "${SULT_CATEGORY}".`);
    }
  }
  if (dry) console.log("(dry run: nothing was changed)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
