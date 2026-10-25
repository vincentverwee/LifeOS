// One-off import of the study logs in ExcelContextFiles/ (blok2studeertijd,
// Lessen2.1, Lessen2.2, Lessen3.1) into StudyPeriod / StudyCourse / StudyEntry,
// plus exams and the Lessen3.1 lesson grid. The "Vergelijking" sheets are
// derived copies and are not read.
//
// A subjects cell like "DBT, MFE" splits the day's hours equally over the
// courses (the sheets' Uren/#vak rule). Text that isn't a course becomes the
// note; "X EXAMEN" also records an exam for X on that day.
//
// Safe to re-run: a period that already exists (by name) is skipped.
//
//   npx tsx prisma/import-lessons.ts [--dry]
import "dotenv/config";
import path from "node:path";
import ExcelJS from "exceljs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { LessonStatus } from "../src/lib/lessons/marks";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DRY = process.argv.includes("--dry");
const DIR = path.join(__dirname, "..", "ExcelContextFiles");
const COLORS = ["blue", "orange", "aqua", "yellow", "magenta", "green", "violet", "red"];
// Rows dated after this are plans, not logged days.
const TODAY = new Date().toISOString().slice(0, 10);

type CourseDef = { code: string; name: string; aliases?: string[]; hasWc?: boolean };

type PeriodDef = {
  name: string;
  startDate: string;
  blokStart: string;
  endDate: string;
  courses: CourseDef[];
  log: {
    file: string;
    sheet: string;
    firstRow: number;
    lastRow: number;
    subjectsCol?: number;
    noteCol?: number;
  };
  /** expected sum of the hours column, as the sheet's own total shows it */
  expectedTotal: number;
  exams?: { code: string; date: string; kind: "exam" | "test"; note?: string }[];
  grid?: { sheet: string; firstRow: number; lastRow: number; columns: { code: string; kind: "HC" | "WC"; col: number }[] };
};

const PERIODS: PeriodDef[] = [
  {
    // Only the blok was logged (hours, no subjects); courses from Lessen.xlsx.
    name: "Semester 1.2",
    startDate: "2025-05-22",
    blokStart: "2025-05-22",
    endDate: "2025-06-27",
    courses: [
      { code: "Marketing", name: "Marketing" },
      { code: "Eco recht", name: "Economisch recht" },
      { code: "Bank & fin", name: "Bank en financiewezen", hasWc: true },
      { code: "Wiskunde II", name: "Hogere Wiskunde II", hasWc: true },
      { code: "Globale eco", name: "Globale economie", hasWc: true },
      { code: "Frans", name: "Frans" },
      { code: "Engels", name: "Engels" },
    ],
    log: { file: "blok2studeertijd.xlsx", sheet: "Sheet1", firstRow: 2, lastRow: 38 },
    expectedTotal: 218.4,
  },
  {
    name: "Semester 2.1",
    startDate: "2025-09-22",
    blokStart: "2025-12-22",
    endDate: "2026-01-28",
    courses: [
      { code: "SOEP", name: "Softwareontwerp en programmeren", aliases: ["Software"] },
      { code: "K&S", name: "Kansrekenen en statistiek", aliases: ["Statistiek"] },
      { code: "BIS", name: "BIS" },
      { code: "Natuurkunde", name: "Natuurkunde", hasWc: true },
      { code: "MO", name: "Mens en organisatie" },
      { code: "Frans", name: "Frans" },
      { code: "Engels", name: "Engels" },
    ],
    log: { file: "Lessen2.1.xlsx", sheet: "Blok statistieken", firstRow: 2, lastRow: 69, subjectsCol: 3, noteCol: 5 },
    expectedTotal: 330.85,
  },
  {
    name: "Semester 2.2",
    startDate: "2026-02-09",
    blokStart: "2026-05-25",
    endDate: "2026-06-27",
    courses: [
      { code: "STAT", name: "Statistiek voor data science", aliases: ["Statistiek", "Data Science"], hasWc: true },
      { code: "SOEP2", name: "Softwareontwerp en programmeren 2", aliases: ["SOEP 2"] },
      { code: "PLM", name: "Productie en Logistiek Management", hasWc: true },
      { code: "LO", name: "Lineaire optimalisatie", hasWc: true },
      { code: "BEFI", name: "Bedrijfsfinanciering", hasWc: true },
      { code: "ME", name: "Managerial Economics", hasWc: true },
      { code: "Engels", name: "Engels" },
      { code: "Frans", name: "Frans" },
    ],
    log: { file: "Lessen2.2.xlsx", sheet: "Blok stat", firstRow: 2, lastRow: 83, subjectsCol: 3, noteCol: 4 },
    expectedTotal: 390.85,
    exams: [
      { code: "Engels", date: "2026-05-13", kind: "exam" },
      { code: "Frans", date: "2026-05-19", kind: "exam" },
    ],
  },
  {
    name: "Semester 3.1 · Galway",
    startDate: "2026-09-07",
    blokStart: "2026-11-15",
    endDate: "2026-12-18",
    courses: [
      { code: "BIA", name: "Business Int. and Analytics" },
      { code: "DBT", name: "Database Technologies" },
      { code: "UX", name: "UX Design" },
      { code: "FM", name: "Financial management", hasWc: true },
      { code: "MFE", name: "Maths for economics", hasWc: true },
    ],
    log: { file: "Lessen3.1.xlsx", sheet: "Blok stat", firstRow: 2, lastRow: 200, subjectsCol: 3, noteCol: 4 },
    expectedTotal: 14.5,
    exams: [
      { code: "DBT", date: "2026-10-13", kind: "test" },
      { code: "MFE", date: "2026-10-13", kind: "test" },
      { code: "MFE", date: "2026-11-03", kind: "test" },
      { code: "DBT", date: "2026-11-10", kind: "test" },
      { code: "MFE", date: "2026-11-17", kind: "test" },
    ],
    grid: {
      sheet: "Lessen",
      firstRow: 6, // week 1
      lastRow: 20, // week 15; week 16 is the "BLOK START" row
      columns: [
        { code: "BIA", kind: "HC", col: 3 },
        { code: "DBT", kind: "HC", col: 5 },
        { code: "UX", kind: "HC", col: 7 },
        { code: "FM", kind: "HC", col: 9 },
        { code: "FM", kind: "WC", col: 10 },
        { code: "MFE", kind: "HC", col: 11 },
        { code: "MFE", kind: "WC", col: 12 },
      ],
    },
  },
];

