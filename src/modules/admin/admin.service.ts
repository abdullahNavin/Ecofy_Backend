import prisma from "../../lib/prisma";
import { AppError } from "../../common/middleware/errorHandler";
import { IdeaStatus, Role } from "@prisma/client";
import { paginate } from "../../common/utils/helpers";
import { createNotification } from "../notification/notification.service";
import { ensureIdeaEmbeddingForIdea } from "../ai/ai.service";

export async function adminListIdeas(
  page: number,
  limit: number,
  status?: string,
  q?: string,
  category?: string
) {
  const skip = (page - 1) * limit;
  const where = {
    ...(status ? { status: status as IdeaStatus } : {}),
    ...(category ? { category: { slug: category } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { author: { name: { contains: q, mode: "insensitive" as const } } },
            { author: { email: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [ideas, total] = await Promise.all([
    prisma.idea.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        isPaid: true,
        createdAt: true,
        author: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
        upvoteCount: true,
        downvoteCount: true,
      },
    }),
    prisma.idea.count({ where }),
  ]);

  return { ideas, meta: paginate(total, page, limit) };
}

async function createModerationAudit(
  ideaId: string,
  adminId: string,
  action: string,
  fromStatus?: IdeaStatus,
  toStatus?: IdeaStatus,
  note?: string
) {
  return prisma.moderationAuditLog.create({
    data: { ideaId, adminId, action, fromStatus, toStatus, note },
  });
}

export async function approveIdea(ideaId: string, adminId: string) {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) throw new AppError("Idea not found", 404);
  if (idea.status !== IdeaStatus.UNDER_REVIEW) {
    throw new AppError("Idea must be UNDER_REVIEW to approve", 422);
  }
  const updated = await prisma.idea.update({
    where: { id: ideaId },
    data: { status: IdeaStatus.APPROVED, rejectionFeedback: null },
  });
  await Promise.all([
    createModerationAudit(ideaId, adminId, "APPROVE_IDEA", idea.status, IdeaStatus.APPROVED),
    createNotification({
      userId: idea.authorId,
      type: "IDEA_APPROVED",
      title: "Your idea was approved",
      body: `"${idea.title}" is now live on Ecofy.`,
      href: `/ideas/${idea.id}`,
    }),
  ]);
  await ensureIdeaEmbeddingForIdea(ideaId).catch(() => undefined);
  return updated;
}

export async function rejectIdea(ideaId: string, feedback: string, adminId: string) {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) throw new AppError("Idea not found", 404);
  if (idea.status !== IdeaStatus.UNDER_REVIEW) {
    throw new AppError("Idea must be UNDER_REVIEW to reject", 422);
  }
  const updated = await prisma.idea.update({
    where: { id: ideaId },
    data: { status: IdeaStatus.REJECTED, rejectionFeedback: feedback },
  });
  await Promise.all([
    createModerationAudit(ideaId, adminId, "REJECT_IDEA", idea.status, IdeaStatus.REJECTED, feedback),
    createNotification({
      userId: idea.authorId,
      type: "IDEA_REJECTED",
      title: "Your idea needs revisions",
      body: feedback,
      href: `/dashboard/member/ideas`,
    }),
  ]);
  return updated;
}

export async function updateIdeaStatus(
  ideaId: string,
  status: "UNDER_REVIEW" | "APPROVED" | "REJECTED",
  feedback: string | undefined,
  adminId: string
) {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) throw new AppError("Idea not found", 404);

  if (status === "REJECTED" && (!feedback || feedback.trim().length < 10)) {
    throw new AppError("Rejection feedback must be at least 10 characters", 422);
  }

  const updated = await prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: status as IdeaStatus,
      rejectionFeedback: status === "REJECTED" ? feedback!.trim() : null,
    },
    select: {
      id: true,
      title: true,
      status: true,
      isPaid: true,
      createdAt: true,
      author: { select: { id: true, name: true, email: true } },
      category: { select: { id: true, name: true } },
      upvoteCount: true,
      downvoteCount: true,
    },
  });
  await Promise.all([
    createModerationAudit(
      ideaId,
      adminId,
      `SET_STATUS_${status}`,
      idea.status,
      status as IdeaStatus,
      status === "REJECTED" ? feedback!.trim() : undefined
    ),
    status === "APPROVED"
      ? createNotification({
          userId: idea.authorId,
          type: "IDEA_APPROVED",
          title: "Your idea was approved",
          body: `"${idea.title}" is now live on Ecofy.`,
          href: `/ideas/${idea.id}`,
        })
      : status === "REJECTED"
        ? createNotification({
            userId: idea.authorId,
            type: "IDEA_REJECTED",
            title: "Your idea needs revisions",
            body: feedback!.trim(),
            href: `/dashboard/member/ideas`,
          })
        : createNotification({
            userId: idea.authorId,
            type: "IDEA_UNDER_REVIEW",
            title: "Your idea is under review",
            body: `"${idea.title}" is back in the moderation queue.`,
            href: `/dashboard/member/ideas`,
          }),
  ]);
  if (status === "APPROVED") {
    await ensureIdeaEmbeddingForIdea(ideaId).catch(() => undefined);
  }
  return updated;
}

export async function adminDeleteIdea(ideaId: string, adminId: string) {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) throw new AppError("Idea not found", 404);
  await createModerationAudit(ideaId, adminId, "DELETE_IDEA", idea.status, undefined);
  await prisma.idea.delete({ where: { id: ideaId } });
}

export async function adminListUsers(page: number, limit: number, q?: string, role?: string) {
  const skip = (page - 1) * limit;
  const where = {
    ...(role ? { role: role as Role } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);
  return { users, meta: paginate(total, page, limit) };
}

export async function activateUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);
  return prisma.user.update({
    where: { id: userId },
    data: { isActive: true },
    select: { id: true, name: true, email: true, isActive: true },
  });
}

export async function deactivateUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);
  return prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
    select: { id: true, name: true, email: true, isActive: true },
  });
}

export async function changeUserRole(userId: string, role: string) {
  if (!Object.values(Role).includes(role as Role)) {
    throw new AppError("Invalid role", 400);
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);
  return prisma.user.update({
    where: { id: userId },
    data: { role: role as Role },
    select: { id: true, name: true, email: true, role: true },
  });
}

export async function getAdminOverview() {
  const [totalUsers, pendingIdeas, approvedIdeas, premiumIdeas] = await Promise.all([
    prisma.user.count(),
    prisma.idea.count({ where: { status: IdeaStatus.UNDER_REVIEW } }),
    prisma.idea.count({ where: { status: IdeaStatus.APPROVED } }),
    prisma.idea.count({ where: { isPaid: true } }),
  ]);

  return { totalUsers, pendingIdeas, approvedIdeas, premiumIdeas };
}

export async function listAuditLogs(page: number, limit: number, ideaId?: string) {
  const skip = (page - 1) * limit;
  const where = ideaId ? { ideaId } : {};
  const [logs, total] = await Promise.all([
    prisma.moderationAuditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        admin: { select: { id: true, name: true, email: true } },
        idea: { select: { id: true, title: true } },
      },
    }),
    prisma.moderationAuditLog.count({ where }),
  ]);
  return { logs, meta: paginate(total, page, limit) };
}
