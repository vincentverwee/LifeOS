import { BeerNavigation } from "@/components/beer/BeerNavigation";
import { BeerTabBar } from "@/components/beer/BeerTabBar";

export default function BeerLayout({ children }: LayoutProps<"/beer">) {
  return (
    <div className="pb-tabbar">
      <BeerNavigation />
      {children}
      <BeerTabBar />
    </div>
  );
}