const GRID_STATUS: Record<string, LessonStatus> = {
  x: "attended",
  o: "missed",
  done: "done",
  "not done": "not_done",
  busy: "busy",
  ingepland: "planned",
  dringend: "urgent",
  "geen les": "no_class",
};

function numeric(value: ExcelJS.CellValue): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "result" in value && typeof value.result === "number") {
    return value.result;
  }
  return null;
}

function dateKeyOf(value: ExcelJS.CellValue): string | null {
  const v = value && typeof value === "object" && "result" in value ? value.result : value;
  if (!(v instanceof Date) || Number.isNaN(v.getTime()) || v.getUTCFullYear() < 2000) return null;
  return v.toISOString().slice(0, 10);
}

/** Plain text of a cell; the 1899 "times" in Lessen2.2's column D are not text. */
function text(value: ExcelJS.CellValue): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && "richText" in value) {
    return value.richText.map((t) => t.text).join("").trim();
  }
  return "";
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const utc = (key: string) => new Date(`${key}T00:00:00Z`);

type ParsedSubjects = { codes: string[]; exams: string[]; rest: string[] };

/** "SOEP EXAMEN, K&S" -> codes SOEP + K&S, exam for SOEP. Unknown text is kept as note. */
function parseSubjects(raw: string, courses: CourseDef[]): ParsedSubjects {
  const out: ParsedSubjects = { codes: [], exams: [], rest: [] };
  for (const token of raw.split(/[,/]/).map((t) => t.trim()).filter(Boolean)) {
    const lower = token.toLowerCase();
    let course: CourseDef | undefined;
    let alias = "";
    for (const c of courses) {
      // longest alias first, so "Statistiek" wins over "STAT"
      const names = [c.code, ...(c.aliases ?? [])].sort((a, b) => b.length - a.length);
      const hit = names.find((a) => lower === a.toLowerCase() || lower.startsWith(`${a.toLowerCase()} `));
      if (hit && hit.length > alias.length) {
        course = c;
        alias = hit;
      }
    }
    if (!course) {
      out.rest.push(token);
      continue;
    }
    if (!out.codes.includes(course.code)) out.codes.push(course.code);
    let remainder = token.slice(alias.length).trim();
    if (/\bexamen\b/i.test(remainder)) {
      out.exams.push(course.code);
      remainder = remainder.replace(/\bexamen\b/i, "").trim();
    }
    if (remainder) out.rest.push(remainder);
  }
  return out;
}

type EntryRow = { date: string; hours: number; code: string | null; note: string | null };

