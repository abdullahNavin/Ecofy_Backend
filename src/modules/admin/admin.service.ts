import prisma from "../../lib/prisma";
import { AppError } from "../../common/middleware/errorHandler";
import { IdeaStatus, Role } from "@prisma/client";
import { paginate } from "../../common/utils/helpers";

export async function adminListIdeas(
  page: number,
  limit: number,
  status?: string
) {
  const skip = (page - 1) * limit;
  const where = status ? { status: status as IdeaStatus } : {};

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

export async function approveIdea(ideaId: string) {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) throw new AppError("Idea not found", 404);
  if (idea.status !== IdeaStatus.UNDER_REVIEW) {
    throw new AppError("Idea must be UNDER_REVIEW to approve", 422);
  }
  return prisma.idea.update({
    where: { id: ideaId },
    data: { status: IdeaStatus.APPROVED, rejectionFeedback: null },
  });
}

export async function rejectIdea(ideaId: string, feedback: string) {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) throw new AppError("Idea not found", 404);
  if (idea.status !== IdeaStatus.UNDER_REVIEW) {
    throw new AppError("Idea must be UNDER_REVIEW to reject", 422);
  }
  return prisma.idea.update({
    where: { id: ideaId },
    data: { status: IdeaStatus.REJECTED, rejectionFeedback: feedback },
  });
}

export async function adminDeleteIdea(ideaId: string) {
  const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
  if (!idea) throw new AppError("Idea not found", 404);
  await prisma.idea.delete({ where: { id: ideaId } });
}

export async function adminListUsers(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    prisma.user.findMany({
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
    prisma.user.count(),
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
