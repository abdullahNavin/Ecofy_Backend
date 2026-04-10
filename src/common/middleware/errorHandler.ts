import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { env } from "../../config/env";

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({
        success: false,
        error: "Duplicate resource. A unique constraint failed.",
      });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({
        success: false,
        error: "Resource not found.",
      });
      return;
    }
    if (err.code === "P2003") {
      res.status(400).json({
        success: false,
        error: "Foreign key constraint failed. Related resource does not exist.",
      });
      return;
    }
    // Generic BAD REQUEST for other known Prisma errors to prevent 500
    res.status(400).json({
      success: false,
      error: "Database constraint or invalid request error.",
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      error: "Database validation error (e.g. invalid types or missing data).",
    });
    return;
  }

  console.error("[Unhandled Error]", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    ...(env.NODE_ENV === "development" && { stack: err.stack }),
  });
}
