import { Request, Response, NextFunction } from "express";
import * as adminService from "./admin.service";
import { validate, validateQuery } from "../../common/middleware/validate.middleware";
import { z } from "zod";
import { rejectIdeaSchema } from "../idea/idea.validator";

const pageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  status: z.string().optional(),
});

export const listIdeas = [
  validateQuery(pageQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query["page"]) || 1;
      const limit = Number(req.query["limit"]) || 20;
      const status = req.query["status"] ? String(req.query["status"]) : undefined;
      const result = await adminService.adminListIdeas(page, limit, status);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },
];

export const approveIdea = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = String(req.params["id"]);
    const data = await adminService.approveIdea(id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const rejectIdea = [
  validate(rejectIdeaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params["id"]);
      const data = await adminService.rejectIdea(id, req.body.feedback);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
];

export const deleteIdea = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = String(req.params["id"]);
    await adminService.adminDeleteIdea(id);
    res.json({ success: true, data: { message: "Idea deleted" } });
  } catch (err) {
    next(err);
  }
};

export const listUsers = [
  validateQuery(pageQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query["page"]) || 1;
      const limit = Number(req.query["limit"]) || 20;
      const result = await adminService.adminListUsers(page, limit);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },
];

export const activateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = String(req.params["id"]);
    const data = await adminService.activateUser(id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const deactivateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = String(req.params["id"]);
    const data = await adminService.deactivateUser(id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const changeUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = String(req.params["id"]);
    const data = await adminService.changeUserRole(id, req.body.role);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
