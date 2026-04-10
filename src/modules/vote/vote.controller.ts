import { Request, Response, NextFunction } from "express";
import * as voteService from "./vote.service";
import { validate } from "../../common/middleware/validate.middleware";
import { castVoteSchema } from "./vote.validator";

export const castVote = [
  validate(castVoteSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ideaId = String(req.params["ideaId"]);
      const data = await voteService.castVote(req.user!.id, ideaId, req.body.type);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
];

export const removeVote = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ideaId = String(req.params["ideaId"]);
    await voteService.removeVote(req.user!.id, ideaId);
    res.json({ success: true, data: { message: "Vote removed" } });
  } catch (err) {
    next(err);
  }
};
