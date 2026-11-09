import { PageHeader } from "@/components/ui/PageHeader";
import { MyRecipeForm } from "@/components/recipes/MyRecipeForm";

export default function AddRecipePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title="Add a recipe" subtitle="One of your own. It goes in the Cookbook." back={{ href: "/recipes", label: "Recipes" }} />
      <MyRecipeForm />
    </div>
  );
}
