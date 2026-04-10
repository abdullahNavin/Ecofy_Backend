import { z } from "zod";

export const checkoutSchema = z.object({
  ideaId: z.string().min(1),
});
