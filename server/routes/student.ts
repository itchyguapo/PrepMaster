import { Router, type Request, type Response } from "express";
import { db } from "../db";
import { eq, and, sql, desc, gte } from "drizzle-orm";
import { users, questions, attempts, subscriptions, examBodies, categories } from "@shared/schema";
import { safeInsertExam } from "../utils/breakProofExams";

const router = Router();

// Generate exam with structured logic
// Accepts either IDs or names for exam_body and category
router.post("/exams/generate", async (req: Request, res: Response) => {
  try {
    const { exam_body_id, category_id, question_count, supabaseId } = req.body;

    if (!exam_body_id || !category_id || !question_count || !supabaseId) {
      return res.status(400).json({
        message: "Missing required fields: exam_body_id, category_id, question_count, supabaseId"
      });
    }

    // Find user
    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, supabaseId))
      .limit(1);

    if (userRecords.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRecords[0];

    // Resolve exam body - accept either ID or name
    let resolvedExamBodyId = exam_body_id;
    let examBodyName = exam_body_id;

    // Check if it's a name (not a UUID-like ID)
    if (!exam_body_id.includes("-") || exam_body_id.length < 20) {
      const examBodyRecord = await db
        .select()
        .from(examBodies)
        .where(eq(examBodies.name, exam_body_id))
        .limit(1);

      if (examBodyRecord.length > 0) {
        resolvedExamBodyId = examBodyRecord[0].id;
        examBodyName = examBodyRecord[0].name;
      } else {
        return res.status(404).json({ message: `Exam body '${exam_body_id}' not found` });
      }
    }

    // Resolve category - accept either ID or name (Science, Arts, Commercial)
    let resolvedCategoryId = category_id;
    let categoryName = category_id;

    if (!category_id.includes("-") || category_id.length < 20) {
      try {
        const categoryRecord = await db
          .select()
          .from(categories)
          .where(
            and(
              eq(categories.name, category_id),
              eq(categories.examBodyId, resolvedExamBodyId)
            )
          )
          .limit(1);

        if (categoryRecord.length > 0) {
          resolvedCategoryId = categoryRecord[0].id;
          categoryName = categoryRecord[0].name;
        } else {
          // Try without exam body filter
          const anyCategoryRecord = await db
            .select()
            .from(categories)
            .where(eq(categories.name, category_id))
            .limit(1);

          if (anyCategoryRecord.length > 0) {
            resolvedCategoryId = anyCategoryRecord[0].id;
            categoryName = anyCategoryRecord[0].name;
          } else {
            // If no category found, use the name directly and skip category filtering
            console.warn(`Category '${category_id}' not found in database, using name directly`);
            resolvedCategoryId = category_id; // Use as fallback
            categoryName = category_id;
          }
        }
      } catch (error) {
        console.error("Error resolving category:", error);
        // Use fallback
        resolvedCategoryId = category_id;
        categoryName = category_id;
      }
    }

    // Get subscription to determine plan
    const subscriptionRecords = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, user.id),
          eq(subscriptions.status, "active")
        )
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    const plan = subscriptionRecords[0]?.plan || "basic";

    // Tier limits as specified
    const tierLimits = {
      basic: { max_questions_per_exam: 20, monthly_exam_limit: 10 },
      standard: { max_questions_per_exam: 50, monthly_exam_limit: 50 },
      premium: { max_questions_per_exam: 100, monthly_exam_limit: 999 }
    };

    const limits = tierLimits[plan as keyof typeof tierLimits];

    // Check question count limit
    if (question_count > limits.max_questions_per_exam) {
      return res.status(403).json({
        message: `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan allows maximum ${limits.max_questions_per_exam} questions per exam`,
        maxQuestions: limits.max_questions_per_exam
      });
    }

    // Check monthly exam limit (except premium)
    if (plan !== "premium") {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthlyAttempts = await db
        .select({ count: sql<number>`count(*)` })
        .from(attempts)
        .where(
          and(
            eq(attempts.userId, user.id),
            eq(attempts.status, "completed"),
            gte(attempts.createdAt, monthStart)
          )
        );

      const monthlyCount = Number(monthlyAttempts[0]?.count || 0);

      if (monthlyCount >= limits.monthly_exam_limit) {
        return res.status(403).json({
          message: `Monthly exam limit reached. ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan allows ${limits.monthly_exam_limit} exams per month.`,
          monthlyLimit: limits.monthly_exam_limit,
          monthlyCount
        });
      }
    }

    // Get available questions for selected criteria using resolved IDs
    let availableQuestions = [];
    try {
      // Try with category filter first
      availableQuestions = await db
        .select()
        .from(questions)
        .where(
          and(
            eq(questions.examBodyId, resolvedExamBodyId),
            eq(questions.categoryId, resolvedCategoryId),
            eq(questions.status, "live")
          )
        );

      // If no questions found with category filter, try without it
      if (availableQuestions.length === 0) {
        console.warn(`No questions found for category ${categoryName}, trying without category filter`);
        availableQuestions = await db
          .select()
          .from(questions)
          .where(
            and(
              eq(questions.examBodyId, resolvedExamBodyId),
              eq(questions.status, "live")
            )
          );
      }
    } catch (error: any) {
      console.error("Error fetching questions:", error);
      return res.status(500).json({
        message: "Failed to fetch questions",
        error: error?.message || String(error)
      });
    }

    // Check if sufficient questions exist
    if (availableQuestions.length < question_count) {
      return res.status(400).json({
        message: `Only ${availableQuestions.length} questions available for this category. Requested: ${question_count}`,
        availableQuestions: availableQuestions.length
      });
    }

    // Generate random questions
    const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, question_count);
    const questionIds = selectedQuestions.map(q => q.id);

    // Take Exam Feature: Use categoryId as subjectId fallback (different from Quick Test)
    // Quick Test uses random questions, Take Exam uses structured approach
    let examSubjectId = selectedQuestions[0]?.subjectId;

    // If questions don't have subjectId, use categoryId as fallback for Take Exam
    if (!examSubjectId && resolvedCategoryId) {
      examSubjectId = resolvedCategoryId;
      console.warn('Using categoryId as subjectId fallback for Take Exam');
    }

    // Final validation for Take Exam
    if (!examSubjectId) {
      return res.status(500).json({
        message: "Failed to generate Take Exam: Unable to determine subjectId",
        error: "subjectId is required for exam creation"
      });
    }

    // Create exam using break-proof insertion
    // Only include columns that exist in the database:
    // id, title, subject, body, subcategory, exam_body_id, category_id, subject_id, question_ids, duration, description
    const examId = `exam-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    if (process.env.NODE_ENV === 'development') console.log(`[TAKE EXAM] Creating exam: ${examId} with ${questionIds.length} questions`);

    const exam = await safeInsertExam({
      id: examId,
      title: `${examBodyName} ${categoryName} Practice - ${question_count} Questions`,
      body: examBodyName,
      examBodyId: resolvedExamBodyId,
      categoryId: resolvedCategoryId,
      subjectId: examSubjectId,
      subject: categoryName,
      subcategory: categoryName,
      questionIds,
      duration: 3600, // 60 minutes in seconds
      durationMinutes: 60,
      totalQuestions: questionIds.length,
      totalMarks: questionIds.length, // Default 1 mark per question
      createdBy: user.id, // Required by database constraint
      description: `Take Exam: ${question_count} questions from ${examBodyName} ${categoryName}`,
    });

    if (process.env.NODE_ENV === 'development') console.log(`[TAKE EXAM] Exam created successfully:`, exam?.id || 'No ID returned');

    // Return exam with questions for immediate use in frontend
    const response = {
      ...exam,
      questions: selectedQuestions.map(q => ({
        id: q.id,
        text: q.text, // Use 'text' to match Question type in ExamRoom
        question: q.text, // Also include 'question' for backward compatibility
        options: q.options,
        subject: categoryName,
        correctAnswer: null,
        explanation: null
      }))
    };

    if (process.env.NODE_ENV === 'development') console.log(`[TAKE EXAM] Returning ${response.questions.length} questions`);
    return res.json(response);

  } catch (err: any) {
    console.error("Error generating structured exam:", err);
    return res.status(500).json({
      message: "Failed to generate exam",
      error: err.message || String(err)
    });
  }
});

// Quick Test endpoint - completely random logic
router.post("/exams/quick-test", async (req: Request, res: Response) => {
  try {
    const { supabaseId } = req.body;

    if (!supabaseId) {
      return res.status(400).json({ message: "supabaseId is required" });
    }

    // Find user
    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, supabaseId))
      .limit(1);

    if (userRecords.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRecords[0];

    // Get subscription to determine plan
    const subscriptionRecords = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, user.id),
          eq(subscriptions.status, "active")
        )
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    const plan = subscriptionRecords[0]?.plan || "basic";

    // Tier-based question counts for Quick Test
    const quickTestCounts = {
      basic: 10,
      standard: 20,
      premium: 30
    };

    const questionCount = quickTestCounts[plan as keyof typeof quickTestCounts];

    // Get completely random questions from ANY exam body and category
    const randomQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.status, "live"))
      .orderBy(sql`RANDOM()`)
      .limit(questionCount);

    if (randomQuestions.length === 0) {
      return res.status(404).json({ message: "No questions available" });
    }

    // Quick Test: Strict validation - NO fallbacks (different from Take Exam)
    // Quick Test must have subjectId in questions, Take Exam uses categoryId fallback
    if (!randomQuestions[0]?.subjectId) {
      return res.status(500).json({
        message: "Failed to generate quick test: Questions missing required subjectId",
        error: "subjectId is required for exam creation"
      });
    }

    const questionIds = randomQuestions.map(q => q.id);

    // Create exam using break-proof insertion
    // Only include columns that exist in the database
    const quickExamId = `quick-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    if (process.env.NODE_ENV === 'development') console.log(`[QUICK TEST] Creating exam: ${quickExamId} with ${questionIds.length} questions`);

    const exam = await safeInsertExam({
      id: quickExamId,
      title: `Quick Test - ${questionCount} Questions`,
      body: "Mixed",
      examBodyId: randomQuestions[0]?.examBodyId,
      categoryId: randomQuestions[0]?.categoryId,
      subjectId: randomQuestions[0].subjectId,
      subject: "Mixed",
      subcategory: "Mixed",
      questionIds,
      duration: 1800, // 30 minutes in seconds
      durationMinutes: 30,
      totalQuestions: questionIds.length,
      totalMarks: questionIds.length,
      createdBy: user.id, // Required by database constraint
      description: `Quick Test: ${questionCount} random questions`,
    });

    if (process.env.NODE_ENV === 'development') console.log(`[QUICK TEST] Exam created successfully:`, exam?.id || 'No ID returned');

    // Return exam with questions for immediate use in frontend
    const response = {
      ...exam,
      questions: randomQuestions.map(q => ({
        id: q.id,
        text: q.text, // Use 'text' to match Question type in ExamRoom
        question: q.text, // Also include 'question' for backward compatibility
        options: q.options,
        subject: "Mixed",
        correctAnswer: null,
        explanation: null
      }))
    };

    if (process.env.NODE_ENV === 'development') console.log(`[QUICK TEST] Returning ${response.questions.length} questions`);
    return res.json(response);

  } catch (err: any) {
    console.error("Error generating quick test:", err);
    return res.status(500).json({
      message: "Failed to generate quick test",
      error: err.message || String(err)
    });
  }
});

