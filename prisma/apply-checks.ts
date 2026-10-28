// What `prisma db push` can't express: API lockdown + constraints. Idempotent; run after every db:push:
//   npx tsx prisma/apply-checks.ts [--dry]
// --dry only reports open tables and rows that would violate the constraints.
import "dotenv/config";
import { Pool } from "pg";

const dry = process.argv.includes("--dry");
const pool = new Pool({ connectionString: process.env.DIRECT_URL });

const PUSH_LOCATION_CHECK = `(
  ("latitude" IS NULL AND "longitude" IS NULL AND "placeLabel" IS NULL AND "locationSource" IS NULL)
  OR ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180
      AND "placeLabel" IS NOT NULL AND "locationSource" IN ('gps', 'city'))
)`;

// Supabase exposes the public schema through its REST/GraphQL API as `anon`/`authenticated`.
// The app only talks to Postgres as `postgres` (owner, bypasses RLS), so those roles need
// nothing: take their grants away (also for tables created later) and turn on RLS with no
// policies as a second lock. Runs first so a failing data check below can't skip it.
async function lockDown() {
  const open = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity`
  );
  const granted = await pool.query(
    `SELECT DISTINCT table_name FROM information_schema.role_table_grants
     WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')`
  );
  console.log(`Tables without RLS: ${open.rowCount}`, open.rows.map((r) => r.tablename));
  console.log(`Tables the API roles can use: ${granted.rowCount}`);
  if (dry) return;

  for (const { tablename } of open.rows) {
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

  const badTargets = await pool.query(
    `SELECT id, "cycleId", "tripId" FROM "Expense" WHERE ("cycleId" IS NULL) = ("tripId" IS NULL)`
  );
  console.log(`Expenses without exactly one month or trip: ${badTargets.rowCount}`, badTargets.rows);

  const badLocations = await pool.query(
    `SELECT id FROM "PushSubscription" WHERE NOT (${PUSH_LOCATION_CHECK})`
  );
  console.log(`Push devices with a half-set location: ${badLocations.rowCount}`, badLocations.rows);

  if (dry) return;
  if (badTargets.rowCount) throw new Error("Fix those expenses first.");
  if (badLocations.rowCount) throw new Error("Fix those push devices first.");

  // A device's weather location is all set or all empty, with a known source.
  await pool.query(`ALTER TABLE "PushSubscription" DROP CONSTRAINT IF EXISTS push_location`);
  await pool.query(`ALTER TABLE "PushSubscription" ADD CONSTRAINT push_location CHECK (${PUSH_LOCATION_CHECK})`);
  console.log("Constraint push_location in place.");

  // Every expense belongs to exactly one month or one trip.
  await pool.query(`ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS expense_one_target`);
  await pool.query(
    `ALTER TABLE "Expense" ADD CONSTRAINT expense_one_target CHECK (("cycleId" IS NULL) <> ("tripId" IS NULL))`
  );
  console.log("Constraint expense_one_target in place.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