async function readLog(def: PeriodDef) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(DIR, def.log.file));
  const ws = wb.getWorksheet(def.log.sheet);
  if (!ws) throw new Error(`${def.log.file}: no sheet "${def.log.sheet}"`);

  const entries: EntryRow[] = [];
  const exams: { code: string; date: string }[] = [];
  const unmatched = new Set<string>();
  let total = 0;

  for (let r = def.log.firstRow; r <= def.log.lastRow; r++) {
    const row = ws.getRow(r);
    const date = dateKeyOf(row.getCell(1).value);
    if (!date) continue;
    const hours = numeric(row.getCell(2).value);
    const subjects = def.log.subjectsCol ? text(row.getCell(def.log.subjectsCol).value) : "";
    const noteCell = def.log.noteCol ? text(row.getCell(def.log.noteCol).value) : "";
    const parsed = parseSubjects(subjects, def.courses);
    parsed.rest.forEach((t) => unmatched.add(t));
    for (const code of parsed.exams) exams.push({ code, date });

    const noteParts = [...parsed.rest, noteCell].filter((t) => t && t !== "/");
    const note = noteParts.length ? noteParts.join(" · ") : null;

    if (hours === null) {
      // Not logged; keep a day-off note only for days that already happened.
      if (note && date <= TODAY) entries.push({ date, hours: 0, code: null, note });
      continue;
    }
    total += hours;
    if (hours === 0 || parsed.codes.length === 0) {
      entries.push({ date, hours: round2(hours), code: null, note });
      continue;
    }
    // Equal split; the last course takes the rounding rest so the day adds up.
    const share = round2(hours / parsed.codes.length);
    parsed.codes.forEach((code, i) => {
      const last = i === parsed.codes.length - 1;
      entries.push({
        date,
        hours: last ? round2(hours - share * (parsed.codes.length - 1)) : share,
        code,
        note: i === 0 ? note : null,
      });
    });
  }
  return { entries, exams, unmatched, total: round2(total) };
}

async function readGrid(def: PeriodDef) {
  if (!def.grid) return [];
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(DIR, def.log.file));
  const ws = wb.getWorksheet(def.grid.sheet);
  if (!ws) throw new Error(`${def.log.file}: no sheet "${def.grid.sheet}"`);

  const marks: { code: string; week: number; kind: "HC" | "WC"; status: LessonStatus }[] = [];
  for (let r = def.grid.firstRow; r <= def.grid.lastRow; r++) {
    const week = r - def.grid.firstRow + 1;
    for (const column of def.grid.columns) {
      const raw = text(ws.getRow(r).getCell(column.col).value).toLowerCase();
      if (!raw) continue;
      const status = GRID_STATUS[raw];
      if (!status) {
        console.warn(`  ! grid week ${week} ${column.code} ${column.kind}: unknown "${raw}"`);
        continue;
      }
      marks.push({ code: column.code, week, kind: column.kind, status });
    }
  }
  return marks;
}

async function main() {
  for (const def of PERIODS) {
    const { entries, exams, unmatched, total } = await readLog(def);
    const marks = await readGrid(def);
    const allExams = [...exams.map((e) => ({ ...e, kind: "exam" as const })), ...(def.exams ?? [])];

    console.log(`\n${def.name}: ${entries.length} entries, ${total} h (sheet says ${def.expectedTotal} h)`);
    if (Math.abs(total - def.expectedTotal) > 0.01) console.warn("  ! total differs from the sheet");
    console.log(`  exams: ${allExams.map((e) => `${e.code} ${e.kind} ${e.date}`).join(", ") || "none"}`);
    console.log(`  grid marks: ${marks.length}`);
    if (unmatched.size) console.log(`  kept as note: ${[...unmatched].join(" | ")}`);

    if (DRY) continue;
    if (await prisma.studyPeriod.findUnique({ where: { name: def.name } })) {
      console.log("  already imported, skipped");
      continue;
    }

    const period = await prisma.studyPeriod.create({
      data: {
        name: def.name,
        startDate: utc(def.startDate),
        blokStart: utc(def.blokStart),
        endDate: utc(def.endDate),
        courses: {
          create: def.courses.map((c, i) => ({
            code: c.code,
            name: c.name,
            color: COLORS[i % COLORS.length],
            sortOrder: i * 10,
            hasWc: c.hasWc ?? false,
          })),
        },
      },
      include: { courses: true },
    });
    const courseId = new Map(period.courses.map((c) => [c.code, c.id]));

    await prisma.studyEntry.createMany({
      data: entries.map((e) => ({
        periodId: period.id,
        courseId: e.code ? courseId.get(e.code)! : null,
        date: utc(e.date),
        hours: e.hours,
        note: e.note,
      })),
    });
    if (allExams.length) {
      await prisma.studyExam.createMany({
        data: allExams.map((e) => ({ courseId: courseId.get(e.code)!, date: utc(e.date), kind: e.kind })),
      });
    }
    if (marks.length) {
      await prisma.lessonMark.createMany({
        data: marks.map((m) => ({ courseId: courseId.get(m.code)!, week: m.week, kind: m.kind, status: m.status })),
      });
    }
    console.log("  imported");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
