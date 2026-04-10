import prisma from "../../lib/prisma";
import { AppError } from "../../common/middleware/errorHandler";

export async function subscribe(email: string, userId?: string) {
  const existing = await prisma.newsletter.findUnique({ where: { email } });
  if (existing) throw new AppError("Email already subscribed", 409);

  return prisma.newsletter.create({
    data: { email, userId: userId ?? null },
    select: { id: true, email: true, createdAt: true },
  });
}

export async function unsubscribe(email: string) {
  const existing = await prisma.newsletter.findUnique({ where: { email } });
  if (!existing) throw new AppError("Email not found in subscribers", 404);
  await prisma.newsletter.delete({ where: { email } });
}
