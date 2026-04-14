import prisma from "../../lib/prisma";
import { auth } from "../../auth/betterAuth";
import bcrypt from "bcryptjs";
import { AppError } from "../../common/middleware/errorHandler";
import { z } from "zod";
import {
  signupSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "./auth.validator";

export async function signupUser(data: z.infer<typeof signupSchema>) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) throw new AppError("Email already in use", 409);

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  return user;
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError("Invalid credentials", 401);
  if (!user.isActive) throw new AppError("Account is deactivated", 403);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError("Invalid credentials", 401);

  return user;
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
    },
  });
  if (!user) throw new AppError("User not found", 404);
  return user;
}

export async function updateProfile(
  userId: string,
  data: z.infer<typeof updateProfileSchema>
) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, name: true, avatarUrl: true },
  });
}

export async function changePassword(
  userId: string,
  data: z.infer<typeof changePasswordSchema>
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!valid) throw new AppError("Current password is incorrect", 400);

  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function getDashboardSummary(userId: string) {
  const [myIdeas, recentComments, recentVotes, commentsOnIdeasCount] = await Promise.all([
    prisma.idea.findMany({
      where: { authorId: userId },
      select: {
        id: true,
        title: true,
        upvoteCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.comment.findMany({
      where: {
        idea: { authorId: userId },
      },
      select: {
        id: true,
        createdAt: true,
        author: {
          select: { id: true, name: true },
        },
        idea: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.vote.findMany({
      where: {
        idea: { authorId: userId },
      },
      select: {
        id: true,
        type: true,
        createdAt: true,
        user: {
          select: { id: true, name: true },
        },
        idea: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.comment.count({
      where: {
        idea: { authorId: userId },
      },
    }),
  ]);

  const totalUpvotesReceived = myIdeas.reduce((sum, idea) => sum + idea.upvoteCount, 0);

  const recentActivity = [
    ...recentVotes.map((vote) => ({
      id: vote.id,
      type: "vote" as const,
      createdAt: vote.createdAt,
      actorName: vote.user.name,
      ideaId: vote.idea.id,
      ideaTitle: vote.idea.title,
      meta: vote.type,
    })),
    ...recentComments.map((comment) => ({
      id: comment.id,
      type: "comment" as const,
      createdAt: comment.createdAt,
      actorName: comment.author.name,
      ideaId: comment.idea.id,
      ideaTitle: comment.idea.title,
      meta: null,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  return {
    stats: {
      myIdeas: myIdeas.length,
      totalUpvotesReceived,
      commentsOnIdeas: commentsOnIdeasCount,
    },
    recentActivity,
  };
}

export { auth };
