import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { TAG_COLOR_SLOTS } from "../src/lib/tagPalette";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SEED_TAGS: { name: string; color: (typeof TAG_COLOR_SLOTS)[number] }[] = [
  { name: "Supermarkt", color: "blue" },
  { name: "Bier - Sult", color: "orange" },
  { name: "Bier - Pub", color: "aqua" },
  { name: "Uit eten", color: "yellow" },
  { name: "Activiteiten", color: "magenta" },
  { name: "Koopjes", color: "green" },
  { name: "Bus", color: "violet" },
  { name: "Extra", color: "red" },
];

async function main() {
  for (const [index, tag] of SEED_TAGS.entries()) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: { name: tag.name, color: tag.color, sortOrder: index * 10 },
    });
  }
  console.log(`Seeded ${SEED_TAGS.length} tags.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
