/**
 * Health Check Endpoint
 * Provides system health status for monitoring
 */

import { Router, type Request, type Response } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

const router = Router();

/**
 * Health check endpoint
 * GET /api/health
 */
router.get("/health", async (_req: Request, res: Response) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
    checks: {
      database: "unknown" as "ok" | "error" | "unknown",
    },
  };

  // Check database connection
  try {
    await db.execute(sql`SELECT 1`);
    health.checks.database = "ok";
  } catch (error) {
    health.checks.database = "error";
    health.status = "degraded";
    console.error("Health check: Database connection failed", error);
  }

  const statusCode = health.status === "ok" ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * CORS Diagnostic endpoint
 * GET /api/health/cors
 */
import { getAllowedOrigins } from "../config/env";
router.get("/health/cors", (_req: Request, res: Response) => {
  const allowedOrigins = getAllowedOrigins();
  res.json({
    allowedOrigins,
    nodeEnv: process.env.NODE_ENV || "development",
    hasAllowedOriginsEnv: !!process.env.ALLOWED_ORIGINS
  });
});

export default router;

