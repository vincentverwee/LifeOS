import { WardrobeNavigation } from "@/components/wardrobe/WardrobeNavigation";
import { WardrobeTabBar } from "@/components/wardrobe/WardrobeTabBar";

export default function WardrobeLayout({ children }: LayoutProps<"/wardrobe">) {
  return (
    <div className="pb-tabbar">
      <WardrobeNavigation />
      {children}
      <WardrobeTabBar />
    </div>
  );
}
