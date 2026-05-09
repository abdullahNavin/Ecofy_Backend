import { Request, Response, NextFunction } from "express";
import * as analyticsService from "./analytics.service";

export async function creatorAnalytics(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await analyticsService.getCreatorAnalytics(req.user!.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
