import prisma from "../../lib/prisma";
import { AppError } from "../../common/middleware/errorHandler";
import { VoteType } from "@prisma/client";
import { recordIdeaEvent } from "../analytics/analytics.service";

export async function castVote(
  userId: string,
  ideaId: string,
  type: VoteType
) {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) throw new AppError("Idea not found", 404);

  const existingVote = await prisma.vote.findUnique({
    where: { userId_ideaId: { userId, ideaId } },
  });

  if (existingVote) {
    if (existingVote.type === type) {
      throw new AppError("You already voted this way", 409);
    }
    // Switch vote
    await prisma.$transaction([
      prisma.vote.update({
        where: { userId_ideaId: { userId, ideaId } },
        data: { type },
      }),
      prisma.idea.update({
        where: { id: ideaId },
        data:
          type === VoteType.UPVOTE
            ? { upvoteCount: { increment: 1 }, downvoteCount: { decrement: 1 } }
            : { downvoteCount: { increment: 1 }, upvoteCount: { decrement: 1 } },
      }),
    ]);
  } else {
    // New vote
    await prisma.$transaction([
      prisma.vote.create({ data: { userId, ideaId, type } }),
      prisma.idea.update({
        where: { id: ideaId },
        data:
          type === VoteType.UPVOTE
            ? { upvoteCount: { increment: 1 } }
            : { downvoteCount: { increment: 1 } },
      }),
    ]);
  }

  await recordIdeaEvent(
    ideaId,
    type === VoteType.UPVOTE ? "VOTE_UP" : "VOTE_DOWN",
    userId
  ).catch(() => undefined);

  return prisma.idea.findUnique({
    where: { id: ideaId },
    select: { upvoteCount: true, downvoteCount: true },
  });
}

export async function removeVote(userId: string, ideaId: string) {
  const vote = await prisma.vote.findUnique({
    where: { userId_ideaId: { userId, ideaId } },
  });
  if (!vote) throw new AppError("No vote found", 404);

  await prisma.$transaction([
    prisma.vote.delete({ where: { userId_ideaId: { userId, ideaId } } }),
    prisma.idea.update({
      where: { id: ideaId },
      data:
        vote.type === VoteType.UPVOTE
          ? { upvoteCount: { decrement: 1 } }
          : { downvoteCount: { decrement: 1 } },
    }),
  ]);
}
