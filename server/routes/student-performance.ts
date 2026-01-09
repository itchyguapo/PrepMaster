import { Router, type Request, type Response } from "express";
import { db } from "../db";
import { eq, and, desc, gte, sql, inArray } from "drizzle-orm";
import { users, attempts, questions, exams, questionOptions, subjects } from "@shared/schema";

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

    const completedAttempts = userAttempts.filter(a => a.status === "completed");

    // Performance metrics
    let totalQuestionsAnswered = 0;
    let totalCorrectAnswers = 0;
    const subjectStats: Record<string, { total: number; correct: number }> = {};
    const processedAttempts: any[] = [];

    // Process each completed attempt to calculate real score
    for (const attempt of completedAttempts) {
      const examRecords = await db
        .select()
        .from(exams)
        .where(eq(exams.id, attempt.examId))
        .limit(1);

      if (examRecords.length === 0 || !examRecords[0].questionIds?.length) continue;

      const currentExam = examRecords[0];

      // Get correct answers for this exam's questions
      const correctAnswersList = await db
        .select({
          questionId: questionOptions.questionId,
          correctOptionId: questionOptions.optionId,
          subjectId: questions.subjectId,
          subjectName: subjects.name,
        })
        .from(questionOptions)
        .innerJoin(questions, eq(questionOptions.questionId, questions.id))
        .innerJoin(subjects, eq(questions.subjectId, subjects.id))
        .where(and(
          inArray(questionOptions.questionId, currentExam.questionIds),
          eq(questionOptions.isCorrect, true)
        ));

      const correctAnswerMap = new Map();
      correctAnswersList.forEach(ca => {
        correctAnswerMap.set(ca.questionId, {
          correctOptionId: ca.correctOptionId,
          subject: ca.subjectName
        });
      });

      let attemptCorrect = 0;
      let attemptTotal = 0;

      // Calculate score for this attempt
      Object.entries(attempt.answers || {}).forEach(([qId, userAnswer]) => {
        const correctInfo = correctAnswerMap.get(qId);
        if (correctInfo) {
          attemptTotal++;
          const isCorrect = userAnswer === correctInfo.correctOptionId;

          if (isCorrect) {
            attemptCorrect++;
          }

          // Subject performance
          const subject = correctInfo.subject || "Mixed";
          if (!subjectStats[subject]) {
            subjectStats[subject] = { total: 0, correct: 0 };
          }
          subjectStats[subject].total++;
          if (isCorrect) subjectStats[subject].correct++;
        }
      });

      totalCorrectAnswers += attemptCorrect;
      totalQuestionsAnswered += attemptTotal;

      processedAttempts.push({
        id: attempt.id,
        score: attemptCorrect,
        total: attemptTotal,
        percentage: attemptTotal > 0 ? (attemptCorrect / attemptTotal) * 100 : 0,
        date: attempt.startedAt
      });
    }

    const averageScore = totalQuestionsAnswered > 0
      ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100)
      : 0;

    // Calculate recent performance (last 10 attempts)
    const recentProcessed = processedAttempts.slice(0, 10);
    const recentAverage = recentProcessed.length > 0
      ? Math.round(recentProcessed.reduce((sum, a) => sum + a.percentage, 0) / recentProcessed.length)
      : 0;

    // Calculate streak
    let currentStreak = 0;
    let longestStreak = 0;

    // Streak logic: check consecutive days or consecutive completions? 
    // Usually streak means consecutive days. 
    // For now, let's keep it simple: consecutive completed attempts logic from the previous code, 
    // but a real streak would check dates.
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
      totalAttempts: userAttempts.length,
      completedAttempts: completedAttempts.length,
      averageScore,
      currentStreak,
      longestStreak,
      subjectPerformance: Object.entries(subjectStats).map(([subject, data]) => ({
        subject,
        accuracy: Math.round((data.correct / data.total) * 100),
        totalQuestions: data.total
      })),
      recentPerformance: {
        average: recentAverage,
        attempts: recentProcessed.length
      },
      weakTopics: []
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