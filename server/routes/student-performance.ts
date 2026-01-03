import { Router, type Request, type Response } from "express";
import { db } from "../db";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { users, attempts, questions } from "@shared/schema";

const router = Router();

// Get student performance data
router.get("/performance", async (req: Request, res: Response) => {
  try {
    const { supabaseId } = req.query;

    if (!supabaseId) {
      return res.status(400).json({ message: "supabaseId is required" });
    }

    // Find user
    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, supabaseId as string))
      .limit(1);

    if (userRecords.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRecords[0];

    // Get user's attempts
    const userAttempts = await db
      .select()
      .from(attempts)
      .where(eq(attempts.userId, user.id))
      .orderBy(desc(attempts.startedAt));

    // Calculate performance metrics
    const completedAttempts = userAttempts.filter(a => a.status === "completed");
    const totalAttempts = userAttempts.length;
    const averageScore = completedAttempts.length > 0
      ? completedAttempts.reduce((sum, attempt) => {
        const correct = Object.values(attempt.answers || {}).filter((answer: any) => answer.isCorrect).length;
        const total = Object.keys(attempt.answers || {}).length;
        return sum + (total > 0 ? (correct / total) * 100 : 0);
      }, 0) / completedAttempts.length
      : 0;

    // Get subject-wise performance
    const subjectPerformance: Record<string, { total: number; correct: number }> = {};
    completedAttempts.forEach(attempt => {
      Object.entries(attempt.answers || {}).forEach(([questionId, answer]: [string, any]) => {
        // This would need to join with questions to get subject
        // For now, we'll use a simple approach
        // @ts-ignore
        const subject = attempt.subject || "Mixed";
        if (!subjectPerformance[subject]) {
          subjectPerformance[subject] = { total: 0, correct: 0 };
        }
        subjectPerformance[subject].total++;
        if (answer.isCorrect) {
          subjectPerformance[subject].correct++;
        }
      });
    });

    // Get recent performance (last 10 attempts)
    const recentAttempts = userAttempts.slice(0, 10);
    const recentAverage = recentAttempts.length > 0
      ? recentAttempts.reduce((sum, attempt) => {
        if (attempt.status !== "completed") return sum;
        const correct = Object.values(attempt.answers || {}).filter((answer: any) => answer.isCorrect).length;
        const total = Object.keys(attempt.answers || {}).length;
        return sum + (total > 0 ? (correct / total) * 100 : 0);
      }, 0) / recentAttempts.filter(a => a.status === "completed").length
      : 0;

    // Calculate streak
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    userAttempts.forEach(attempt => {
      if (attempt.status === "completed") {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    });
    currentStreak = tempStreak;

    return res.json({
      totalAttempts,
      completedAttempts: completedAttempts.length,
      averageScore: Math.round(averageScore),
      currentStreak,
      longestStreak,
      subjectPerformance: Object.entries(subjectPerformance).map(([subject, data]) => ({
        subject,
        accuracy: Math.round((data.correct / data.total) * 100),
        totalQuestions: data.total
      })),
      recentPerformance: {
        average: Math.round(recentAverage),
        attempts: recentAttempts.length
      },
      weakTopics: [] // Would need more complex analysis
    });

  } catch (err: any) {
    console.error("Error fetching performance data:", err);
    return res.status(500).json({
      message: "Failed to fetch performance data",
      error: err.message || String(err)
    });
  }
});

export default router;