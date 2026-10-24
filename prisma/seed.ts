import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { CATEGORY_COLOR_SLOTS } from "../src/lib/categoryPalette";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Starter categories for an empty database. Existing ones are left untouched.
const SEED_CATEGORIES: { name: string; color: (typeof CATEGORY_COLOR_SLOTS)[number]; pintPrice?: number }[] = [
  { name: "Supermarkt", color: "blue" },
  { name: "Bier - Fakbar", color: "orange", pintPrice: 6.7 },
  { name: "Bier - Pub", color: "aqua", pintPrice: 7.7 },
  { name: "Uit eten", color: "yellow" },
  { name: "Activiteiten", color: "magenta" },
  { name: "Koopjes", color: "green" },
  { name: "Bus", color: "violet" },
  { name: "Extra", color: "red" },
];

async function main() {
  for (const [index, category] of SEED_CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: {
        name: category.name,
        color: category.color,
        sortOrder: index * 10,
        pintPrice: category.pintPrice ?? null,
      },
    });
  }
  console.log(`Seeded ${SEED_CATEGORIES.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
