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

const WORKOUT_CHECK = `(
  ("endedAt" IS NULL OR ("durationMin" IS NOT NULL AND "endedAt" >= "startedAt"))
  AND ("durationMin" IS NULL OR "durationMin" BETWEEN 1 AND 1440)
  AND ("distanceKm" IS NULL OR "distanceKm" > 0)
  AND ("effort" IS NULL OR "effort" BETWEEN 1 AND 5)
  AND ("feel" IS NULL OR "feel" BETWEEN 1 AND 5)
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
  // A link joins two different people, stored once (smaller id first).
  {
    name: "person_link_pair",
    table: "PersonLink",
    check: `("aId" < "bId")`,
    columns: `id, "aId", "bId"`,
    label: "Person links stored the wrong way round or to themselves",
    fix: "Fix those links first.",
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
  // A clothing item is clean, in the wash or drying.
  {
    name: "clothing_status",
    table: "ClothingItem",
    check: `("status" IN ('clean', 'wash', 'drying'))`,
    columns: "id, name, status",
    label: "Clothing items with an unknown status",
    fix: "Fix those clothing statuses first.",
  },
  // A clothing item goes in the coloured or the white wash.
  {
    name: "clothing_wash_group",
    table: "ClothingItem",
    check: `("washGroup" IN ('coloured', 'white'))`,
    columns: `id, name, "washGroup"`,
    label: "Clothing items with an unknown wash group",
    fix: "Fix those wash groups first.",
  },
  // A clothing price is empty or not negative.
  {
    name: "clothing_price",
    table: "ClothingItem",
    check: `("price" IS NULL OR "price" >= 0)`,
    columns: "id, name, price",
    label: "Clothing items with a negative price",
    fix: "Fix those clothing prices first.",
  },
  // A course's final grade is empty or 0–20.
  {
    name: "study_course_grade",
    table: "StudyCourse",
    check: `("grade" IS NULL OR "grade" BETWEEN 0 AND 20)`,
    columns: "id, name, grade",
    label: "Study courses with a grade outside 0–20",
    fix: "Fix those course grades first.",
  },
  // A diary day is 1–2000 characters (bits of ≤ 280 on their own lines), the mood 1–5 or empty.
  {
    name: "diary_entry",
    table: "DiaryEntry",
    check: `(char_length(btrim("text")) BETWEEN 1 AND 2000 AND ("mood" IS NULL OR "mood" BETWEEN 1 AND 5))`,
    columns: "id, date, mood",
    label: "Diary entries that are empty or too long, or have an invalid mood",
    fix: "Fix those diary entries first.",
  },
  // The weekly review's win: 1–280 characters, keyed by a Monday.
  {
    name: "week_review",
    table: "WeekReview",
    check: `(char_length(btrim("win")) BETWEEN 1 AND 280 AND extract(isodow FROM "weekStart") = 1)`,
    columns: '"weekStart", win',
    label: "Week reviews with an empty or too long win, or not on a Monday",
    fix: "Fix those week reviews first.",
  },
  // A workout activity is cardio, a sport or bodyweight.
  {
    name: "workout_activity",
    table: "WorkoutActivity",
    check: `("kind" IN ('cardio', 'sport', 'bodyweight') AND char_length(btrim("name")) BETWEEN 1 AND 40)`,
    columns: "id, name, kind",
    label: "Workout activities with an unknown kind or a bad name",
    fix: "Fix those workout activities first.",
  },
  // An exercise is counted in reps or held for a time.
  {
    name: "exercise_measure",
    table: "Exercise",
    check: `("measure" IN ('reps', 'time') AND char_length(btrim("name")) BETWEEN 1 AND 40)`,
    columns: "id, name, measure",
    label: "Exercises with an unknown measure or a bad name",
    fix: "Fix those exercises first.",
  },
  // A finished workout has a duration; numbers stay in range.
  {
    name: "workout_valid",
    table: "Workout",
    check: WORKOUT_CHECK,
    columns: `id, date, "durationMin", "endedAt", effort, feel`,
    label: "Workouts without a duration, or with out-of-range numbers",
    fix: "Fix those workouts first.",
  },
  // A set has reps or seconds (exactly one of them), each at least 1.
  {
    name: "workout_set",
    table: "WorkoutSet",
    check: `(("reps" IS NULL) <> ("seconds" IS NULL) AND ("reps" IS NULL OR "reps" BETWEEN 1 AND 1000) AND ("seconds" IS NULL OR "seconds" BETWEEN 1 AND 7200))`,
    columns: `id, "workoutId", reps, seconds`,
    label: "Workout sets without exactly one of reps or seconds",
    fix: "Fix those workout sets first.",
  },
  // A template exercise: 1-10 sets, a target of at least 1, rest 0-600 s.
  {
    name: "template_exercise",
    table: "TemplateExercise",
    check: `("sets" BETWEEN 1 AND 10 AND "target" BETWEEN 1 AND 7200 AND "restSeconds" BETWEEN 0 AND 600)`,
    columns: `id, "templateId", sets, target, "restSeconds"`,
    label: "Template exercises with out-of-range sets, target or rest",
    fix: "Fix those template exercises first.",
  },
  // 1-14 workouts a week.
  {
    name: "workout_goal",
    table: "WorkoutGoal",
    check: `("perWeek" BETWEEN 1 AND 14)`,
    columns: `id, "perWeek"`,
    label: "Workout goals outside 1-14 a week",
    fix: "Fix the workout goal first.",
  },
  // A weigh-in between 20 and 300 kg.
  {
    name: "body_weight",
    table: "BodyWeight",
    check: `("kg" BETWEEN 20 AND 300)`,
    columns: "id, date, kg",
    label: "Weigh-ins outside 20-300 kg",
    fix: "Fix those weigh-ins first.",
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
