/**
 * Standardized Error Handling Middleware
 * Provides consistent error handling across all routes
 */

import type { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  routeName: string
): { message: string; error?: string; statusCode: number } {
  const isDevelopment = process.env.NODE_ENV === "development";
  
  // Handle known error types
  if (error instanceof Error) {
    const appError = error as AppError;
    const statusCode = appError.statusCode || 500;
    const message = appError.message || "An error occurred";
    
    // Log error
    console.error(`[${routeName}] Error ${statusCode}:`, {
      message: error.message,
      stack: isDevelopment ? error.stack : undefined,
    });
    
    return {
      message,
      ...(isDevelopment && { error: error.message }),
      statusCode,
    };
  }
  
  // Handle unknown error types
  const errorString = String(error);
  console.error(`[${routeName}] Unknown error:`, errorString);
  
  return {
    message: "An unexpected error occurred",
    ...(isDevelopment && { error: errorString }),
    statusCode: 500,
  };
}

/**
 * Async route handler wrapper that catches errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Error handler middleware
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const routeName = req.path || "unknown";
  const errorResponse = createErrorResponse(err, routeName);
  
  res.status(errorResponse.statusCode).json({
    message: errorResponse.message,
    ...(errorResponse.error && { error: errorResponse.error }),
  });
}

/**
 * Creates a custom error
 */
export function createError(
  message: string,
  statusCode = 500
): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}

