// One-off import of the older ExcelContextFiles/budget.xlsx sheets
// ("Budget 04-26" … "Budget 07-26"). Those sheets only logged balances
// (cash + bank) per day, running from the 18th to the 17th. Spending is
// derived from the drop between two days that were actually logged, booked on
// the later day. Rises (income, refunds) are skipped. Days the sheet only
// extrapolated with a formula are ignored.
//
// Each sheet becomes its own budget period (BudgetCycle, 18th → 17th) so it
// shows up in Insights next to the calendar months. Expenses go into an
// archived "Oud budget" category (hidden from the entry form).
//
//   npx tsx prisma/import-old-budget.ts [--dry]
// Safe to re-run: periods that already exist are skipped.
import "dotenv/config";
import path from "node:path";
import ExcelJS from "exceljs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
});

const DRY = process.argv.includes("--dry");
const FILE = path.join(__dirname, "..", "ExcelContextFiles", "budget.xlsx");
const CATEGORY = "Oud budget";
const MONTHS_NL = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

const SHEETS: { sheet: string; year: number; month: number; until?: number }[] = [
  { sheet: "Budget 04-26", year: 2026, month: 4 },
  { sheet: "Budget 05-26", year: 2026, month: 5 },
  { sheet: "Budget 06-26", year: 2026, month: 6 },
  // Only representative of life at home up to 28 July (logging stopped after that).
  { sheet: "Budget 07-26", year: 2026, month: 7, until: 28 },
];

function numeric(value: ExcelJS.CellValue): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "result" in value && typeof value.result === "number") {
    return value.result;
  }
  return null;
}

function isFilled(value: ExcelJS.CellValue): boolean {
  return value !== null && value !== undefined && value !== "";
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const key = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(FILE);

  let categoryId: string | null = null;
  if (!DRY) {
    const existing = await prisma.category.findFirst({ where: { name: CATEGORY }, select: { id: true } });
    const last = await prisma.category.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    categoryId =
      existing?.id ??
      (
        await prisma.category.create({
          data: { name: CATEGORY, color: "violet", isArchived: true, sortOrder: (last?.sortOrder ?? 0) + 10 },
          select: { id: true },
        })
      ).id;
  }

  for (const cfg of SHEETS) {
    const ws = workbook.getWorksheet(cfg.sheet);
    if (!ws) throw new Error(`Sheet "${cfg.sheet}" not found.`);

    const startDate = new Date(Date.UTC(cfg.year, cfg.month - 1, 18));
    const fullEnd = new Date(Date.UTC(cfg.year, cfg.month, 17));
    const endDate = cfg.until ? new Date(Date.UTC(cfg.year, cfg.month - 1, cfg.until)) : fullEnd;
    const fullDays = Math.round((fullEnd.getTime() - startDate.getTime()) / 86_400_000) + 1;
    const days = Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
    // A cut-short period gets the matching share of the sheet's budget.
    const budget = round2(((numeric(ws.getCell("J2").value) ?? 0) * days) / fullDays);
    const name = cfg.until
      ? `18 ${MONTHS_NL[cfg.month - 1]} – ${cfg.until} ${MONTHS_NL[cfg.month - 1]} ${cfg.year}`
      : `18 ${MONTHS_NL[cfg.month - 1]} – 17 ${MONTHS_NL[cfg.month % 12]} ${cfg.year}`;

    // Logged days: rows 2..32, column A = day of month, C = cash, D = bank, E = total.
    const logged: { date: Date; total: number }[] = [];
    for (let row = 2; row <= 32; row++) {
      const day = numeric(ws.getCell(row, 1).value);
      if (!day) continue;
      if (!isFilled(ws.getCell(row, 3).value) && !isFilled(ws.getCell(row, 4).value)) continue;
      const total = numeric(ws.getCell(row, 5).value);
      if (total === null) continue;
      // Days 18..31 belong to the sheet's month, 1..17 to the next one.
      // Date.UTC rolls an impossible day (e.g. 31 April) over to the next valid date.
      const monthIndex = day >= 18 ? cfg.month - 1 : cfg.month;
      const date = new Date(Date.UTC(cfg.year, monthIndex, day));
      if (date > endDate) continue;
      logged.push({ date, total });
    }

    const expenses: { date: Date; amount: number; note: string }[] = [];
    let skippedIncome = 0;
    for (let i = 1; i < logged.length; i++) {
      const prev = logged[i - 1];
      const cur = logged[i];
      const drop = round2(prev.total - cur.total);
      if (drop > 0) {
        const since = Math.round((cur.date.getTime() - prev.date.getTime()) / 86_400_000);
        expenses.push({
          date: cur.date,
          amount: drop,
          note: since > 1 ? `Afgeleid uit saldo (sinds ${key(prev.date)})` : "Afgeleid uit saldo",
        });
      } else if (drop < 0) {
        skippedIncome += -drop;
      }
    }

    const spent = round2(expenses.reduce((s, e) => s + e.amount, 0));
    console.log(
      `${name}: budget ${budget}, ${logged.length} logged days, ${expenses.length} spend entries = ${spent}` +
        (skippedIncome ? `, skipped ${round2(skippedIncome)} of income/top-ups` : "") +
        `, last logged ${logged.at(-1) ? key(logged.at(-1)!.date) : "—"}`
    );

    const exists = await prisma.budgetCycle.findFirst({ where: { startDate }, select: { id: true } });
    if (exists) {
      console.log("  already imported, skipping.");
      continue;
    }
    if (DRY || !categoryId) continue;

    const cycle = await prisma.budgetCycle.create({
      data: { name, startingBudget: budget, startDate, endDate },
      select: { id: true },
    });
    await prisma.expense.createMany({
      data: expenses.map((e) => ({
        categoryId: categoryId!,
        cycleId: cycle.id,
        date: e.date,
        amount: e.amount,
        note: e.note,
      })),
    });
    console.log("  imported.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
