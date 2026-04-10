import { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";
import prisma from "../../lib/prisma";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Manually parse cookies since we aren't using cookie-parser
    const cookieHeader = req.headers.cookie || "";
    const sessionTokenMatch = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
    const token = sessionTokenMatch ? sessionTokenMatch[1] : null;

    if (!token) {
      return next(new AppError("Unauthorized - No session token", 401));
    }

    // Lookup token manually since BetterAuth's internal getSession expects tokens to be hashed
    const dbSession = await prisma.session.findFirst({
      where: { token }, // matches the raw hex token we inserted
    });

    if (!dbSession || new Date() > dbSession.expiresAt) {
      return next(new AppError("Unauthorized - Invalid or expired session", 401));
    }

    // Load full user from DB to get role/isActive
    const user = await prisma.user.findUnique({
      where: { id: dbSession.userId },
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
