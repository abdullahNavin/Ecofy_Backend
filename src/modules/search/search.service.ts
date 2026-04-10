import prisma from "../../lib/prisma";
import { paginate } from "../../common/utils/helpers";
import { IdeaStatus, Prisma } from "@prisma/client";

export async function searchIdeas(
  q: string,
  page: number,
  limit: number,
  category?: string
) {
  const skip = (page - 1) * limit;

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
    select: {
      id: true,
      title: true,
      slug: true,
      isPaid: true,
      upvoteCount: true,
      downvoteCount: true,
      commentCount: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });

  // Re-sort by search rank order
  const idOrder = new Map(ids.map((id, i) => [id, i]));
  ideas.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));

  return { ideas, meta: paginate(total, page, limit) };
}
