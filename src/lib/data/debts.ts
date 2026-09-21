import "server-only";
import { prisma } from "@/lib/prisma";

export type Debt = {
  id: string;
  name: string;
  amount: number;
  note: string | null;
};

export async function getDebts(): Promise<Debt[]> {
  const debts = await prisma.debt.findMany({
    orderBy: { createdAt: "asc" },
  });

  return debts.map((debt) => ({
    id: debt.id,
    name: debt.name,
    amount: debt.amount.toNumber(),
    note: debt.note,
  }));
}
