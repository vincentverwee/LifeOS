import Link from "next/link";
import { connection } from "next/server";
import { getMyRecipes } from "@/lib/data/recipes";
import { Cookbook } from "@/components/recipes/Cookbook";

// The landing page reads only the database, so opening Recipes costs no API quota.
export default async function CookbookPage() {
  await connection();
  const recipes = await getMyRecipes();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Cookbook</h1>
      {recipes.length > 0 ? (
        <Cookbook recipes={recipes} />
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="text-ink-muted">Your own recipes go here.</p>
          <Link href="/recipes/add" className="btn btn-primary mt-4 inline-flex min-h-11 px-5 font-semibold">
            Add your first recipe
          </Link>
        </div>
      )}
    </div>
  );
}
