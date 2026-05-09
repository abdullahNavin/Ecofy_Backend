import { Request, Response, NextFunction } from "express";
import * as searchService from "./search.service";
import { z } from "zod";
import { validateQuery } from "../../common/middleware/validate.middleware";
import { env } from "../../config/env";

const searchQuerySchema = z.object({
  q: z.string().min(1),
  category: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(20).default(10),
});

async function buildQueryEmbedding(q: string) {
  if (!env.OPENAI_API_KEY) return undefined;

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_EMBEDDING_MODEL,
      input: q,
      encoding_format: "float",
    }),
  });

  if (!response.ok) return undefined;
  const json = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };
  return json.data?.[0]?.embedding as number[] | undefined;
}

export const search = [
  validateQuery(searchQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, category, page, limit } = req.query as any;
      const queryEmbedding = await buildQueryEmbedding(q as string);
      const result = await searchService.searchIdeas(
        q as string,
        Number(page) || 1,
        Number(limit) || 10,
        category as string | undefined,
        queryEmbedding
      );
      res.json({ success: true, data: result.ideas, meta: result.meta });
    } catch (err) {
      next(err);
    }
  },
];

export const recommendations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = await searchService.recommendIdeasForUser(req.user!.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
