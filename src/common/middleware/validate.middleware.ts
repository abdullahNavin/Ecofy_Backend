import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodIssue } from "zod";
import { AppError } from "./errorHandler";

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map((e: ZodIssue) => `${e.path.map(String).join(".")}: ${e.message}`)
        .join(", ");
      return next(new AppError(message, 400));
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const message = result.error.issues
        .map((e: ZodIssue) => `${e.path.map(String).join(".")}: ${e.message}`)
        .join(", ");
      return next(new AppError(message, 400));
    }
    req.query = result.data as typeof req.query;
    next();
  };
}
