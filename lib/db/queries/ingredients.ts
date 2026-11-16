import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  ingredients,
  userIngredientDefaults,
  type Ingredient,
} from "@/lib/db/schema";

export async function getActiveIngredients(): Promise<Ingredient[]> {
  return db
    .select()
    .from(ingredients)
    .where(eq(ingredients.isActive, true))
    .orderBy(ingredients.name);
}

export async function addIngredient(name: string, packageSize: number): Promise<string> {
  const [row] = await db
    .insert(ingredients)
    .values({ name, packageSize })
    .returning({ id: ingredients.id });
  return row.id;
}

export async function deactivateIngredient(id: string) {
  await db.update(ingredients).set({ isActive: false }).where(eq(ingredients.id, id));
}

export async function getUserDefaultIngredientIds(userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ ingredientId: userIngredientDefaults.ingredientId })
    .from(userIngredientDefaults)
    .where(eq(userIngredientDefaults.userId, userId));
  return new Set(rows.map((r) => r.ingredientId));
}

export async function setUserDefaultIngredient(
  userId: string,
  ingredientId: string,
  isDefault: boolean,
) {
  if (isDefault) {
    await db
      .insert(userIngredientDefaults)
      .values({ userId, ingredientId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(userIngredientDefaults)
      .where(
        and(
          eq(userIngredientDefaults.userId, userId),
          eq(userIngredientDefaults.ingredientId, ingredientId),
        ),
      );
  }
}
