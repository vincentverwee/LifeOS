"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseDateKey } from "@/lib/format";
import { getTodayKey } from "@/lib/today";
import { MEAL_TYPES } from "@/lib/recipes/types";
import type { RecipeResult } from "./recipes";

export type MyRecipeFormState = { ok: false; error: string } | null;

function revalidate() {
  revalidatePath("/");
  revalidatePath("/recipes", "layout");
}

/** One entry per non-empty line, bounded. */
const lines = (raw: FormDataEntryValue | null, maxItems: number, maxLength: number): string[] =>
  String(raw ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);

const text = (raw: FormDataEntryValue | null, max: number): string | null => String(raw ?? "").trim().slice(0, max) || null;

function wholeNumber(raw: FormDataEntryValue | null, max: number): number | null | "invalid" {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n <= max ? n : "invalid";
}

function readFields(formData: FormData) {
  const title = text(formData.get("title"), 200);
  if (!title) return "Give it a name.";
  const readyInMinutes = wholeNumber(formData.get("readyInMinutes"), 1440);
  if (readyInMinutes === "invalid") return "Time should be a whole number of minutes.";
  const servings = wholeNumber(formData.get("servings"), 100);
  if (servings === "invalid") return "Servings should be a whole number.";
  const mealType = MEAL_TYPES.find((t) => t === formData.get("mealType")) ?? null;
  const sourceUrl = text(formData.get("sourceUrl"), 1000);
  if (sourceUrl && !/^https?:\/\//.test(sourceUrl)) return "The link should start with https://.";
  return {
    title,
    readyInMinutes,
    servings,
    mealType,
    ingredients: lines(formData.get("ingredients"), 100, 300),
    steps: lines(formData.get("steps"), 100, 2000),
    notes: text(formData.get("notes"), 5000),
    sourceUrl,
  };
}

export async function createMyRecipe(_prev: MyRecipeFormState, formData: FormData): Promise<MyRecipeFormState> {
  await requireAuth();
  const fields = readFields(formData);
  if (typeof fields === "string") return { ok: false, error: fields };
  const { id } = await prisma.myRecipe.create({ data: fields, select: { id: true } });
  revalidate();
  redirect(`/recipes/mine/${id}`);
}

export async function updateMyRecipe(_prev: MyRecipeFormState, formData: FormData): Promise<MyRecipeFormState> {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const fields = readFields(formData);
  if (typeof fields === "string") return { ok: false, error: fields };
  const { count } = await prisma.myRecipe.updateMany({ where: { id }, data: fields });
  if (count === 0) return { ok: false, error: "That recipe doesn't exist anymore." };
  revalidate();
  redirect(`/recipes/mine/${id}`);
}

/** Sets the day it was last made, or clears it (`null`). */
export async function markMyRecipeMade(id: string, date: string | null): Promise<RecipeResult> {
  await requireAuth();
  if (date !== null) {
    if (!parseDateKey(date)) return { ok: false, error: "Pick a date." };
    if (date > (await getTodayKey())) return { ok: false, error: "That date is in the future." };
  }
  const { count } = await prisma.myRecipe.updateMany({
    where: { id },
    data: { lastMadeOn: date ? new Date(`${date}T00:00:00Z`) : null },
  });
  if (count === 0) return { ok: false, error: "That recipe doesn't exist anymore." };
  revalidate();
  return { ok: true };
}

/** Deletes and goes back to the Cookbook in the same response (no 404 flash). */
export async function deleteMyRecipe(id: string): Promise<RecipeResult> {
  await requireAuth();
  const { count } = await prisma.myRecipe.deleteMany({ where: { id } });
  if (count === 0) return { ok: false, error: "That recipe doesn't exist anymore." };
  revalidate();
  redirect("/recipes");
}
