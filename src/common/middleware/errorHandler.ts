import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { env } from "../../config/env";

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code = "APP_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

function errorPayload(code: string, message: string, details?: unknown) {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorPayload(err.code, err.message));
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json(errorPayload("DUPLICATE_RESOURCE", "Duplicate resource. A unique constraint failed."));
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json(errorPayload("RESOURCE_NOT_FOUND", "Resource not found."));
      return;
    }
    if (err.code === "P2003") {
      res.status(400).json(errorPayload("FOREIGN_KEY_CONSTRAINT", "Foreign key constraint failed. Related resource does not exist."));
      return;
    }
    // Generic BAD REQUEST for other known Prisma errors to prevent 500
    res.status(400).json(errorPayload("DATABASE_REQUEST_ERROR", "Database constraint or invalid request error."));
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json(errorPayload("DATABASE_VALIDATION_ERROR", "Database validation error (e.g. invalid types or missing data)."));
    return;
  }

  console.error("[Unhandled Error]", err);
  res.status(500).json(errorPayload(
    "INTERNAL_SERVER_ERROR",
    "Internal server error",
    env.NODE_ENV === "development" ? { stack: err.stack } : undefined
  ));
}
