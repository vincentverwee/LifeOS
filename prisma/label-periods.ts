// One-off: give every month/period without a label one, based on its start date.
// Before Galway (Erasmus) = "Thuis", from September 2026 = "Galway".
//   npx tsx prisma/label-periods.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
});

const GALWAY_START = new Date(Date.UTC(2026, 8, 1));

async function main() {
  const home = await prisma.budgetCycle.updateMany({
    where: { label: null, startDate: { lt: GALWAY_START } },
    data: { label: "Thuis" },
  });
  const galway = await prisma.budgetCycle.updateMany({
    where: { label: null, startDate: { gte: GALWAY_START } },
    data: { label: "Galway" },
  });
  console.log(`Labelled ${home.count} as Thuis, ${galway.count} as Galway.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
