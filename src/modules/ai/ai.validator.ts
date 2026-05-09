import { z } from "zod";

export const ideaAssistantSchema = z.object({
  title: z.string().optional(),
  categoryId: z.string().optional(),
  problemStatement: z.string().optional(),
  proposedSolution: z.string().optional(),
  description: z.string().optional(),
  isPaid: z.boolean().optional(),
  price: z.number().nonnegative().optional(),
  images: z.array(z.string()).optional(),
  prompt: z.string().max(500).optional(),
  ideaId: z.string().optional(),
});
