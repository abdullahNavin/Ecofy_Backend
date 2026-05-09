import prisma from "../../lib/prisma";
import { paginate } from "../../common/utils/helpers";
import { IdeaStatus, Prisma } from "@prisma/client";
import { cosineSimilarity, ensureApprovedIdeaEmbeddings } from "../ai/ai.service";

const ideaSearchSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  isPaid: true,
  upvoteCount: true,
  downvoteCount: true,
  commentCount: true,
  createdAt: true,
  author: { select: { id: true, name: true } },
  category: { select: { id: true, name: true, slug: true } },
  embedding: { select: { embedding: true } },
} satisfies Prisma.IdeaSelect;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export async function searchIdeas(
  q: string,
  page: number,
  limit: number,
  category?: string,
  queryEmbedding?: number[]
) {
  const skip = (page - 1) * limit;
  await ensureApprovedIdeaEmbeddings();

  // Use PostgreSQL full-text search via raw query
  const where: Prisma.IdeaWhereInput = {
    status: IdeaStatus.APPROVED,
    ...(category && { category: { slug: category } }),
  };

  // Full-text search using Prisma raw for tsvector
  const searchResults = await prisma.$queryRaw<
    { id: string; rank: number }[]
  >`
    SELECT id, ts_rank(
      to_tsvector('english', title || ' ' || description),
      plainto_tsquery('english', ${q})
    ) AS rank
    FROM ideas
    WHERE
      status = 'APPROVED'
      AND to_tsvector('english', title || ' ' || description) @@ plainto_tsquery('english', ${q})
    ORDER BY rank DESC
    LIMIT ${limit} OFFSET ${skip}
  `;

  const countResult = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM ideas
    WHERE status = 'APPROVED'
      AND to_tsvector('english', title || ' ' || description) @@ plainto_tsquery('english', ${q})
  `;

  const ids = searchResults.map((r) => r.id);
  const total = Number(countResult[0]?.count ?? 0);

  if (ids.length === 0) {
    return { ideas: [], meta: paginate(total, page, limit) };
  }

  const ideas = await prisma.idea.findMany({
    where: { id: { in: ids }, ...where },
    select: ideaSearchSelect,
  });

  // Re-sort by search rank order
  const idOrder = new Map(ids.map((id, i) => [id, i]));
  ideas.sort((a, b) => {
    if (!queryEmbedding) {
      return (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0);
    }
    const lexicalA = clamp01(1 - ((idOrder.get(a.id) ?? 999) / Math.max(ids.length, 1)));
    const lexicalB = clamp01(1 - ((idOrder.get(b.id) ?? 999) / Math.max(ids.length, 1)));
    const semanticA = cosineSimilarity((a.embedding?.embedding as number[] | undefined) ?? [], queryEmbedding);
    const semanticB = cosineSimilarity((b.embedding?.embedding as number[] | undefined) ?? [], queryEmbedding);
    return (lexicalB * 0.55 + semanticB * 0.45) - (lexicalA * 0.55 + semanticA * 0.45);
  });

  return {
    ideas: ideas.map(({ embedding, ...idea }) => idea),
    meta: paginate(total, page, limit),
  };
}

export async function recommendIdeasForUser(userId: string, limit = 6) {
  await ensureApprovedIdeaEmbeddings();

  const interactions = await prisma.ideaEvent.findMany({
    where: {
      userId,
      type: { in: ["VIEW", "VOTE_UP", "VOTE_DOWN", "COMMENT", "PURCHASE"] },
      idea: { status: IdeaStatus.APPROVED },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: {
      idea: {
        select: {
          id: true,
          embedding: { select: { embedding: true } },
        },
      },
    },
  });

  if (!interactions.length) {
    return prisma.idea.findMany({
      where: { status: IdeaStatus.APPROVED },
      orderBy: [{ upvoteCount: "desc" }, { commentCount: "desc" }],
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        isPaid: true,
        upvoteCount: true,
        downvoteCount: true,
        commentCount: true,
        createdAt: true,
        author: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  const scoredVectors = interactions
    .map((interaction) => {
      const vector = interaction.idea.embedding?.embedding as number[] | undefined;
      if (!vector?.length) return null;
      const weight =
        interaction.type === "PURCHASE" ? 3 :
        interaction.type === "COMMENT" ? 2 :
        interaction.type === "VOTE_UP" ? 2 :
        interaction.type === "VIEW" ? 1 :
        0.5;
      return { vector, weight };
    })
    .filter((item): item is { vector: number[]; weight: number } => Boolean(item));

  if (!scoredVectors.length) {
    return [];
  }

  const dimensions = scoredVectors[0]!.vector.length;
  const profile = new Array<number>(dimensions).fill(0);
  let totalWeight = 0;

  for (const item of scoredVectors) {
    totalWeight += item.weight;
    for (let i = 0; i < dimensions; i += 1) {
      profile[i] += item.vector[i]! * item.weight;
    }
  }

  for (let i = 0; i < profile.length; i += 1) {
    profile[i] = profile[i]! / totalWeight;
  }

  const seenIdeaIds = new Set(interactions.map((interaction) => interaction.idea.id));

  const candidates = await prisma.idea.findMany({
    where: {
      status: IdeaStatus.APPROVED,
      id: { notIn: [...seenIdeaIds] },
    },
    take: 60,
    select: ideaSearchSelect,
  });

  return candidates
    .map((idea) => ({
      score: cosineSimilarity((idea.embedding?.embedding as number[] | undefined) ?? [], profile),
      idea,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ idea }) => {
      const { embedding, ...rest } = idea;
      return rest;
    });
}
