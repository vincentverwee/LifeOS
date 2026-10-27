import Link from "next/link";
import { notFound } from "next/navigation";
import { getMyRecipe } from "@/lib/data/recipes";
import { MyRecipeForm } from "@/components/recipes/MyRecipeForm";

export default async function EditMyRecipePage({ params }: PageProps<"/recipes/mine/[id]/edit">) {
  const { id } = await params;
  const recipe = await getMyRecipe(id);
  if (!recipe) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        href={`/recipes/mine/${recipe.id}`}
        className="btn -mx-3 -mb-2 inline-flex min-h-11 self-start px-3 text-sm text-ink-muted hover:bg-surface-muted hover:text-foreground active:bg-surface-muted"
      >
        ‹ {recipe.title}
      </Link>
      <h1 className="text-2xl font-semibold text-foreground">Edit recipe</h1>
      <MyRecipeForm recipe={recipe} />
    </div>
  );
}
