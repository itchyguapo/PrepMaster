import type { Express } from "express";
import { createServer, type Server } from "http";
import syncRouter from "./routes/sync";
import examsRouter from "./routes/exams";
import authRouter from "./routes/auth";
import adminRouter from "./routes/admin";
import tutorRouter from "./routes/tutor";
import paymentsRouter from "./routes/payments";
import tutorInquiriesRouter from "./routes/tutorInquiries";
import studentRouter from "./routes/student";
import studentExamBodiesRouter from "./routes/student-exam-bodies";
import studentPerformanceRouter from "./routes/student-performance";
import healthRouter from "./routes/health";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // Health check endpoint (public, no auth required)
  app.use("/api", healthRouter);

  // Sync endpoint for offline-first clients
  app.use("/api/sync", syncRouter);

  // Auth endpoints
  app.use("/api/auth", authRouter);

  // Admin endpoints (protected by middleware)
  app.use("/api/admin", adminRouter);

  // Tutor endpoints (protected by middleware)
  app.use("/api/tutor", tutorRouter);

  // Payment endpoints
  app.use("/api/payments", paymentsRouter);

  // Tutor inquiries endpoints
  app.use("/api/tutor-inquiries", tutorInquiriesRouter);

  // Student exam endpoints
  app.use("/api/student", studentRouter);
  app.use("/api/student", studentExamBodiesRouter);
  app.use("/api/exams", studentPerformanceRouter);

  // Exam and question endpoints
  app.use("/api", examsRouter);

  return httpServer;
}
