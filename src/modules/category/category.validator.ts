import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
});
