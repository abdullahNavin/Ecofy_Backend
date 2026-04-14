import { Request, Response, NextFunction } from "express";
import { toNodeHandler } from "better-auth/node";
import crypto from "crypto";
import { auth } from "../../auth/betterAuth";
import * as authService from "./auth.service";
import prisma from "../../lib/prisma";
import { validate } from "../../common/middleware/validate.middleware";
import {
  signupSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "./auth.validator";

// Helper to manually tie into BetterAuth via Prisma Sessions
const setSessionCookie = async (res: Response, userId: string) => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  res.cookie("better-auth.session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: "/",
  });
};

const clearSessionCookie = (res: Response) => {
  res.clearCookie("better-auth.session_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
};

// BetterAuth handler (handles /signup, /login, /logout via BetterAuth internally)
export const betterAuthHandler = toNodeHandler(auth);

// POST /api/v1/auth/signup
export const signup = [
  validate(signupSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.signupUser(req.body);
      await setSessionCookie(res, user.id);
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },
];

// POST /api/v1/auth/login
export const login = [
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.loginUser(req.body.email, req.body.password);
      await setSessionCookie(res, user.id);
      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },
];

// POST /api/v1/auth/logout
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookieHeader = req.headers.cookie || "";
    const sessionTokenMatch = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
    const token = sessionTokenMatch ? sessionTokenMatch[1] : null;

    if (token) {
      await prisma.session.deleteMany({
        where: { token },
      });
    }

    clearSessionCookie(res);
    res.status(200).json({ success: true, data: { message: "Logged out successfully" } });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/auth/me
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await authService.getProfile(req.user!.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/auth/me
export const updateMe = [
  validate(updateProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.updateProfile(req.user!.id, req.body);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },
];

// PATCH /api/v1/auth/me/password
export const changePassword = [
  validate(changePasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.changePassword(req.user!.id, req.body);
      res.json({ success: true, data: { message: "Password changed successfully" } });
    } catch (err) {
      next(err);
    }
  },
];
