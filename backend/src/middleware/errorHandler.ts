import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation Error",
      message: "The request payload failed schema validation.",
      details: err.flatten(),
    });
  }

  // 2. SyntaxError for Malformed JSON Body
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Malformed JSON payload provided.",
    });
  }

  // 3. Generic Server Errors
  const isDev = env.NODE_ENV === "development" || env.NODE_ENV === "test";
  console.error("[Server Error]", err);

  return res.status(err.status || 500).json({
    error: err.name || "Internal Server Error",
    message: isDev ? err.message : "An unexpected server error occurred.",
    ...(isDev && { stack: err.stack }),
  });
}