// Get comprehensive student stats
router.get("/stats", async (req: Request, res: Response) => {
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

    // Get all user attempts
    const userAttempts = await db
      .select()
      .from(attempts)
      .where(eq(attempts.userId, user.id))
      .orderBy(desc(attempts.createdAt));

    const completedAttempts = userAttempts.filter(a => a.status === "completed");
    const totalExams = completedAttempts.length;

    // Calculate average score
    let totalCorrect = 0;
    let totalQuestions = 0;
    completedAttempts.forEach(attempt => {
      const answers = attempt.answers || {};
      Object.values(answers).forEach((answer: any) => {
        totalQuestions++;
        if (answer.isCorrect) totalCorrect++;
      });
    });
    const averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    // Calculate total time spent
    const totalTimeSpent = completedAttempts.reduce((sum, a) => sum + (a.durationSeconds || 0), 0);

    // Get best score
    let bestScore = 0;
    completedAttempts.forEach(attempt => {
      const answers = attempt.answers || {};
      const correct = Object.values(answers).filter((a: any) => a.isCorrect).length;
      const total = Object.keys(answers).length;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      if (score > bestScore) bestScore = score;
    });

    // Get exams this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const examsThisMonth = completedAttempts.filter(a =>
      a.createdAt && new Date(a.createdAt) >= monthStart
    ).length;

    // Get recent sessions (last 5)
    const recentSessions = completedAttempts.slice(0, 5).map(attempt => {
      const answers = attempt.answers || {};
      const correct = Object.values(answers).filter((a: any) => a.isCorrect).length;
      const total = Object.keys(answers).length;
      return {
        id: attempt.id,
        examId: attempt.examId,
        score: total > 0 ? Math.round((correct / total) * 100) : 0,
        totalQuestions: total,
        correctAnswers: correct,
        timeSpent: attempt.durationSeconds || 0,
        completedAt: attempt.completedAt,
        createdAt: attempt.createdAt
      };
    });

    return res.json({
      totalExams,
      averageScore,
      bestScore,
      totalTimeSpent,
      totalQuestionsAnswered: totalQuestions,
      totalCorrectAnswers: totalCorrect,
      examsThisMonth,
      recentSessions,
      inProgressExams: userAttempts.filter(a => a.status === "in_progress").length
    });

  } catch (err: any) {
    console.error("Error fetching student stats:", err);
    return res.status(500).json({
      message: "Failed to fetch stats",
      error: err.message || String(err)
    });
  }
});

