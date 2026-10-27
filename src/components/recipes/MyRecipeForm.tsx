"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createMyRecipe, updateMyRecipe, type MyRecipeFormState } from "@/lib/actions/myRecipes";
import type { MyRecipeDetail } from "@/lib/data/recipes";
import { MEAL_TYPES } from "@/lib/recipes/types";
import { SheepSpinner } from "@/components/icons/SheepSpinner";
import { Chip } from "./Chip";

const FIELD = "rounded-lg border border-border bg-surface px-3 py-2.5 text-foreground";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary flex w-full px-4 py-3 text-base font-semibold">
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <SheepSpinner size={20} />
          Saving…
        </span>
      ) : (
        label
      )}
    </button>
  );
}

/** Add (no `recipe`) or edit a Cookbook recipe. Ingredients and steps are one per line. */
export function MyRecipeForm({ recipe }: { recipe?: MyRecipeDetail }) {
  const [mealType, setMealType] = useState<string | null>(recipe?.mealType ?? null);
  const [state, formAction] = useActionState<MyRecipeFormState, FormData>(
    (prev, formData) => (recipe ? updateMyRecipe(prev, formData) : createMyRecipe(prev, formData)),
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {recipe && <input type="hidden" name="id" value={recipe.id} />}
      <input type="hidden" name="mealType" value={mealType ?? ""} />

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Name</span>
        <input
          name="title"
          type="text"
          required
          maxLength={200}
          autoComplete="off"
          enterKeyHint="next"
          defaultValue={recipe?.title}
          placeholder="e.g. Mum's lasagne"
          className={FIELD}
        />
      </label>

      <fieldset>
        <legend className="text-sm text-ink-muted">Meal (optional)</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {MEAL_TYPES.map((t) => (
            <Chip key={t} selected={mealType === t} onClick={() => setMealType(mealType === t ? null : t)}>
              {t}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-ink-muted">Minutes</span>
          <input
            name="readyInMinutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={1440}
            defaultValue={recipe?.readyInMinutes ?? ""}
            placeholder="30"
            className={FIELD}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm text-ink-muted">Servings</span>
          <input
            name="servings"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            defaultValue={recipe?.servings ?? ""}
            placeholder="2"
            className={FIELD}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Ingredients, one per line</span>
        <textarea
          name="ingredients"
          rows={6}
          defaultValue={recipe?.ingredients.join("\n")}
          placeholder={"400 g pasta\n2 tomatoes, diced\n1 clove garlic"}
          className={FIELD}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Steps, one per line</span>
        <textarea
          name="steps"
          rows={6}
          defaultValue={recipe?.steps.join("\n")}
          placeholder={"Boil the pasta.\nFry the garlic, add the tomatoes.\nMix and serve."}
          className={FIELD}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Notes (optional)</span>
        <textarea name="notes" rows={3} defaultValue={recipe?.notes ?? ""} className={FIELD} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-ink-muted">Link (optional)</span>
        <input
          name="sourceUrl"
          type="url"
          inputMode="url"
          autoComplete="off"
          defaultValue={recipe?.sourceUrl ?? ""}
          placeholder="https://…"
          className={FIELD}
        />
      </label>

      {state && !state.ok && <p className="text-sm text-critical">{state.error}</p>}

      <SubmitButton label={recipe ? "Save changes" : "Add recipe"} />
    </form>
  );
}
