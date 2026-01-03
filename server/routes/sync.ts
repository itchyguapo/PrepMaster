import { Router, type Request, type Response } from "express";
import { db } from "../db";
import { attempts, questionDataVersions, userStats, exams, questions, questionOptions } from "@shared/schema";
import { desc, eq, and, sql, inArray } from "drizzle-orm";

type AttemptPayload = {
  id: string;
  examId: string;
  userId?: string;
  answers: Record<string | number, string>;
  startedAt?: number;
  completedAt?: number;
  durationSeconds?: number;
  totalQuestions?: number;
  status: "in_progress" | "completed";
};

type QuestionDataPayload = {
  examBodies: any[];
  categories: any[];
  subjects: any[];
  questions: any[];
  updatedAt?: number;
};

type SyncPayload =
  | { type: "attempt"; payload: AttemptPayload }
  | { type: "questionData"; payload: QuestionDataPayload };

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const body = req.body as SyncPayload;

  if (!body || !body.type || !body.payload) {
    return res.status(400).json({ message: "Invalid sync payload" });
  }

  if (body.type === "attempt") {
    const attempt = body.payload;
    if (!attempt.id || !attempt.examId) {
      return res.status(400).json({ message: "Attempt must include id and examId" });
    }
    try {
      // Idempotent insert; if exists, do nothing
      const insertResult = await db
        .insert(attempts)
        .values({
          id: attempt.id,
          examId: attempt.examId,
          userId: attempt.userId || null,
          answers: attempt.answers,
          startedAt: attempt.startedAt,
          completedAt: attempt.completedAt,
          durationSeconds: attempt.durationSeconds,
          totalQuestions: attempt.totalQuestions,
          status: attempt.status,
        })
        .onConflictDoNothing({ target: attempts.id });

      // Update user stats if attempt is completed and has userId
      if (attempt.status === "completed" && attempt.userId && attempt.totalQuestions) {
        try {
          await updateUserStats(attempt.userId, attempt.examId, attempt.answers, attempt.totalQuestions);
        } catch (err) {
          console.error("Error updating user stats:", err);
          // Don't fail the sync if stats update fails
        }
      }

      return res.json({ message: "Attempt synced", stored: true });
    } catch (err) {
      return res.status(500).json({ message: "Failed to sync attempt", error: String(err) });
    }
  }

  if (body.type === "questionData") {
    const incoming = body.payload;
    const normalizedIncoming = {
      ...incoming,
      categories: Array.isArray((incoming as any).categories) ? (incoming as any).categories : [],
    };
    const incomingVersion = incoming.updatedAt ?? Date.now();
    try {
      const existing = await db
        .select()
        .from(questionDataVersions)
        .orderBy(desc(questionDataVersions.version))
        .limit(1);

      const currentVersion = existing[0]?.version ?? 0;

      if (incomingVersion > currentVersion) {
        await db
          .insert(questionDataVersions)
          .values({
            version: incomingVersion,
            payload: { ...normalizedIncoming, updatedAt: incomingVersion },
          })
          .onConflictDoUpdate({
            target: questionDataVersions.id,
            set: {
              version: incomingVersion,
              payload: { ...normalizedIncoming, updatedAt: incomingVersion },
              updatedAt: new Date(),
            },
          });

        return res.json({ message: "Question data synced", applied: true, version: incomingVersion });
      }

      return res.json({ message: "Question data ignored (older version)", applied: false, version: currentVersion });
    } catch (err) {
      return res.status(500).json({ message: "Failed to sync question data", error: String(err) });
    }
  }

  return res.status(400).json({ message: "Unknown sync type" });
});

