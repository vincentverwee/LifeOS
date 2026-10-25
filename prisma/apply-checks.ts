// Constraints `prisma db push` can't express. Idempotent; run after every db:push:
//   npx tsx prisma/apply-checks.ts [--dry]
// --dry only reports rows that would violate them.
import "dotenv/config";
import { Pool } from "pg";

const dry = process.argv.includes("--dry");
const pool = new Pool({ connectionString: process.env.DIRECT_URL });

async function main() {
  const dupMonths = await pool.query(
    `SELECT "startDate", count(*) FROM "BudgetCycle" GROUP BY "startDate" HAVING count(*) > 1`
  );
  console.log(`BudgetCycle rows sharing a startDate: ${dupMonths.rowCount}`, dupMonths.rows);

  const badTargets = await pool.query(
    `SELECT id, "cycleId", "tripId" FROM "Expense" WHERE ("cycleId" IS NULL) = ("tripId" IS NULL)`
  );
  console.log(`Expenses without exactly one month or trip: ${badTargets.rowCount}`, badTargets.rows);

  if (dry) return;
  if (badTargets.rowCount) throw new Error("Fix those expenses first.");

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
