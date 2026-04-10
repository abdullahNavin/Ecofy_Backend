import { Request, Response, NextFunction } from "express";
import * as ideaService from "./idea.service";
import { validate, validateQuery } from "../../common/middleware/validate.middleware";
import {
  createIdeaSchema,
  updateIdeaSchema,
  listIdeasQuerySchema,
} from "./idea.validator";

export const listIdeas = [
  validateQuery(listIdeasQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await ideaService.listApprovedIdeas(
        req.query as any,
        req.user?.id
      );
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },
];

export const getIdea = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = String(req.params["id"]);
    const idea = await ideaService.getIdeaById(id, req.user?.id);
    res.json({ success: true, data: idea });
  } catch (err) {
    next(err);
  }
};

export const createIdea = [
  validate(createIdeaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idea = await ideaService.createIdea(req.user!.id, req.body);
      res.status(201).json({ success: true, data: idea });
    } catch (err) {
      next(err);
    }
  },
];

export const updateIdea = [
  validate(updateIdeaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params["id"]);
      const idea = await ideaService.updateIdea(id, req.user!.id, req.body);
      res.json({ success: true, data: idea });
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
    await ideaService.deleteIdea(id, req.user!.id);
    res.json({ success: true, data: { message: "Idea deleted" } });
  } catch (err) {
    next(err);
  }
};

export const submitIdea = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = String(req.params["id"]);
    const idea = await ideaService.submitIdea(id, req.user!.id);
    res.json({ success: true, data: idea });
  } catch (err) {
    next(err);
  }
};
