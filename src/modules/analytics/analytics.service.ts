import prisma from "../../lib/prisma";
import { Prisma } from "@prisma/client";

export async function recordIdeaEvent(
  ideaId: string,
  type: string,
  userId?: string,
  metadata?: Record<string, unknown>
) {
  return prisma.ideaEvent.create({
    data: {
      ideaId,
      userId,
      type,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function getCreatorAnalytics(userId: string) {
  const ideas = await prisma.idea.findMany({
    where: { authorId: userId },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      isPaid: true,
      upvoteCount: true,
      downvoteCount: true,
      commentCount: true,
      createdAt: true,
      _count: {
        select: {
          events: true,
          purchases: true,
        },
      },
      events: {
        where: { type: "VIEW" },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      purchases: {
        where: { status: "completed" },
        select: { amount: true, currency: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = ideas.map((idea) => {
    const revenue = idea.purchases.reduce(
      (sum, purchase) => sum + Number(purchase.amount),
      0
    );
    return {
      id: idea.id,
      title: idea.title,
      slug: idea.slug,
      status: idea.status,
      isPaid: idea.isPaid,
      netVotes: idea.upvoteCount - idea.downvoteCount,
      upvoteCount: idea.upvoteCount,
      downvoteCount: idea.downvoteCount,
      commentCount: idea.commentCount,
      viewCount: idea._count.events,
      purchaseCount: idea.purchases.length,
      revenue,
      currency: idea.purchases[0]?.currency ?? "usd",
      lastViewedAt: idea.events[0]?.createdAt ?? null,
      createdAt: idea.createdAt,
    };
  });

  return {
    stats: {
      totalIdeas: data.length,
      totalViews: data.reduce((sum, idea) => sum + idea.viewCount, 0),
      totalPurchases: data.reduce((sum, idea) => sum + idea.purchaseCount, 0),
      totalRevenue: data.reduce((sum, idea) => sum + idea.revenue, 0),
    },
    ideas: data,
  };
}
