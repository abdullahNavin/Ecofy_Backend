import { Request, Response, NextFunction } from "express";
import * as searchService from "./search.service";
import { z } from "zod";
import { validateQuery } from "../../common/middleware/validate.middleware";

const searchQuerySchema = z.object({
  q: z.string().min(1),
  category: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(20).default(10),
});

export const search = [
  validateQuery(searchQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, category, page, limit } = req.query as any;
      const result = await searchService.searchIdeas(
        q as string,
        Number(page) || 1,
        Number(limit) || 10,
        category as string | undefined
      );
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },
];
