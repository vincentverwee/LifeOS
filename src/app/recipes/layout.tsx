import { RecipesNavigation } from "@/components/recipes/RecipesNavigation";
import { RecipesTabBar } from "@/components/recipes/RecipesTabBar";

export default function RecipesLayout({ children }: LayoutProps<"/recipes">) {
  return (
    <div className="pb-tabbar">
      <RecipesNavigation />
      {children}
      <RecipesTabBar />
    </div>
  );
}
