import { z } from "zod";

export const createIdeaSchema = z.object({
  title: z.string().min(5).max(200),
  categoryId: z.string().min(1),
  problemStatement: z.string().min(20),
  proposedSolution: z.string().min(20),
  description: z.string().min(20),
  images: z.array(z.string().url()).default([]),
  isPaid: z.boolean().default(false),
  price: z.number().positive().optional(),
});

export const updateIdeaSchema = createIdeaSchema.partial();

export const listIdeasQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(20).default(10),
  sort: z.enum(["recent", "top_voted", "most_commented"]).default("recent"),
  category: z.string().optional(),
  paid: z
    .string()
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  minVotes: z.coerce.number().int().optional(),
  author: z.string().optional(),
  q: z.string().optional(),
});

export const rejectIdeaSchema = z.object({
  feedback: z.string().min(10),
});
