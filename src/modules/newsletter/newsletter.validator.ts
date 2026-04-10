import { z } from "zod";

export const subscribeSchema = z.object({
  email: z.string().email(),
});

export const unsubscribeSchema = z.object({
  email: z.string().email(),
});
