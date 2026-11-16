import { z } from "zod";

export const createAliEventSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.string().min(1, "Type is required").max(50),
});

export const addIngredientSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  packageSize: z.coerce.number().int().min(1, "Must be at least 1"),
});

export const addIngredientWithQuantitySchema = addIngredientSchema.extend({
  quantity: z.coerce.number().int().min(1, "Must be at least 1"),
});
