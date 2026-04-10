import { Request, Response, NextFunction } from "express";
import * as commentService from "./comment.service";
import { validate } from "../../common/middleware/validate.middleware";
import { createCommentSchema } from "./comment.validator";

export const getComments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ideaId = String(req.params["ideaId"]);
    const data = await commentService.getComments(ideaId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createComment = [
  validate(createCommentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ideaId = String(req.params["ideaId"]);
      const data = await commentService.createComment(
        req.user!.id,
        ideaId,
        req.body.content
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
];

export const replyToComment = [
  validate(createCommentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ideaId = String(req.params["ideaId"]);
      const commentId = String(req.params["commentId"]);
      const data = await commentService.createComment(
        req.user!.id,
        ideaId,
        req.body.content,
        commentId
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
];

export const deleteComment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const commentId = String(req.params["commentId"]);
    await commentService.deleteComment(commentId, req.user!.id, req.user!.role);
    res.json({ success: true, data: { message: "Comment deleted" } });
  } catch (err) {
    next(err);
  }
};
