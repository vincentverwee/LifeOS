import { BudgetNavigation } from "@/components/budget/BudgetNavigation";
import { BudgetTabBar } from "@/components/budget/BudgetTabBar";

export default function BudgetLayout({ children }: LayoutProps<"/budget">) {
  return (
    <div className="pb-tabbar">
      <BudgetNavigation />
      {children}
      <BudgetTabBar />
    </div>
  );
}
