import { Request, Response, NextFunction } from "express";
import * as newsletterService from "./newsletter.service";
import { validate } from "../../common/middleware/validate.middleware";
import { subscribeSchema, unsubscribeSchema } from "./newsletter.validator";

export const subscribe = [
  validate(subscribeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await newsletterService.subscribe(
        req.body.email,
        req.user?.id
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },
];

export const unsubscribe = [
  validate(unsubscribeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await newsletterService.unsubscribe(req.body.email);
      res.json({ success: true, data: { message: "Unsubscribed successfully" } });
    } catch (err) {
      next(err);
    }
  },
];
