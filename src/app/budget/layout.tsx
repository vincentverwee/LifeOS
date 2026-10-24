import { BudgetNavigation } from "@/components/budget/BudgetNavigation";

export default function BudgetLayout({ children }: LayoutProps<"/budget">) {
  return (
    <>
      <BudgetNavigation />
      {children}
    </>
  );
}
