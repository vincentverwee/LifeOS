// One-off: ClothingItem's free-text `color` becomes `washGroup` ("coloured" | "white").
// Run BEFORE `npm run db:push` on each database (the push drops `color`), then apply-checks:
//   npx tsx prisma/convert-wash-group.ts [--dry]
// Idempotent: once `color` is gone it does nothing. Converts that database's own rows only,
// so it's fine on the cat deployment too.
import "dotenv/config";
import { Pool } from "pg";

const dry = process.argv.includes("--dry");
const pool = new Pool({ connectionString: process.env.DIRECT_URL });

/** Colours that go in the white wash; anything else (or none) is coloured. */
const WHITE = ["white", "wit", "off-white", "offwhite", "off white", "cream", "ivory", "ecru"];

async function main() {
  const col = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ClothingItem' AND column_name = 'color'`
  );
  if (col.rowCount === 0) {
    console.log("No color column: already converted.");
    return;
  }

  const colours = await pool.query<{ color: string | null; n: string }>(
    `SELECT color, count(*) AS n FROM "ClothingItem" GROUP BY color ORDER BY count(*) DESC`
  );
  for (const r of colours.rows) {
    const group = r.color && WHITE.includes(r.color.trim().toLowerCase()) ? "white" : "coloured";
    console.log(`${r.color ?? "(none)"}: ${r.n} → ${group}`);
  }
  if (dry) return;

  await pool.query(`ALTER TABLE "ClothingItem" ADD COLUMN IF NOT EXISTS "washGroup" text NOT NULL DEFAULT 'coloured'`);
  const white = await pool.query(
    `UPDATE "ClothingItem" SET "washGroup" = 'white' WHERE lower(btrim(color)) = ANY($1::text[])`,
    [WHITE]
  );
  console.log(`Set ${white.rowCount} items to white. Now run npm run db:push, then npx tsx prisma/apply-checks.ts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
