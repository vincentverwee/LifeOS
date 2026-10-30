// The CHECK constraints `prisma db push` can't express, shared by apply-checks.ts
// (adds them) and check-drift.ts (confirms they're there).
import type { Pool } from "pg";

export type Check = {
  /** Constraint name in Postgres. */
  name: string;
  table: string;
  /** The CHECK expression. */
  check: string;
  /** Columns listed for rows that would break it. */
  columns: string;
  /** What the report calls those rows. */
  label: string;
  /** Thrown when such rows exist (the constraint can't be added). */
  fix: string;
};

const PUSH_LOCATION_CHECK = `(
  ("latitude" IS NULL AND "longitude" IS NULL AND "placeLabel" IS NULL AND "locationSource" IS NULL)
  OR ("latitude" IS NOT NULL AND "longitude" IS NOT NULL
      AND "latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180
      AND "placeLabel" IS NOT NULL AND "locationSource" IS NOT NULL AND "locationSource" IN ('gps', 'city'))
)`;

const SUBSCRIPTION_CHECK = `(
  "amount" > 0 AND "anchorDay" BETWEEN 1 AND 31 AND "repeat" IN ('monthly', 'yearly')
  AND ("repeat" = 'yearly') = ("anchorMonth" IS NOT NULL)
  AND ("anchorMonth" IS NULL OR "anchorMonth" BETWEEN 1 AND 12)
)`;

// Every branch spells out IS NOT NULL: a CHECK that comes out NULL counts as passed,
// so "latitude set, longitude NULL" would otherwise slip through.
const PUB_LOCATION_CHECK = `(
  ("latitude" IS NULL AND "longitude" IS NULL)
  OR ("latitude" IS NOT NULL AND "longitude" IS NOT NULL
      AND "latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180)
)`;

// No birthday at all, or month + day that exist together (29 Feb always may: the
// year is optional). Spelled out with IS NOT NULL, like PUB_LOCATION_CHECK.
const PERSON_BIRTHDAY_CHECK = `(
  ("birthMonth" IS NULL AND "birthDay" IS NULL AND "birthYear" IS NULL)
  OR ("birthMonth" IS NOT NULL AND "birthDay" IS NOT NULL
      AND "birthMonth" BETWEEN 1 AND 12
      AND "birthDay" BETWEEN 1 AND (CASE WHEN "birthMonth" = 2 THEN 29 WHEN "birthMonth" IN (4, 6, 9, 11) THEN 30 ELSE 31 END)
      AND ("birthYear" IS NULL OR "birthYear" BETWEEN 1900 AND 2100))
)`;

const GIFT_CHECK = `(
  "status" IN ('idea', 'bought', 'given')
  AND ("status" = 'given') = ("givenOn" IS NOT NULL)
  AND ("price" IS NULL OR "price" >= 0)
)`;

export const CHECKS: Check[] = [
  // Every expense belongs to exactly one month or one trip.
  {
    name: "expense_one_target",
    table: "Expense",
    check: `(("cycleId" IS NULL) <> ("tripId" IS NULL))`,
    columns: `id, "cycleId", "tripId"`,
    label: "Expenses without exactly one month or trip",
    fix: "Fix those expenses first.",
  },
  // A device's weather location is all set or all empty, with a known source.
  {
    name: "push_location",
    table: "PushSubscription",
    check: PUSH_LOCATION_CHECK,
    columns: "id",
    label: "Push devices with a half-set location",
    fix: "Fix those push devices first.",
  },
  // A subscription has a positive price and a valid monthly or yearly schedule.
  {
    name: "subscription_valid",
    table: "Subscription",
    check: SUBSCRIPTION_CHECK,
    columns: "id, name",
    label: "Subscriptions with an invalid schedule or amount",
    fix: "Fix those subscriptions first.",
  },
  // A pub has a full position or none.
  {
    name: "pub_location",
    table: "Pub",
    check: PUB_LOCATION_CHECK,
    columns: "id, name",
    label: "Pubs with a half-set location",
    fix: "Fix those pubs first.",
  },
  // A counted beer is 1–50 pints.
  {
    name: "expense_pints",
    table: "Expense",
    check: `("pints" IS NULL OR "pints" BETWEEN 1 AND 50)`,
    columns: "id, pints",
    label: "Expenses with an invalid pint count",
    fix: "Fix those pint counts first.",
  },
  // A beer's size is 50–2000 ml.
  {
    name: "expense_size",
    table: "Expense",
    check: `("sizeMl" IS NULL OR "sizeMl" BETWEEN 50 AND 2000)`,
    columns: "id, \"sizeMl\"",
    label: "Expenses with an invalid beer size",
    fix: "Fix those beer sizes first.",
  },
  // A birthday is a real day of the year.
  {
    name: "person_birthday",
    table: "Person",
    check: PERSON_BIRTHDAY_CHECK,
    columns: `id, name, "birthMonth", "birthDay", "birthYear"`,
    label: "People with an impossible birthday",
    fix: "Fix those birthdays first.",
  },
  // The "see them every" nudge is 1 day to 10 years.
  {
    name: "person_see_every",
    table: "Person",
    check: `("seeEveryDays" IS NULL OR "seeEveryDays" BETWEEN 1 AND 3650)`,
    columns: `id, name, "seeEveryDays"`,
    label: "People with an invalid catch-up nudge",
    fix: "Fix those nudges first.",
  },
  // A contact day is a visit or a message.
  {
    name: "person_contact_kind",
    table: "PersonSeen",
    check: `("kind" IN ('seen', 'message'))`,
    columns: `id, "personId", kind`,
    label: "Contact days of an unknown kind",
    fix: "Fix those contact days first.",
  },
  // A gift has a known status, a date exactly when given, and no negative price.
  {
    name: "gift_valid",
    table: "Gift",
    check: GIFT_CHECK,
    columns: "id, title, status",
    label: "Gifts with an invalid status, date or price",
    fix: "Fix those gifts first.",
  },
];

/** Public tables without RLS, and those the Supabase API roles still hold grants on. */
export async function apiExposure(pool: Pool): Promise<{ withoutRls: string[]; granted: string[] }> {
  const open = await pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity`
  );
  const granted = await pool.query<{ table_name: string }>(
    `SELECT DISTINCT table_name FROM information_schema.role_table_grants
     WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')`
  );
  return { withoutRls: open.rows.map((r) => r.tablename), granted: granted.rows.map((r) => r.table_name) };
}
