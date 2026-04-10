import { Request, Response, NextFunction } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../../auth/betterAuth";
import * as authService from "./auth.service";
import { validate } from "../../common/middleware/validate.middleware";
import {
  signupSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "./auth.validator";

// BetterAuth handler (handles /signup, /login, /logout via BetterAuth internally)
export const betterAuthHandler = toNodeHandler(auth);

// POST /api/v1/auth/signup
export const signup = [
  validate(signupSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.signupUser(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },
];

// POST /api/v1/auth/login  — delegates to BetterAuth, just re-signs in and returns user
export const login = [
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.loginUser(req.body.email, req.body.password);
      // Let BetterAuth create the session; we just validate credentials here and return user info
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