// Get usage statistics for the current user
router.get("/usage", async (req: Request, res: Response) => {
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

    // Get subscription to determine plan
    const subscriptionRecords = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, user.id),
          eq(subscriptions.status, "active")
        )
      )
      .limit(1);

    const plan = subscriptionRecords[0]?.plan || "basic";

    // Tier limits
    const tierLimits = {
      basic: { monthly_exam_limit: 10, daily_question_limit: 100 },
      standard: { monthly_exam_limit: 50, daily_question_limit: 500 },
      premium: { monthly_exam_limit: null, daily_question_limit: null }
    };

    const limits = tierLimits[plan as keyof typeof tierLimits];

    // Get exams this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyExams = await db
      .select({ count: sql<number>`count(*)` })
      .from(attempts)
      .where(
        and(
          eq(attempts.userId, user.id),
          eq(attempts.status, "completed"),
          gte(attempts.createdAt, monthStart)
        )
      );

    const examsThisMonth = Number(monthlyExams[0]?.count || 0);

    // Get questions answered today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayAttempts = await db
      .select()
      .from(attempts)
      .where(
        and(
          eq(attempts.userId, user.id),
          gte(attempts.createdAt, todayStart)
        )
      );

    let questionsToday = 0;
    todayAttempts.forEach(attempt => {
      questionsToday += Object.keys(attempt.answers || {}).length;
    });

    // Calculate days until reset
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysUntilReset = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return res.json({
      plan,
      examsThisMonth: {
        count: examsThisMonth,
        limit: limits.monthly_exam_limit,
        remaining: limits.monthly_exam_limit ? Math.max(0, limits.monthly_exam_limit - examsThisMonth) : null,
        percentage: limits.monthly_exam_limit ? Math.round((examsThisMonth / limits.monthly_exam_limit) * 100) : 0
      },
      questionsToday: {
        count: questionsToday,
        limit: limits.daily_question_limit,
        remaining: limits.daily_question_limit ? Math.max(0, limits.daily_question_limit - questionsToday) : null,
        percentage: limits.daily_question_limit ? Math.round((questionsToday / limits.daily_question_limit) * 100) : 0
      },
      daysUntilReset
    });

  } catch (err: any) {
    console.error("Error fetching usage stats:", err);
    return res.status(500).json({
      message: "Failed to fetch usage stats",
      error: err.message || String(err)
    });
  }
});

export default router;
