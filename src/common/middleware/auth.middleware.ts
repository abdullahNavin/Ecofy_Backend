import { auth } from "../../auth/betterAuth";
import { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";
import prisma from "../../lib/prisma";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(req.headers as Record<string, string>),
    });

    if (!session?.user) {
      return next(new AppError("Unauthorized", 401));
    }

    // Load full user from DB to get role/isActive
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return next(new AppError("Account is deactivated", 403));
    }

    req.user = user;
    next();
  } catch {
    next(new AppError("Unauthorized", 401));
  }
}
