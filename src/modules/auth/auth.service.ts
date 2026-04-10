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

export { auth };
