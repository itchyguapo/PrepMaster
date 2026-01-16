import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { validateEnv, getAllowedOrigins } from "./config/env";
import { validateAdminEmailsConfig } from "./utils/adminEmails";
import { apiLimiter } from "./middleware/rateLimiter";
import { validateSchemaOnStartup } from "./utils/schemaValidation";
import { CleanupService } from "./services/CleanupService";

// Validate environment variables on startup
try {
  validateEnv();
  console.log("✅ Environment variables validated");
} catch (error) {
  console.error("❌ Environment validation failed:", error);
  process.exit(1);
}

// Validate admin emails configuration
validateAdminEmailsConfig();

// Initialize Cleanup Service (Run on startup and every hour)
CleanupService.runCleanup();
setInterval(() => {
  CleanupService.runCleanup();
}, 60 * 60 * 1000); // 1 hour

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Serve uploaded files
import path from "path";
import { fileURLToPath } from "url";

// Handle both ESM and CJS environments
let __dirname_resolved: string;
try {
  // ESM environment
  const __filename = fileURLToPath(import.meta.url);
  __dirname_resolved = path.dirname(__filename);
} catch {
  // CJS environment (production build)
  __dirname_resolved = process.cwd();
}
app.use("/uploads", express.static(path.resolve(__dirname_resolved, "uploads")));

// Enable CORS with origin whitelist
const allowedOrigins = getAllowedOrigins();
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Set standard CORS headers
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  // If no origin, it's not a CORS request (e.g., direct browser hit or same-origin without header)
  if (!origin) {
    return next();
  }

  // Handle preflight
  if (req.method === "OPTIONS") {
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      return res.sendStatus(200);
    }
    // In production, be strict with preflight if whitelist exists
    if (process.env.NODE_ENV === "production" && allowedOrigins.length > 0) {
      return res.status(403).json({ message: "CORS policy: Origin not allowed" });
    }
    return res.sendStatus(200);
  }

  // Determine if origin is allowed
  const isAllowed = allowedOrigins.length === 0 || allowedOrigins.includes(origin);

  if (isAllowed) {
    res.header("Access-Control-Allow-Origin", origin);
  } else if (process.env.NODE_ENV === "production") {
    // In production, only 403 for non-GET requests if not allowed
    // This prevents breaking script/asset loads that might send an Origin header
    if (req.method !== "GET" && req.method !== "HEAD") {
      console.warn(`⚠️ Blocked cross-origin ${req.method} request from: ${origin}`);
      return res.status(403).json({ message: "CORS policy: Origin not allowed" });
    }
    // For GET/HEAD requests not in whitelist, we just don't set the header
    // The browser will block it if it's truly a cross-origin unauthorized request
  } else {
    // Development fallback: allow all origins
    res.header("Access-Control-Allow-Origin", origin);
  }

  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Apply general rate limiting to all API endpoints
app.use("/api", apiLimiter);

(async () => {
  // Validate database schema on startup
  try {
    const { validateSchemaOnStartup } = await import("./utils/schemaValidation");
    await validateSchemaOnStartup();
  } catch (error) {
    console.warn("⚠️  Schema validation issues found:", (error as any).message);
    console.error("Please run the migration: psql -d your_database -f migrations/001_comprehensive_schema_migration.sql");
    // Don't exit - allow server to start for testing
  }

  await registerRoutes(httpServer, app);

  // Global error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const error = err instanceof Error ? err : new Error(String(err));
    const status = (error as { status?: number; statusCode?: number }).status ||
      (error as { status?: number; statusCode?: number }).statusCode || 500;
    const message = error.message || "Internal Server Error";

    log(`Error ${status}: ${message}`, "error");

    // Don't expose internal error details in production
    const errorMessage = process.env.NODE_ENV === "production" && status === 500
      ? "Internal Server Error"
      : message;

    res.status(status).json({
      message: errorMessage,
      ...(process.env.NODE_ENV === "development" && { error: error.message, stack: error.stack })
    });

    // Only log full error in development
    if (process.env.NODE_ENV !== "production") {
      console.error("Full error:", error);
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Get port from environment variable or default to 5000
  const defaultPort = parseInt(process.env.PORT || "5000", 10);
  const HOST = "0.0.0.0"; // Listen on all interfaces for external browser access

  // Function to find an available port
  const findAvailablePort = (startPort: number, maxAttempts = 10): Promise<number> => {
    return new Promise((resolve, reject) => {
      let currentPort = startPort;
      let attempts = 0;

      const tryPort = (port: number) => {
        const testServer = createServer();
        testServer.listen(port, HOST, () => {
          testServer.close(() => {
            resolve(port);
          });
        });
        testServer.on("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "EADDRINUSE") {
            attempts++;
            currentPort++;
            if (attempts < maxAttempts) {
              log(`Port ${port} is in use, trying port ${currentPort}...`, "info");
              tryPort(currentPort);
            } else {
              reject(new Error(`Could not find available port after ${maxAttempts} attempts`));
            }
          } else {
            reject(err);
          }
        });
      };
      tryPort(startPort);
    });
  };

  // Start server on available port
  try {
    const port = await findAvailablePort(defaultPort);
    httpServer.listen(port, HOST, () => {
      log(`Server started successfully`);
      log(`Listening on http://${HOST}:${port}`);
      log(`Accessible locally at http://localhost:${port}`);
      log(`Accessible externally at http://<your-ip>:${port}`);
    });

    httpServer.on("error", (err: NodeJS.ErrnoException) => {
      log(`Server error: ${err.message}`, "error");
      process.exit(1);
    });
  } catch (error: any) {
    log(`Failed to start server: ${error.message}`, "error");
    process.exit(1);
  }

})();
