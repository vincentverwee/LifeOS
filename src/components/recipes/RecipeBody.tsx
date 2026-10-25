import type { RecipeIngredient } from "@/lib/recipes/types";

/** Ingredients + numbered steps, shared by the deck's info sheet and the detail page. */
export function RecipeBody({ ingredients, steps }: { ingredients: RecipeIngredient[]; steps: string[] }) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="text-sm font-semibold tracking-wide text-ink-muted uppercase">Ingredients</h3>
        <ul className="mt-2 flex flex-col divide-y divide-border">
          {ingredients.map((ingredient, i) => (
            <li key={i} className="py-2 text-foreground">
              {ingredient.original}
            </li>
          ))}
        </ul>
      </section>
      {steps.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold tracking-wide text-ink-muted uppercase">Steps</h3>
          <ol className="mt-3 flex flex-col gap-4">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted font-mono text-sm font-semibold text-primary">
                  {i + 1}
                </span>
                <p className="pt-0.5 leading-relaxed text-foreground">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

export function RecipeMeta({
  readyInMinutes,
  servings,
  className = "",
}: {
  readyInMinutes: number | null;
  servings: number | null;
  className?: string;
}) {
  return (
    <p className={`flex gap-4 text-sm text-ink-muted ${className}`}>
      {readyInMinutes !== null && <span>⏱ {readyInMinutes} min</span>}
      {servings !== null && (
        <span>
          🍽 {servings} {servings === 1 ? "serving" : "servings"}
        </span>
      )}
    </p>
  );
}
