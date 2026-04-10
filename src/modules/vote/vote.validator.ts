import { z } from "zod";
import { VoteType } from "@prisma/client";

export const castVoteSchema = z.object({
  type: z.nativeEnum(VoteType),
});
