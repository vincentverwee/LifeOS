// Import / top-up of ExcelContextFiles/BudgetGalway.xlsx (September + Oktober
// month sheets) into the month model. Safe to re-run: it only adds expenses for
// (category, day) cells that are missing, and refreshes the balances.
//
//   npx tsx prisma/import-excel.ts [--dry]
import "dotenv/config";
import path from "node:path";
import ExcelJS from "exceljs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DRY = process.argv.includes("--dry");
const FILE = path.join(__dirname, "..", "ExcelContextFiles", "BudgetGalway.xlsx");

const SHEETS = [
  { sheet: "September", name: "September 2026", year: 2026, month: 9 },
  { sheet: "Oktober", name: "Oktober 2026", year: 2026, month: 10 },
];

// Sheet layout: header in row 2, one row per day from row 3, categories in B:I.
const FIRST_DAY_ROW = 3;
const FIRST_CATEGORY_COL = 2;
const LAST_CATEGORY_COL = 9;
// The sheet's "Bier - Sult" is called "Bier - Fakbar" in the app.
const CATEGORY_ALIASES: Record<string, string> = { "Bier - Sult": "Bier - Fakbar" };

function numeric(value: ExcelJS.CellValue): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "result" in value && typeof value.result === "number") {
    return value.result;
  }
  return null;
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(FILE);

  const categoryId = new Map<string, string>(); // lower-case name -> id
  async function categoryFor(sheetName: string): Promise<string | null> {
    const name = CATEGORY_ALIASES[sheetName] ?? sheetName;
    const cached = categoryId.get(name.toLowerCase());
    if (cached) return cached;
    const found = await prisma.category.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (found) {
      categoryId.set(name.toLowerCase(), found.id);
      return found.id;
    }
    if (DRY) return null;
    const last = await prisma.category.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    const created = await prisma.category.create({
      data: { name, sortOrder: (last?.sortOrder ?? -10) + 10 },
      select: { id: true },
    });
    categoryId.set(name.toLowerCase(), created.id);
    return created.id;
  }

  for (const cfg of SHEETS) {
    const startDate = new Date(Date.UTC(cfg.year, cfg.month - 1, 1));
    const endDate = new Date(Date.UTC(cfg.year, cfg.month, 0));
    const daysInMonth = endDate.getUTCDate();

    const existing = await prisma.budgetCycle.findFirst({
      where: { startDate },
      include: { expenses: { select: { categoryId: true, date: true } } },
    });

    const ws = workbook.getWorksheet(cfg.sheet);
    if (!ws) throw new Error(`Sheet "${cfg.sheet}" not found.`);

    const setting = (row: number) => numeric(ws.getCell(row, 15).value) ?? 0;
    const bank = setting(3);
    const tricount = setting(4);
    const cash = setting(5);
    const rent = setting(6);
    const rentDay = setting(7) || null;
    const budget = setting(8);

    const sheetCategories: string[] = [];
    for (let col = FIRST_CATEGORY_COL; col <= LAST_CATEGORY_COL; col++) {
      sheetCategories.push(String(ws.getCell(2, col).value ?? "").trim());
    }

    const expenses: { category: string; date: Date; amount: number }[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const row = FIRST_DAY_ROW + day - 1;
      const date = new Date(Date.UTC(cfg.year, cfg.month - 1, day));
      sheetCategories.forEach((category, index) => {
        const amount = numeric(ws.getCell(row, FIRST_CATEGORY_COL + index).value);
        if (amount && amount > 0) {
          expenses.push({ category, date, amount: Math.round(amount * 100) / 100 });
        }
      });
    }

    let cycleId = existing?.id;
    if (!existing) {
      console.log(`${cfg.name}: new month, budget ${budget}, rent ${rent} (day ${rentDay}).`);
      if (!DRY) {
        const created = await prisma.budgetCycle.create({
          data: {
            name: cfg.name,
            startingBudget: budget,
            startDate,
            endDate,
            bank,
            tricount,
            cash,
            balancesUpdatedAt: new Date(),
            rent,
            rentDay,
          },
          select: { id: true },
        });
        cycleId = created.id;
      }
    }

    // Top-up: only add (category, day) cells that have no expense yet; never touch existing ones.
    const have = new Set(
      (existing?.expenses ?? []).map((e) => `${e.categoryId}|${e.date.toISOString().slice(0, 10)}`)
    );
    let added = 0;
    for (const e of expenses) {
      const cid = await categoryFor(e.category);
      const day = e.date.toISOString().slice(0, 10);
      if (cid && have.has(`${cid}|${day}`)) continue;
      added++;
      console.log(`  + ${day} ${e.category} ${e.amount}`);
      if (DRY || !cid || !cycleId) continue;
      await prisma.expense.create({
        data: { categoryId: cid, cycleId, date: e.date, amount: e.amount },
      });
    }
    console.log(`${cfg.name}: ${added} new expense(s).`);

    if (existing && !DRY) {
      console.log(
        `  Balances sheet/DB: bank ${bank}/${existing.bank}, tricount ${tricount}/${existing.tricount}, cash ${cash}/${existing.cash}.`
      );
      await prisma.budgetCycle.update({
        where: { id: existing.id },
        data: { bank, tricount, cash, balancesUpdatedAt: new Date() },
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
