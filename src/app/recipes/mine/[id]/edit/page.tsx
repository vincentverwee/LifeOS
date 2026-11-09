import { PageHeader } from "@/components/ui/PageHeader";
import { notFound } from "next/navigation";
import { getMyRecipe } from "@/lib/data/recipes";
import { MyRecipeForm } from "@/components/recipes/MyRecipeForm";

export default async function EditMyRecipePage({ params }: PageProps<"/recipes/mine/[id]/edit">) {
  const { id } = await params;
  const recipe = await getMyRecipe(id);
  if (!recipe) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title="Edit recipe" back={{ href: `/recipes/mine/${recipe.id}`, label: recipe.title }} />
      <MyRecipeForm recipe={recipe} />
    </div>
  );
}
