import { Request, Response, NextFunction } from "express";
import * as aiService from "./ai.service";
import { validate } from "../../common/middleware/validate.middleware";
import { ideaAssistantSchema } from "./ai.validator";

export const ideaAssistant = [
  validate(ideaAssistantSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await aiService.getIdeaAssistantSuggestion(req.user!.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
];
