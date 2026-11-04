// One-off: shrinks the PNG cut-outs already stored to what `resizeImage` makes now: a
// 256-colour PNG, stickers at most 500 px (STICKER_SIDE in TripStickers.tsx), clothes 700 px.
//   npx tsx prisma/shrink-photos.ts [--dry]
// Keeps each row's id (same picture, so cached URLs stay valid) and only writes when the
// result is smaller, so running it again does nothing. Touches only that database's own
// photos, so it's fine on the cat deployment too. Uses sharp (installed with Next).
import "dotenv/config";
import { Pool } from "pg";
import sharp from "sharp";

const dry = process.argv.includes("--dry");
const pool = new Pool({ connectionString: process.env.DIRECT_URL });

const TABLES = [
  { table: "StickerPhoto", side: 500 },
  { table: "ClothingPhoto", side: 700 },
] as const;

const kb = (n: number) => `${Math.round(n / 1000)} KB`;

async function main() {
  for (const { table, side } of TABLES) {
    const { rows } = await pool.query<{ id: string; data: Buffer }>(
      `SELECT id, data FROM "${table}" WHERE mime = 'image/png'`
    );
    let before = 0;
    let after = 0;
    let changed = 0;
    for (const row of rows) {
      const small = await sharp(row.data)
        .resize({ width: side, height: side, fit: "inside", withoutEnlargement: true })
        .png({ palette: true, colours: 256, quality: 90, effort: 10, compressionLevel: 9 })
        .toBuffer();
      before += row.data.length;
      if (small.length >= row.data.length) {
        after += row.data.length;
        continue;
      }
      after += small.length;
      changed++;
      console.log(`${table} ${row.id}: ${kb(row.data.length)} → ${kb(small.length)}`);
      if (!dry) await pool.query(`UPDATE "${table}" SET data = $1 WHERE id = $2`, [small, row.id]);
    }
    console.log(`${table}: ${changed} of ${rows.length} PNGs shrunk, ${kb(before)} → ${kb(after)}${dry ? " (dry run, nothing written)" : ""}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
