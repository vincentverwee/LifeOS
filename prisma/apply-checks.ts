// What `prisma db push` can't express: API lockdown + constraints. Idempotent; run after every db:push:
//   npx tsx prisma/apply-checks.ts [--dry]
// --dry only reports open tables and rows that would violate the constraints.
// The constraints themselves are listed in checks.ts; `npm run db:check` confirms both databases have them.
import "dotenv/config";
import { Pool } from "pg";
import { apiExposure, CHECKS } from "./checks";

const dry = process.argv.includes("--dry");
const pool = new Pool({ connectionString: process.env.DIRECT_URL });

// Supabase exposes the public schema through its REST/GraphQL API as `anon`/`authenticated`.
// The app only talks to Postgres as `postgres` (owner, bypasses RLS), so those roles need
// nothing: take their grants away (also for tables created later) and turn on RLS with no
// policies as a second lock. Runs first so a failing data check below can't skip it.
async function lockDown() {
  const { withoutRls, granted } = await apiExposure(pool);
  console.log(`Tables without RLS: ${withoutRls.length}`, withoutRls);
  console.log(`Tables the API roles can use: ${granted.length}`);
  if (dry) return;

  for (const tablename of withoutRls) {
    await pool.query(`ALTER TABLE public."${tablename.replace(/"/g, '""')}" ENABLE ROW LEVEL SECURITY`);
  }
  await pool.query(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated`);
  await pool.query(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated`);
  await pool.query(
    `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated`
  );
  await pool.query(
    `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated`
  );
  console.log("RLS on every public table; API roles have no access.");
}

async function main() {
  await lockDown();

  const dupMonths = await pool.query(
    `SELECT "startDate", count(*) FROM "BudgetCycle" GROUP BY "startDate" HAVING count(*) > 1`
  );
  console.log(`BudgetCycle rows sharing a startDate: ${dupMonths.rowCount}`, dupMonths.rows);

  const broken = [];
  for (const c of CHECKS) {
    const bad = await pool.query(`SELECT ${c.columns} FROM "${c.table}" WHERE NOT (${c.check})`);
    console.log(`${c.label}: ${bad.rowCount}`, bad.rows);
    if (bad.rowCount) broken.push(c);
  }

  if (dry) return;
  if (broken.length) throw new Error(broken.map((c) => c.fix).join(" "));

  for (const c of CHECKS) {
    await pool.query(`ALTER TABLE "${c.table}" DROP CONSTRAINT IF EXISTS ${c.name}`);
    await pool.query(`ALTER TABLE "${c.table}" ADD CONSTRAINT ${c.name} CHECK (${c.check})`);
    console.log(`Constraint ${c.name} in place.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
