import { InvestNavigation } from "@/components/invest/InvestNavigation";
import { InvestTabBar } from "@/components/invest/InvestTabBar";

export default function InvestLayout({ children }: LayoutProps<"/invest">) {
  return (
    <div className="pb-tabbar">
      <InvestNavigation />
      {children}
      <InvestTabBar />
    </div>
  );
}