// Helper function to update user stats
async function updateUserStats(userId: string, examId: string, answers: Record<string | number, string>, totalQuestions: number) {
  // Get or create user stats
  let stats = await db
    .select()
    .from(userStats)
    .where(eq(userStats.userId, userId))
    .limit(1);

  if (stats.length === 0) {
    const [newStats] = await db
      .insert(userStats)
      .values({
        userId,
        currentStreak: 0,
        longestStreak: 0,
        totalQuestionsAnswered: 0,
        totalCorrectAnswers: 0,
        accuracy: 0,
        achievements: [],
      })
      .returning();
    stats = [newStats];
  }

  const currentStats = stats[0];

  // Get exam to calculate correct answers
  const examRecords = await db
    .select()
    .from(exams)
    .where(eq(exams.id, examId))
    .limit(1);

  if (examRecords.length === 0) return;

  const exam = examRecords[0];
  if (!exam.questionIds || exam.questionIds.length === 0) return;

  // Get questions and their correct answers from question_options table
  const questionRecords = await db
    .select()
    .from(questions)
    .where(and(
      inArray(questions.id, exam.questionIds),
      eq(questions.status, "live")
    ));

  // Get correct answers for all questions
  const correctAnswers = await db
    .select({
      questionId: questionOptions.questionId,
      correctOptionId: questionOptions.optionId
    })
    .from(questionOptions)
    .where(and(
      inArray(questionOptions.questionId, exam.questionIds),
      eq(questionOptions.isCorrect, true)
    ));

  // Create a map of questionId -> correctOptionId
  const correctAnswerMap = new Map();
  correctAnswers.forEach(ca => {
    correctAnswerMap.set(ca.questionId, ca.correctOptionId);
  });

  // Calculate correct answers
  let correctCount = 0;
  questionRecords.forEach((q) => {
    const userAnswer = answers[q.id];
    const correctOptionId = correctAnswerMap.get(q.id);
    // Check if user's answer matches the correct option
    if (userAnswer && correctOptionId && userAnswer === correctOptionId) {
      correctCount++;
    }
  });

  // Update stats
  const newTotalQuestions = (currentStats.totalQuestionsAnswered || 0) + totalQuestions;
  const newTotalCorrect = (currentStats.totalCorrectAnswers || 0) + correctCount;
  const newAccuracy = newTotalQuestions > 0 ? Math.round((newTotalCorrect / newTotalQuestions) * 100) : 0;

  // Update streak
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastPracticeDate = currentStats.lastPracticeDate ? new Date(currentStats.lastPracticeDate) : null;
  const lastPracticeDay = lastPracticeDate ? new Date(lastPracticeDate) : null;
  if (lastPracticeDay) {
    lastPracticeDay.setHours(0, 0, 0, 0);
  }

  let newStreak = currentStats.currentStreak || 0;
  let newLongestStreak = currentStats.longestStreak || 0;

  if (!lastPracticeDay || lastPracticeDay.getTime() === today.getTime()) {
    // Same day, don't increment streak
  } else {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    if (lastPracticeDay.getTime() === yesterday.getTime()) {
      // Practiced yesterday, increment streak
      newStreak = (currentStats.currentStreak || 0) + 1;
      newLongestStreak = Math.max(newLongestStreak, newStreak);
    } else {
      // Gap in practice, reset streak
      newStreak = 1;
    }
  }

  // Check for achievements
  const achievements = new Set(currentStats.achievements || []);
  
  if (newTotalQuestions === 1 && !achievements.has("first_question")) {
    achievements.add("first_question");
  }
  if (correctCount === totalQuestions && !achievements.has("perfect_score")) {
    achievements.add("perfect_score");
  }
  if (newStreak >= 7 && !achievements.has("week_warrior")) {
    achievements.add("week_warrior");
  }
  if (newStreak >= 30 && !achievements.has("month_master")) {
    achievements.add("month_master");
  }
  if (newTotalQuestions >= 100 && !achievements.has("century_club")) {
    achievements.add("century_club");
  }
  if (newAccuracy >= 90 && !achievements.has("accuracy_ace")) {
    achievements.add("accuracy_ace");
  }

  // Update user stats
  await db
    .update(userStats)
    .set({
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastPracticeDate: today,
      totalQuestionsAnswered: newTotalQuestions,
      totalCorrectAnswers: newTotalCorrect,
      accuracy: newAccuracy,
      achievements: Array.from(achievements),
      updatedAt: new Date(),
    })
    .where(eq(userStats.userId, userId));
}

export default router;

