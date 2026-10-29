// Does each database match prisma/schema.prisma and apply-checks.ts? Read-only:
//   npm run db:check
// Checks DIRECT_URL (your own) and CAT_DIRECT_URL (the cat deployment, when set):
// tables/columns via `prisma migrate diff`, then the CHECK constraints, RLS and
// API grants that db push doesn't know about. Exits 1 if anything is off.
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { Pool } from "pg";
import { apiExposure, CHECKS } from "./checks";

const prismaCli = createRequire(import.meta.url).resolve("prisma/build/index.js");

const targets = [
  { name: "own", url: process.env.DIRECT_URL },
  { name: "cat", url: process.env.CAT_DIRECT_URL },
];

/** The Supabase project ref in a pooler URL (`postgres.<ref>:…`), to show which database this is. */
function projectRef(url: string): string {
  return url.match(/postgres\.([a-z0-9]+)[:@]/)?.[1] ?? "?";
}

/** Problems with the tables and columns: the SQL db push would run, or nothing. */
function schemaDiff(url: string): string[] {
  // Prisma 7 only takes the database from the config file, which reads DIRECT_URL
  // (dotenv never overrides a variable that's already set).
  const run = spawnSync(
    process.execPath,
    [prismaCli, "migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--script", "--exit-code"],
    { env: { ...process.env, DIRECT_URL: url }, encoding: "utf8" }
  );
  if (run.status === 0) return [];
  if (run.status === 2) return [`schema differs, \`npm run db:push\` would run:\n${run.stdout.trim()}`];
  return [`prisma migrate diff failed (exit ${run.status}):\n${(run.stderr || run.stdout).trim()}`];
}

/** Problems apply-checks.ts would fix: missing constraints, tables open to the API. */
async function lockProblems(url: string): Promise<string[]> {
  const pool = new Pool({ connectionString: url });
  try {
    const { rows } = await pool.query<{ conname: string }>(
      `SELECT conname FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
       WHERE n.nspname = 'public' AND c.contype = 'c'`
    );
    const present = new Set(rows.map((r) => r.conname));
    const missing = CHECKS.filter((c) => !present.has(c.name)).map((c) => c.name);
    const { withoutRls, granted } = await apiExposure(pool);
    return [
      ...(missing.length ? [`missing CHECK constraints: ${missing.join(", ")}`] : []),
      ...(withoutRls.length ? [`tables without RLS: ${withoutRls.join(", ")}`] : []),
      ...(granted.length ? [`tables the Supabase API can use: ${granted.join(", ")}`] : []),
    ];
  } finally {
    await pool.end();
  }
}

async function main() {
  let failed = false;
  const own = targets[0].url;
  for (const { name, url } of targets) {
    if (!url) {
      console.log(`${name}: skipped (${name === "cat" ? "CAT_DIRECT_URL" : "DIRECT_URL"} not set)`);
      continue;
    }
    if (name === "cat" && url === own) {
      console.log("cat: skipped (CAT_DIRECT_URL is the same as DIRECT_URL — is .env still switched to the cat database?)");
      failed = true;
      continue;
    }
    const problems = [...schemaDiff(url), ...(await lockProblems(url))];
    const label = `${name} (${projectRef(url)})`;
    if (problems.length === 0) {
      console.log(`${label}: OK`);
    } else {
      failed = true;
      console.log(`${label}: DRIFT`);
      for (const p of problems) console.log(`  - ${p.replace(/\n/g, "\n    ")}`);
    }
  }
  if (failed) {
    console.log("\nFix: point DIRECT_URL at that database, then `npm run db:push` and `npx tsx prisma/apply-checks.ts`.");
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
