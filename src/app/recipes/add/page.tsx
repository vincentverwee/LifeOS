import { MyRecipeForm } from "@/components/recipes/MyRecipeForm";

export default function AddRecipePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Add a recipe</h1>
        <p className="mt-1 text-sm text-ink-muted">One of your own. It goes in the Cookbook.</p>
      </div>
      <MyRecipeForm />
    </div>
  );
}
