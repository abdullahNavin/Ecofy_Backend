import prisma from "../../lib/prisma";
import { AppError } from "../../common/middleware/errorHandler";
import { slugify, paginate } from "../../common/utils/helpers";
import { z } from "zod";
import {
  createIdeaSchema,
  updateIdeaSchema,
  listIdeasQuerySchema,
} from "./idea.validator";
import { IdeaStatus, Prisma } from "@prisma/client";

const ideaSelect = {
  id: true,
  title: true,
  slug: true,
  problemStatement: true,
  proposedSolution: true,
  description: true,
  images: true,
  isPaid: true,
  price: true,
  status: true,
  upvoteCount: true,
  downvoteCount: true,
  commentCount: true,
  createdAt: true,
  author: { select: { id: true, name: true, avatarUrl: true } },
  category: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.IdeaSelect;

export async function listApprovedIdeas(
  query: z.infer<typeof listIdeasQuerySchema>,
  userId?: string
) {
  const { page, limit, sort, category, paid, minVotes, author, q } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.IdeaWhereInput = {
    status: IdeaStatus.APPROVED,
    ...(category && { category: { slug: category } }),
    ...(paid !== undefined && { isPaid: paid }),
    ...(minVotes && { upvoteCount: { gte: minVotes } }),
    ...(author && { authorId: author }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const orderBy: Prisma.IdeaOrderByWithRelationInput =
    sort === "top_voted"
      ? { upvoteCount: "desc" }
      : sort === "most_commented"
        ? { commentCount: "desc" }
        : { createdAt: "desc" };

  const [ideas, total] = await Promise.all([
    prisma.idea.findMany({ where, orderBy, skip, take: limit, select: ideaSelect }),
    prisma.idea.count({ where }),
  ]);

  // Strip description/solution/problem from paid ideas if user hasn't purchased
  const safe = userId
    ? await Promise.all(
        ideas.map(async (idea) => {
          if (!idea.isPaid) return idea;
          const purchased = await prisma.purchase.findFirst({
            where: { userId, ideaId: idea.id, status: "completed" },
          });
          if (purchased) return idea;
          return { ...idea, description: null, proposedSolution: null, problemStatement: null };
        })
      )
    : ideas.map((idea) =>
        idea.isPaid
          ? { ...idea, description: null, proposedSolution: null, problemStatement: null }
          : idea
      );

  return { ideas: safe, meta: paginate(total, page, limit) };
}

export async function getIdeaById(ideaId: string, userId?: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: {
      ...ideaSelect,
      rejectionFeedback: true,
      updatedAt: true,
    },
  });
  if (!idea) throw new AppError("Idea not found", 404);

  const baseIdea = {
    ...idea,
    isPurchased: !idea.isPaid,
  };

  // Gate paid content
  if (idea.isPaid && idea.status === IdeaStatus.APPROVED) {
    if (!userId) {
      return {
        ...baseIdea,
        description: null,
        proposedSolution: null,
        problemStatement: null,
        isPurchased: false,
        _locked: true,
      };
    }
    const purchased = await prisma.purchase.findFirst({
      where: { userId, ideaId, status: "completed" },
    });
    if (!purchased) {
      return {
        ...baseIdea,
        description: null,
        proposedSolution: null,
        problemStatement: null,
        isPurchased: false,
        _locked: true,
      };
    }

    return {
      ...baseIdea,
      isPurchased: true,
      _locked: false,
    };
  }

  return {
    ...baseIdea,
    _locked: false,
  };
}

export async function createIdea(
  authorId: string,
  data: z.infer<typeof createIdeaSchema>
) {
  if (data.isPaid && !data.price) {
    throw new AppError("Price is required for paid ideas", 422);
  }

  const slug = slugify(data.title);
  // Ensure unique slug
  const existing = await prisma.idea.findUnique({ where: { slug } });
  const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

  return prisma.idea.create({
    data: {
      ...data,
      slug: finalSlug,
      authorId,
    },
    select: ideaSelect,
  });
}

export async function updateIdea(
  ideaId: string,
  userId: string,
  data: z.infer<typeof updateIdeaSchema>
) {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) throw new AppError("Idea not found", 404);
  if (idea.authorId !== userId) throw new AppError("Forbidden", 403);
  if (
    idea.status !== IdeaStatus.DRAFT &&
    idea.status !== IdeaStatus.REJECTED
  ) {
    throw new AppError("Only DRAFT or REJECTED ideas can be edited", 422);
  }

  return prisma.idea.update({
    where: { id: ideaId },
    data: {
      ...data,
      ...(data.title && { slug: slugify(data.title) }),
    },
    select: ideaSelect,
  });
}

export async function deleteIdea(ideaId: string, userId: string) {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) throw new AppError("Idea not found", 404);
  if (idea.authorId !== userId) throw new AppError("Forbidden", 403);
  if (idea.status === IdeaStatus.APPROVED) {
    throw new AppError("Cannot delete an approved idea", 422);
  }
  await prisma.idea.delete({ where: { id: ideaId } });
}

export async function submitIdea(ideaId: string, userId: string) {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) throw new AppError("Idea not found", 404);
  if (idea.authorId !== userId) throw new AppError("Forbidden", 403);
  if (idea.status !== IdeaStatus.DRAFT) {
    throw new AppError("Only DRAFT ideas can be submitted", 422);
  }
  return prisma.idea.update({
    where: { id: ideaId },
    data: { status: IdeaStatus.UNDER_REVIEW },
    select: ideaSelect,
  });
}
