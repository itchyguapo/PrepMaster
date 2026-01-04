import { Router, type Request, type Response } from "express";
import { db } from "../db";
import { examBodies, examTypes, categories, subjects, questions, exams, attempts, users, blogPosts, examFormulas, subscriptions, userStats, questionOptions } from "@shared/schema";
import { eq, and, inArray, sql, count, gte, desc, or, ilike } from "drizzle-orm";
import { formatQuestion, formatQuestionOptions } from "../utils/questionFormatter";
import { practiceTestLimiter, examGenerationLimiter } from "../middleware/rateLimiter";
import { safeSelectExams, safeInsertExam } from "../utils/breakProofExams";
import { ExamLimitService } from "../services/ExamLimitService";

const router = Router();

// Get all exam bodies
router.get("/exam-bodies", async (_req: Request, res: Response) => {
  try {
    const bodies = await db.select().from(examBodies);
    return res.json(bodies); // Return full objects with id and name
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch exam bodies", error: String(err) });
  }
});

// Get exam types for an exam body
router.get("/exam-types", async (req: Request, res: Response) => {
  try {
    const { examBodyId } = req.query;

    if (!examBodyId) {
      return res.status(400).json({ message: "examBodyId is required" });
    }

    const types = await db
      .select()
      .from(examTypes)
      .where(eq(examTypes.examBodyId, examBodyId as string))
      .orderBy(examTypes.name);

    return res.json(types);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch exam types", error: String(err) });
  }
});

// Get categories for an exam body (for practice center dropdowns)
router.get("/categories", async (req: Request, res: Response) => {
  try {
    const { examBodyId } = req.query;

    if (!examBodyId) {
      return res.status(400).json({ message: "examBodyId query parameter is required" });
    }

    // Get categories for this exam body that have subjects with questions
    const categoriesList = await db
      .select({
        id: categories.id,
        name: categories.name,
        examBodyId: categories.examBodyId,
      })
      .from(categories)
      .where(eq(categories.examBodyId, examBodyId as string))
      .orderBy(categories.name);

    return res.json(categoriesList);
  } catch (err) {
    console.error("Error fetching categories:", err);
    return res.status(500).json({ message: "Failed to fetch categories", error: String(err) });
  }
});

// Get available subjects from question bank (subjects that have actual questions)
router.get("/available-subjects", async (req: Request, res: Response) => {
  try {
    // Get distinct subjects that have live questions in the question bank
    const availableSubjects = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        examBodyId: subjects.examBodyId,
        examBodyName: examBodies.name,
        questionCount: sql<number>`count(${questions.id})`.as('question_count')
      })
      .from(subjects)
      .innerJoin(questions, and(
        eq(questions.subjectId, subjects.id),
        eq(questions.status, "live")
      ))
      .innerJoin(examBodies, eq(subjects.examBodyId, examBodies.id))
      .groupBy(subjects.id, subjects.name, subjects.examBodyId, examBodies.name)
      .having(sql`count(${questions.id}) > 0`)
      .orderBy(sql`count(${questions.id}) DESC`);

    return res.json(availableSubjects);
  } catch (err) {
    console.error("Error fetching available subjects:", err);
    return res.status(500).json({ message: "Failed to fetch available subjects", error: String(err) });
  }
});

// Quick practice - randomly select exam body for a subject
router.post("/quick-practice/generate", async (req: Request, res: Response) => {
  try {
    const { subjectName, questionCount = 15, supabaseId } = req.body;

    if (!subjectName) {
      return res.status(400).json({ message: "subjectName is required" });
    }

    // Find subjects with this name that have questions
    const matchingSubjects = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        examBodyId: subjects.examBodyId,
        examBodyName: examBodies.name,
        questionCount: sql<number>`count(${questions.id})`.as('question_count')
      })
      .from(subjects)
      .innerJoin(questions, and(
        eq(questions.subjectId, subjects.id),
        eq(questions.status, "live")
      ))
      .innerJoin(examBodies, eq(subjects.examBodyId, examBodies.id))
      .where(ilike(subjects.name, `%${subjectName}%`))
      .groupBy(subjects.id, subjects.name, subjects.examBodyId, examBodies.name)
      .having(sql`count(${questions.id}) > 0`);

    if (matchingSubjects.length === 0) {
      return res.status(404).json({
        message: `No questions available for ${subjectName}. Please try another subject.`
      });
    }

    // Randomly select one of the matching subjects (random exam body)
    const randomIndex = Math.floor(Math.random() * matchingSubjects.length);
    const selectedSubject = matchingSubjects[randomIndex];

    // Get user plan for explanation access control
    let userPlan: "basic" | "standard" | "premium" = "basic";
    if (supabaseId) {
      const userRecords = await db
        .select()
        .from(users)
        .where(eq(users.supabaseId, supabaseId as string))
        .limit(1);

      if (userRecords.length > 0) {
        const subscriptionRecords = await db
          .select()
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.userId, userRecords[0].id),
              eq(subscriptions.status, "active")
            )
          )
          .orderBy(desc(subscriptions.createdAt))
          .limit(1);

        if (subscriptionRecords.length > 0) {
          userPlan = (subscriptionRecords[0].plan || "basic") as "basic" | "standard" | "premium";
        }
      }
    }

    // Get random questions for this subject
    const questionCountNum = Math.min(Number(questionCount), 50);

    const selectedQuestions = await db
      .select()
      .from(questions)
      .where(and(
        eq(questions.subjectId, selectedSubject.id),
        eq(questions.status, "live")
      ))
      .orderBy(sql`RANDOM()`)
      .limit(questionCountNum);

    if (selectedQuestions.length === 0) {
      return res.status(404).json({
        message: `No questions available for ${subjectName}`
      });
    }

    // Format questions with options
    const formattedQuestions = await Promise.all(
      selectedQuestions.map(async (q) => {
        let options = q.options;

        // Try to get options from questionOptions table
        const dbOptions = await db
          .select()
          .from(questionOptions)
          .where(eq(questionOptions.questionId, q.id))
          .orderBy(questionOptions.order);

        if (dbOptions.length > 0) {
          options = dbOptions.map(opt => ({
            id: opt.optionId,
            text: opt.text
          }));
        }

        // Find correct answer
        const correctOption = dbOptions.find(opt => opt.isCorrect);

        return {
          id: q.id,
          text: q.text,
          options: options || [],
          correctAnswer: correctOption?.optionId || null,
          // @ts-ignore
          explanation: (userPlan === "standard" || userPlan === "premium")
            // @ts-ignore
            ? (q.briefExplanation || q.explanation || null)
            : null,
          subject: selectedSubject.name,
          topic: q.topic || null,
          year: q.year || null,
        };
      })
    );

    return res.json({
      questions: formattedQuestions,
      subject: selectedSubject.name,
      examBody: selectedSubject.examBodyName,
      examBodyId: selectedSubject.examBodyId,
      totalQuestions: formattedQuestions.length,
    });
  } catch (err) {
    console.error("Error generating quick practice:", err);
    return res.status(500).json({ message: "Failed to generate quick practice", error: String(err) });
  }
});

// Get exam catalog with question counts
router.get("/exams/catalog", async (_req: Request, res: Response) => {
  try {
    const bodies = await db.select().from(examBodies);

    const catalog = await Promise.all(
      bodies.map(async (body) => {
        // Count total questions for this exam body
        const questionCountResult = await db
          .select({ count: count() })
          .from(questions)
          .where(and(
            eq(questions.examBodyId, body.id),
            eq(questions.status, "live")
          ));

        const questionCount = questionCountResult[0]?.count || 0;

        // Categories are the supported grouping (tracks removed)
        const categoriesList = await db
          .select()
          .from(categories)
          .where(eq(categories.examBodyId, body.id));

        const categoriesWithCounts = await Promise.all(
          categoriesList.map(async (category) => {
            const catQuestionCountResult = await db
              .select({ count: count() })
              .from(questions)
              .innerJoin(subjects, eq(questions.subjectId, subjects.id))
              .where(and(
                eq(questions.examBodyId, body.id),
                eq(questions.status, "live"),
                eq(subjects.categoryId, category.id)
              ));

            return {
              ...category,
              questionCount: catQuestionCountResult[0]?.count || 0,
            };
          })
        );

        return {
          id: body.id,
          name: body.name,
          questionCount,
          categories: categoriesWithCounts,
        };
      })
    );

    return res.json({ examBodies: catalog });
  } catch (err) {
    console.error("Error fetching exam catalog:", err);
    return res.status(500).json({ message: "Failed to fetch exam catalog", error: String(err) });
  }
});

// Generate a random exam based on body, subject, and question count
router.post("/exams/generate", examGenerationLimiter, async (req: Request, res: Response) => {
  try {
    const { body, questionCount = 50, supabaseId } = req.body;

    if (!body) {
      return res.status(400).json({ message: "body is required" });
    }

    // If user is authenticated, check plan restrictions
    let userPlan = "basic";
    let userId: string | null = null;
    let preferredExamBody: string | null = null;

    if (supabaseId) {
      const userRecords = await db
        .select()
        .from(users)
        .where(eq(users.supabaseId, supabaseId as string))
        .limit(1);

      if (userRecords.length > 0) {
        const user = userRecords[0];
        userId = user.id;
        preferredExamBody = user.preferredExamBody;

        // Get subscription
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

        if (subscriptionRecords.length > 0) {
          userPlan = subscriptionRecords[0].plan || "basic";
        }

        // For Basic plan: Check exam body restriction
        // Allow exam generation even if preferredExamBody is not set yet (user can select during generation)
        // But if it's set, enforce the restriction
        if (userPlan === "basic") {
          // If preferredExamBody is set, enforce it
          if (preferredExamBody && body !== preferredExamBody) {
            return res.status(403).json({
              message: `Basic plan allows access to ${preferredExamBody} only. Upgrade to Standard or Premium to access both WAEC and JAMB.`,
              requiresUpgrade: true
            });
          }
          // If not set, allow the exam generation but suggest setting it
          // The frontend will handle showing the dialog
        }

        // Check limits using ExamLimitService
        const limitCheck = await ExamLimitService.checkGenerationLimit(user.id);
        if (!limitCheck.allowed) {
          return res.status(403).json({
            message: limitCheck.reason,
            requiresUpgrade: true,
            limit: limitCheck.limit,
            currentUsage: limitCheck.currentUsage
          });
        }

        // Check question count limits for Basic plan
        if (userPlan === "basic" && questionCount > 50) {
          return res.status(403).json({
            message: "Basic plan allows maximum 50 questions per exam. Upgrade to Standard or Premium for more questions.",
            requiresUpgrade: true,
            maxQuestions: 50
          });
        }
      }
    }

    // Find exam body
    const bodyRecords = await db.select().from(examBodies).where(eq(examBodies.name, body as string));
    if (bodyRecords.length === 0) {
      return res.status(404).json({ message: "Exam body not found" });
    }
    const bodyId = bodyRecords[0].id;

    // Get subjects directly for this exam body (simplified approach)
    const subjectsList = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        description: subjects.description,
        isActive: subjects.isActive,
        createdAt: subjects.createdAt,
        updatedAt: subjects.updatedAt
      })
      .from(subjects)
      .where(eq(subjects.examBodyId, bodyId));

    if (subjectsList.length === 0) {
      return res.status(404).json({ message: "No subjects available for this exam body" });
    }

    // Check total available questions first
    const totalAvailable = await db
      .select({ count: sql<number>`count(*)` })
      .from(questions)
      .where(and(
        eq(questions.examBodyId, bodyId),
        eq(questions.status, "live")
      ));

    if (Number(totalAvailable[0]?.count || 0) === 0) {
      return res.status(404).json({ message: "No questions available for this selection" });
    }

    // Calculate questions per subject (even distribution)
    const totalQuestions = Number(questionCount);
    const numSubjects = subjectsList.length;
    const questionsPerSubject = Math.floor(totalQuestions / numSubjects);
    const remainder = totalQuestions % numSubjects;

    // Select questions evenly from each subject using database-level random sampling
    const selectedQuestions: any[] = [];
    for (let i = 0; i < subjectsList.length; i++) {
      const subject = subjectsList[i];

      // Add one extra question for first 'remainder' subjects to account for division remainder
      const countForThisSubject = questionsPerSubject + (i < remainder ? 1 : 0);

      // Use database-level random sampling for better performance
      const subjectSelected = await db
        .select()
        .from(questions)
        .where(
          and(
            eq(questions.examBodyId, bodyId),
            eq(questions.subjectId, subject.id),
            eq(questions.status, "live")
          )
        )
        .orderBy(sql`RANDOM()`)
        .limit(countForThisSubject);

      selectedQuestions.push(...subjectSelected);
    }

    // If we still need more questions (due to some subjects having fewer questions), fill from remaining
    if (selectedQuestions.length < totalQuestions) {
      const selectedIds = selectedQuestions.map((q) => q.id);
      const needed = totalQuestions - selectedQuestions.length;

      const additionalWhereClauses = [
        eq(questions.examBodyId, bodyId),
        eq(questions.status, "live"),
      ];

      // Only add NOT IN when we actually have selected IDs to avoid NOT IN ()
      if (selectedIds.length > 0) {
        additionalWhereClauses.push(
          sql`${questions.id} NOT IN ${sql.raw(`(${selectedIds.map((id) => `'${id}'`).join(",")})`)}`
        );
      }

      const additionalQuestions = await db
        .select()
        .from(questions)
        .where(and(...additionalWhereClauses))
        .orderBy(sql`RANDOM()`)
        .limit(needed);

      selectedQuestions.push(...additionalQuestions);
    }

    // Final shuffle to mix subjects (done in memory since we have a reasonable number now)
    const finalShuffled = [...selectedQuestions].sort(() => Math.random() - 0.5);
    const questionIds = finalShuffled.map(q => q.id);

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const examTitle = `${body} Practice Test - ${selectedQuestions.length} Questions`;

    // Format questions using shared utility with subscription-based explanation access
    // Fetch options for each question from questionOptions table
    const formattedQuestions = await Promise.all(
      finalShuffled.map(async (q) => {
        let options = q.options;

        // Try to get options from questionOptions table
        const dbOptions = await db
          .select()
          .from(questionOptions)
          .where(eq(questionOptions.questionId, q.id))
          .orderBy(questionOptions.order);

        if (dbOptions.length > 0) {
          options = dbOptions.map(opt => ({
            id: opt.optionId,
            text: opt.text,
            isCorrect: opt.isCorrect
          }));
        }

        // @ts-ignore
        const formatted = formatQuestion({ ...q, options }, userPlan as "basic" | "standard" | "premium");

        // Ensure options are preserved if formatQuestion returns empty (it shouldn't if we pass them)
        return {
          ...formatted,
          options: formatted.options.length > 0 ? formatted.options : (options as any)
        };
      })
    );

    // Create new exam using break-proof insertion
    // Use first subject name or "Mixed" for the required subject column
    const subjectName = subjectsList.length === 1 ? subjectsList[0].name : "Mixed Subjects";
    const exam = await safeInsertExam({
      id: `exam-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: examTitle,
      body: body as string, // Required: exam body name (WAEC, JAMB, etc.)
      examBodyId: bodyId,
      subject: subjectName,
      subcategory: subjectsList.length === 1 ? subjectsList[0].name : "Mixed", // Required column
      trackId: null,
      selectedSubjects: subjectsList.map(s => ({ id: s.id, name: s.name })),
      questionIds,
      duration: 3600, // 60 minutes in seconds
      durationMinutes: 60,
      totalQuestions: selectedQuestions.length,
      totalMarks: selectedQuestions.length,
      // Additional required database columns
      question_count: selectedQuestions.length,
      marks: selectedQuestions.length,
      exam_type: "Practice",
      exam_year: new Date().getFullYear(),
      exam_month: new Date().getMonth() + 1,
      exam_day: new Date().getDate(),
      time_limit: 60, // minutes
      instructions: "Answer all questions to the best of your ability.",
      createdBy: userId,
      isPractice: true,
      isRandomized: true,
      status: "published",
    });

    // Increment daily quota
    if (userId) {
      await ExamLimitService.incrementDailyQuota(userId);
    }

    // Return exam with formatted questions
    return res.json({ ...exam, questions: formattedQuestions });
  } catch (err: any) {
    console.error("Error generating exam:", err);
    return res.status(500).json({ message: "Failed to generate exam", error: err.message || String(err) });
  }
});

// Practice test endpoint - 3 questions per subject, no registration required
router.post("/practice-test/generate", practiceTestLimiter, async (req: Request, res: Response) => {
  try {
    const { examBodyId, examTypeId, trackId } = req.body;

    if (!examBodyId) {
      return res.status(400).json({ message: "examBodyId is required" });
    }

    // Validate exam body exists (handle both ID and name)
    let bodyId = examBodyId;
    const bodyRecords = await db
      .select()
      .from(examBodies)
      .where(
        or(
          eq(examBodies.id, examBodyId as string),
          eq(examBodies.name, examBodyId as string)
        )
      )
      .limit(1);

    if (bodyRecords.length === 0) {
      return res.status(404).json({ message: "Exam body not found" });
    }
    bodyId = bodyRecords[0].id;

    // For practice tests, use a simple direct query approach for better reliability
    // This ensures first-time users can always get questions if any exist
    let selectedQuestions: any[] = [];

    // Try to get questions directly from the database
    // First, try
    // Get subjects directly (track_subjects table was removed)
    let subjectIds: string[] = [];
    if (trackId) {
      // trackId is treated as categoryId (tracks removed)
      const subjectRecords = await db
        .select({ id: subjects.id })
        .from(subjects)
        .where(and(eq(subjects.examBodyId, bodyId), eq(subjects.categoryId, trackId as string)));
      subjectIds = subjectRecords.map(m => m.id);
    } else {
      const subjectRecords = await db
        .select({ id: subjects.id })
        .from(subjects)
        .where(eq(subjects.examBodyId, bodyId));
      subjectIds = subjectRecords.map(m => m.id);
    }

    // Build query conditions
    const conditions = [
      eq(questions.examBodyId, bodyId),
      eq(questions.status, "live")
    ];

    // Add subject filter if we have subjects
    if (subjectIds.length > 0) {
      conditions.push(inArray(questions.subjectId, subjectIds));
    }

    // Add exam type filter if specified (now optional - Categories are primary)
    if (examTypeId) {
      conditions.push(eq(questions.examTypeId, examTypeId as string));
    } else {
      // Include questions with or without examTypeId (null or any value)
      // This allows the simplified structure to work
    }

    // Get questions directly from database with subject join (more reliable than filterQuestions for practice tests)
    // Select all question fields and add subject name
    const availableQuestionsRaw = await db
      .select()
      .from(questions)
      .innerJoin(subjects, eq(questions.subjectId, subjects.id))
      .where(and(...conditions))
      .orderBy(sql`RANDOM()`)
      .limit(50);

    // Get correct answers for all questions
    const questionIds = availableQuestionsRaw.map((row: any) => row.questions.id);
    const correctAnswers = await db
      .select({
        questionId: questionOptions.questionId,
        correctOptionId: questionOptions.optionId
      })
      .from(questionOptions)
      .where(and(
        inArray(questionOptions.questionId, questionIds),
        eq(questionOptions.isCorrect, true)
      ));

    // Create a map of questionId -> correctOptionId
    const correctAnswerMap = new Map();
    correctAnswers.forEach(ca => {
      correctAnswerMap.set(ca.questionId, ca.correctOptionId);
    });

    // Map to include subject name and correct answer
    const availableQuestions = availableQuestionsRaw.map((row: any) => {
      const question = row.questions;
      const correctOptionId = correctAnswerMap.get(question.id);

      // Add isCorrect flag to options
      const options = question.options?.map((opt: any) => ({
        ...opt,
        isCorrect: opt.id === correctOptionId
      })) || [];

      return {
        ...question,
        subject: row.subjects.name,
        options,
        correctAnswer: correctOptionId
      };
    });


    if (availableQuestions.length === 0) {
      // Fallback: try without subject filter (in case no subjects exist for this exam body)
      const fallbackQuestionsRaw = await db
        .select()
        .from(questions)
        .innerJoin(subjects, eq(questions.subjectId, subjects.id))
        .where(
          and(
            eq(questions.examBodyId, bodyId),
            eq(questions.status, "live")
          )
        )
        .orderBy(sql`RANDOM()`)
        .limit(50);

      // Get correct answers for fallback questions
      const fallbackQuestionIds = fallbackQuestionsRaw.map((row: any) => row.questions.id);
      const fallbackCorrectAnswers = await db
        .select({
          questionId: questionOptions.questionId,
          correctOptionId: questionOptions.optionId
        })
        .from(questionOptions)
        .where(and(
          inArray(questionOptions.questionId, fallbackQuestionIds),
          eq(questionOptions.isCorrect, true)
        ));

      // Create a map of questionId -> correctOptionId
      const fallbackCorrectAnswerMap = new Map();
      fallbackCorrectAnswers.forEach(ca => {
        fallbackCorrectAnswerMap.set(ca.questionId, ca.correctOptionId);
      });

      // Map to include subject name and correct answer
      const fallbackQuestions = fallbackQuestionsRaw.map((row: any) => {
        const question = row.questions;
        const correctOptionId = fallbackCorrectAnswerMap.get(question.id);

        // Add isCorrect flag to options
        const options = question.options?.map((opt: any) => ({
          ...opt,
          isCorrect: opt.id === correctOptionId
        })) || [];

        return {
          ...question,
          subject: row.subjects.name,
          options,
          correctAnswer: correctOptionId
        };
      });

      if (fallbackQuestions.length === 0) {
        return res.status(404).json({
          message: "No questions available for this exam body. Please try a different exam body or contact support."
        });
      }

      selectedQuestions = fallbackQuestions;
    } else {
      selectedQuestions = availableQuestions;
    }

    // Select 5 questions for practice test
    const questionCount = 5;
    const shuffled = [...selectedQuestions].sort(() => Math.random() - 0.5);
    const finalQuestions = shuffled.slice(0, questionCount);

    if (finalQuestions.length === 0) {
      return res.status(404).json({ message: "No questions available for the selected criteria" });
    }

    // Fetch options for each question from questionOptions table
    const questionsWithOptions = await Promise.all(
      finalQuestions.map(async (q: any) => {
        let options = q.options;

        // Try to get options from questionOptions table
        const dbOptions = await db
          .select()
          .from(questionOptions)
          .where(eq(questionOptions.questionId, q.id))
          .orderBy(questionOptions.order);

        if (dbOptions.length > 0) {
          options = dbOptions.map(opt => ({
            id: opt.optionId,
            text: opt.text,
            isCorrect: opt.isCorrect
          }));
        } else if (!Array.isArray(options)) {
          // Fallback to JSONB parsing if needed
          try {
            options = typeof options === "string" ? JSON.parse(options) : [];
          } catch {
            options = [];
          }
        }

        // Final check for placeholders (if still empty)
        if (!options || (Array.isArray(options) && options.length === 0)) {
          console.warn(`No options found for question ${q.id}, using placeholders`);
          options = [
            { id: "A", text: "Option A", isCorrect: false },
            { id: "B", text: "Option B", isCorrect: false },
            { id: "C", text: "Option C", isCorrect: false },
            { id: "D", text: "Option D", isCorrect: false }
          ];
        }

        return {
          ...q,
          options,
          correctAnswer: q.correctAnswer || (Array.isArray(options) && options[0]?.id) || "A"
        };
      })
    );

    // Format questions using shared utility (no subscription check for practice test - free tier)
    // Pass options directly since we've already formatted them
    const formattedQuestions = questionsWithOptions.map((q) => {
      const formatted = formatQuestion(q, "basic");
      // Ensure options are included (formatQuestion might have issues, so override if needed)
      return {
        ...formatted,
        options: q.options && q.options.length > 0
          ? q.options.map((opt: any) => ({
            id: opt.id || opt.optionId,
            text: opt.text || opt.content || String(opt)
          }))
          : formatted.options
      };
    });

    return res.json({
      questions: formattedQuestions,
      metadata: {
        totalAvailable: selectedQuestions.length,
        selectedCount: formattedQuestions.length
      }
    });
  } catch (err: any) {
    console.error("Error generating practice test:", err);
    return res.status(500).json({ message: "Failed to generate practice test", error: err.message || String(err) });
  }
});

// Get all available exams (for testing/listing)
router.get("/exams/all", async (_req: Request, res: Response) => {
  try {
    const examRecords = await safeSelectExams();
    return res.json(examRecords);
  } catch (err: any) {
    console.error("Error fetching exams:", err);
    return res.status(500).json({
      message: "Failed to fetch exams",
      error: err.message || String(err)
    });
  }
});

// Get a single question (for practice test scoring)
router.get("/questions/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const questionRecords = await db
      .select()
      .from(questions)
      .where(eq(questions.id, id))
      .limit(1);

    if (questionRecords.length === 0) {
      return res.status(404).json({ message: "Question not found" });
    }

    const question = questionRecords[0];
    const correctOption = await db
      .select({ optionId: questionOptions.optionId })
      .from(questionOptions)
      .where(and(eq(questionOptions.questionId, id), eq(questionOptions.isCorrect, true)))
      .limit(1);

    return res.json({
      id: question.id,
      correctAnswer: correctOption[0]?.optionId || null,
      // @ts-ignore
      explanation: question.explanation,
    });
  } catch (err: any) {
    console.error("Error fetching question:", err);
    return res.status(500).json({ message: "Failed to fetch question", error: err.message || String(err) });
  }
});

// Get questions for an exam (for offline download - requires Standard/Premium)
router.get("/questions", async (req: Request, res: Response) => {
  try {
    const { examId, supabaseId } = req.query;
    if (process.env.NODE_ENV === 'development') console.log(`[GET QUESTIONS] Fetching questions for exam: ${examId}`);

    if (!examId) {
      return res.status(400).json({ message: "examId query parameter is required" });
    }

    // Get user plan if supabaseId provided (for plan-based formatting)
    let userPlan: "basic" | "standard" | "premium" = "basic";
    if (supabaseId) {
      try {
        const userRecords = await db
          .select()
          .from(users)
          .where(eq(users.supabaseId, supabaseId as string))
          .limit(1);

        if (userRecords.length > 0) {
          const user = userRecords[0];
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

          if (subscriptionRecords.length > 0) {
            userPlan = subscriptionRecords[0].plan || "basic";
          }
        }
      } catch (err) {
        console.error("Error fetching user plan:", err);
        // Default to basic if error
      }
    }

    // Get exam
    if (process.env.NODE_ENV === 'development') console.log(`[GET QUESTIONS] Looking up exam in database: ${examId}`);
    const examRecords = await db.select().from(exams).where(eq(exams.id, examId as string));
    if (examRecords.length === 0) {
      if (process.env.NODE_ENV === 'development') console.error(`[GET QUESTIONS] Exam not found: ${examId}`);
      return res.status(404).json({ message: "Exam not found" });
    }

    const exam = examRecords[0];
    if (process.env.NODE_ENV === 'development') console.log(`[GET QUESTIONS] Found exam: ${exam.title}, questionIds count: ${exam.questionIds?.length || 0}`);

    // Get questions
    if (!exam.questionIds || exam.questionIds.length === 0) {
      if (process.env.NODE_ENV === 'development') console.warn(`[GET QUESTIONS] Exam ${examId} has no questionIds`);
      return res.json({ questions: [], title: exam.title });
    }

    const questionRecords = await db
      .select()
      .from(questions)
      .where(inArray(questions.id, exam.questionIds));

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

    // Format questions using shared utility with subscription-based explanation access
    const formattedQuestions = await Promise.all(
      questionRecords.map(async (q) => {
        let options = q.options;

        const dbOptions = await db
          .select()
          .from(questionOptions)
          .where(eq(questionOptions.questionId, q.id))
          .orderBy(questionOptions.order);

        if (dbOptions.length > 0) {
          options = dbOptions.map(opt => ({
            id: opt.optionId,
            text: opt.text,
            isCorrect: opt.isCorrect
          }));
        }

        // @ts-ignore
        const formatted = formatQuestion({ ...q, options }, userPlan);

        return {
          ...formatted,
          options: formatted.options.length > 0 ? formatted.options : (options as any)
        };
      })
    );

    return res.json({ questions: formattedQuestions, title: exam.title });
  } catch (err: any) {
    console.error("Error fetching questions:", err);
    return res.status(500).json({ message: "Failed to fetch questions", error: err.message || String(err) });
  }
});

// Practice mode - Generate subject/topic-specific practice questions
router.post("/practice/generate", async (req: Request, res: Response) => {
  try {
    const { examBodyId, categoryId, subjectId, topicId, questionCount = 15, supabaseId } = req.body;

    if (!examBodyId || !subjectId) {
      return res.status(400).json({ message: "examBodyId and subjectId are required" });
    }

    // Get the subject
    const subjectRecords = await db
      .select()
      .from(subjects)
      .where(and(
        eq(subjects.id, subjectId as string),
        eq(subjects.examBodyId, examBodyId as string)
      ))
      .limit(1);

    if (subjectRecords.length === 0) {
      return res.status(404).json({ message: "Subject not found for this exam body. Please select a valid subject." });
    }

    const subject = subjectRecords[0];

    // Get user and check tier limits
    let userPlan: "basic" | "standard" | "premium" = "basic";
    let userId: string | null = null;

    if (supabaseId) {
      const userRecords = await db
        .select()
        .from(users)
        .where(eq(users.supabaseId, supabaseId as string))
        .limit(1);

      if (userRecords.length > 0) {
        userId = userRecords[0].id;
        const subscriptionRecords = await db
          .select()
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.userId, userRecords[0].id),
              eq(subscriptions.status, "active")
            )
          )
          .orderBy(desc(subscriptions.createdAt))
          .limit(1);

        if (subscriptionRecords.length > 0) {
          userPlan = (subscriptionRecords[0].plan || "basic") as "basic" | "standard" | "premium";
        }
      }
    }

    // Enforce tier limits (Basic: 10/mo, Standard: 50/mo, Premium: unlimited)
    const tierLimits: Record<string, number | null> = {
      basic: 10,
      standard: 50,
      premium: null, // unlimited
    };

    const monthlyLimit = tierLimits[userPlan];

    if (monthlyLimit !== null && userId) {
      // Count practice sessions this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyAttempts = await db
        .select({ count: count() })
        .from(attempts)
        .where(and(
          eq(attempts.userId, userId),
          gte(attempts.createdAt, startOfMonth)
        ));

      const currentCount = monthlyAttempts[0]?.count || 0;

      if (currentCount >= monthlyLimit) {
        return res.status(403).json({
          message: `Monthly practice limit reached (${monthlyLimit} sessions). Upgrade your plan for more practice sessions.`,
          currentUsage: currentCount,
          limit: monthlyLimit,
          plan: userPlan
        });
      }
    }

    // Build query conditions - ensure questions are from the question bank
    const conditions = [
      eq(questions.examBodyId, examBodyId as string),
      eq(questions.subjectId, subjectId as string),
      eq(questions.status, "live")
    ];

    // Add topic filter if provided
    if (topicId) {
      conditions.push(eq(questions.topic, topicId as string));
    }

    // Use database-level random sampling for better performance
    // This is more efficient than loading all questions and shuffling in memory
    const questionCountNum = Math.min(Number(questionCount), 1000); // Cap at 1000 for safety

    const selectedQuestions = await db
      .select()
      .from(questions)
      .where(and(...conditions))
      .orderBy(sql`RANDOM()`)
      .limit(questionCountNum);

    if (selectedQuestions.length === 0) {
      return res.status(404).json({
        message: topicId
          ? "No questions available for this topic"
          : "No questions available for this subject"
      });
    }

    // Format questions using shared utility with subscription-based explanation access
    // Fetch options for each question from questionOptions table
    const formattedQuestions = await Promise.all(
      selectedQuestions.map(async (q) => {
        let options = q.options;

        // Try to get options from questionOptions table
        const dbOptions = await db
          .select()
          .from(questionOptions)
          .where(eq(questionOptions.questionId, q.id))
          .orderBy(questionOptions.order);

        if (dbOptions.length > 0) {
          options = dbOptions.map(opt => ({
            id: opt.optionId,
            text: opt.text,
            isCorrect: opt.isCorrect
          }));
        }

        // @ts-ignore
        const formatted = formatQuestion({ ...q, options }, userPlan);

        // Ensure options are preserved
        return {
          ...formatted,
          options: formatted.options.length > 0 ? formatted.options : (options as any)
        };
      })
    );

    return res.json({
      questions: formattedQuestions,
      subject: subject.name,
      topic: topicId || null,
      questionCount: formattedQuestions.length,
    });
  } catch (err: any) {
    console.error("Error generating practice:", err);
    return res.status(500).json({ message: "Failed to generate practice", error: err.message || String(err) });
  }
});

// Get subjects for an exam body (for practice center)
// Only returns subjects that have live questions in the database
router.get("/subjects", async (req: Request, res: Response) => {
  try {
    const { examBodyId, categoryId } = req.query;

    if (!examBodyId) {
      return res.status(400).json({ message: "examBodyId query parameter is required" });
    }

    // Only return subjects that have live questions in the question bank
    let subjectsList;
    if (categoryId) {
      // Get subjects for this category that have questions
      subjectsList = await db
        .select({
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          description: subjects.description,
          isActive: subjects.isActive,
          categoryId: subjects.categoryId,
          examBodyId: subjects.examBodyId,
          questionCount: sql<number>`count(${questions.id})`.as('question_count')
        })
        .from(subjects)
        .leftJoin(questions, and(
          eq(questions.subjectId, subjects.id),
          eq(questions.status, "live")
        ))
        .where(and(
          eq(subjects.examBodyId, examBodyId as string),
          eq(subjects.categoryId, categoryId as string)
        ))
        .groupBy(subjects.id, subjects.name, subjects.code, subjects.description, subjects.isActive, subjects.categoryId, subjects.examBodyId)
        .having(sql`count(${questions.id}) > 0`);

    } else {
      // Get all subjects for this exam body that have questions
      subjectsList = await db
        .select({
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          description: subjects.description,
          isActive: subjects.isActive,
          categoryId: subjects.categoryId,
          examBodyId: subjects.examBodyId,
          questionCount: sql<number>`count(${questions.id})`.as('question_count')
        })
        .from(subjects)
        .leftJoin(questions, and(
          eq(questions.subjectId, subjects.id),
          eq(questions.status, "live")
        ))
        .where(eq(subjects.examBodyId, examBodyId as string))
        .groupBy(subjects.id, subjects.name, subjects.code, subjects.description, subjects.isActive, subjects.categoryId, subjects.examBodyId)
        .having(sql`count(${questions.id}) > 0`);
    }
    return res.json(subjectsList);
  } catch (err) {
    console.error("Error fetching subjects:", err);
    return res.status(500).json({ message: "Failed to fetch subjects", error: String(err) });
  }
});

// Get all attempts
router.get("/attempts", async (_req: Request, res: Response) => {
  try {
    const attemptRecords = await db.select().from(attempts).orderBy(attempts.createdAt);
    return res.json(attemptRecords);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch attempts", error: String(err) });
  }
});

// QuestionBank CRUD endpoints

// Exam Bodies CRUD
router.get("/admin/exam-bodies", async (_req: Request, res: Response) => {
  try {
    const bodies = await db.select().from(examBodies);
    return res.json(bodies);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch exam bodies", error: String(err) });
  }
});

router.post("/admin/exam-bodies", async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }
    const [newBody] = await db.insert(examBodies).values({ name }).returning();
    return res.json(newBody);
  } catch (err) {
    return res.status(500).json({ message: "Failed to create exam body", error: String(err) });
  }
});

router.delete("/admin/exam-bodies/:id", async (req: Request, res: Response) => {
  try {
    await db.delete(examBodies).where(eq(examBodies.id, req.params.id));
    return res.json({ message: "Exam body deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete exam body", error: String(err) });
  }
});

// Subjects endpoint (simplified - direct query)
router.get("/admin/subjects", async (req: Request, res: Response) => {
  try {
    // Subjects are now directly queried (track_subjects table was removed)
    let subjectsList;
    const { categoryId, examBodyId } = req.query;
    if (categoryId) {
      // Get subjects for this category
      subjectsList = await db
        .select({
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          description: subjects.description,
          isActive: subjects.isActive,
          createdAt: subjects.createdAt,
          updatedAt: subjects.updatedAt,
          categoryId: subjects.categoryId,
          examBodyId: subjects.examBodyId
        })
        .from(subjects)
        .where(and(
          eq(subjects.examBodyId, examBodyId as string),
          eq(subjects.categoryId, categoryId as string)
        ));

    } else if (examBodyId) {
      // Get all subjects for this exam body directly
      subjectsList = await db
        .select({
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          description: subjects.description,
          examBodyId: subjects.examBodyId
        })
        .from(subjects)
        .where(eq(subjects.examBodyId, examBodyId as string));
    } else {
      // Get all subjects (neutral entities)
      subjectsList = await db
        .select({
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          description: subjects.description,
          isActive: subjects.isActive,
          createdAt: subjects.createdAt,
          updatedAt: subjects.updatedAt
        })
        .from(subjects)
        .orderBy(subjects.name);
    }
    return res.json(subjectsList);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch subjects", error: String(err) });
  }
});

// Note: Subject creation should use /api/admin/subjects (in admin.ts)
// This endpoint is kept for backward compatibility but should not be used
router.post("/admin/subjects", async (req: Request, res: Response) => {
  try {
    return res.status(400).json({
      message: "Please use /api/admin/subjects endpoint. Subjects are neutral entities and should not have categoryId or examBodyId directly."
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to create subject", error: String(err) });
  }
});

router.delete("/admin/subjects/:id", async (req: Request, res: Response) => {
  try {
    await db.delete(subjects).where(eq(subjects.id, req.params.id));
    return res.json({ message: "Subject deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete subject", error: String(err) });
  }
});

// Questions CRUD
router.get("/admin/questions", async (req: Request, res: Response) => {
  try {
    const { examBodyId, categoryId, subjectId } = req.query;
    let questionsList;
    const conditions = [];
    if (examBodyId) conditions.push(eq(questions.examBodyId, examBodyId as string));
    if (subjectId) conditions.push(eq(questions.subjectId, subjectId as string));

    if (conditions.length > 0) {
      questionsList = await db.select().from(questions).where(and(...conditions));
    } else {
      questionsList = await db.select().from(questions);
    }
    return res.json(questionsList);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch questions", error: String(err) });
  }
});

router.post("/admin/questions", async (req: Request, res: Response) => {
  try {
    const { text, options, correctAnswer, explanation, subject, year, topic, difficulty, examBodyId, categoryId, subjectId, status, createdBy } = req.body;
    if (!text || !options || !correctAnswer || !examBodyId || !categoryId || !subjectId) {
      return res.status(400).json({ message: "text, options, correctAnswer, examBodyId, categoryId, and subjectId are required" });
    }

    // Validate that examBodyId, categoryId, and subjectId exist
    const examBodyExists = await db.select().from(examBodies).where(eq(examBodies.id, examBodyId)).limit(1);
    if (examBodyExists.length === 0) {
      return res.status(400).json({ message: "Invalid examBodyId" });
    }

    const trackExists = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
    if (trackExists.length === 0) {
      return res.status(400).json({ message: "Invalid trackId" });
    }

    const subjectExists = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
    if (subjectExists.length === 0) {
      return res.status(400).json({ message: "Invalid subjectId" });
    }

    const [newQuestion] = await db.insert(questions).values({
      text,
      options,
      // correctAnswer removed from questions table
      // correctAnswer removed
      // explanation removed
      // subject removed (use subjectId)
      year: year || null,
      topic: topic || null,
      difficulty: difficulty || null,
      examBodyId,
      categoryId,
      subjectId,
      status: status || "live",
      createdBy: createdBy || "system",
    }).returning();

    // Insert options into question_options table
    if (options && Array.isArray(options) && options.length > 0) {
      const optionsToInsert = options.map((opt: any, index: number) => {
        const optionId = opt.id || opt.optionId || String.fromCharCode(65 + index);
        const optionText = opt.text || opt.content || String(opt);
        const isCorrect = String(optionId).toUpperCase() === String(correctAnswer).toUpperCase();

        return {
          questionId: newQuestion.id,
          optionId,
          text: optionText,
          order: index,
          isCorrect
        };
      });

      await db.insert(questionOptions).values(optionsToInsert);
    }

    return res.json(newQuestion);
  } catch (err: any) {
    console.error("Error creating question:", err);
    return res.status(500).json({ message: "Failed to create question", error: err.message || String(err) });
  }
});

router.delete("/admin/questions/:id", async (req: Request, res: Response) => {
  try {
    await db.delete(questions).where(eq(questions.id, req.params.id));
    return res.json({ message: "Question deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete question", error: String(err) });
  }
});

// Get performance analytics for a user
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

    // Get all completed attempts for this user
    const allAttempts = await db
      .select()
      .from(attempts)
      .where(
        and(
          eq(attempts.userId, user.id),
          eq(attempts.status, "completed")
        )
      )
      .orderBy(desc(attempts.completedAt))
      .limit(50); // Last 50 attempts

    if (allAttempts.length === 0) {
      return res.json({
        recentScores: [],
        averageScore: 0,
        scoreTrend: "stable",
        totalAttempts: 0,
        weakTopics: [],
        recentAverage: 0,
        previousAverage: 0,
      });
    }

    // Calculate scores for each attempt
    const attemptsWithScores = await Promise.all(
      allAttempts.map(async (attempt) => {
        // Get exam to get questions
        const examRecords = await db
          .select()
          .from(exams)
          .where(eq(exams.id, attempt.examId))
          .limit(1);

        if (examRecords.length === 0) {
          return { ...attempt, score: 0, percentage: 0 };
        }

        const exam = examRecords[0];
        if (!exam.questionIds || exam.questionIds.length === 0) {
          return { ...attempt, score: 0, percentage: 0 };
        }

        // Get questions and correct answers
        const questionRecords = await db
          .select()
          .from(questions)
          .where(inArray(questions.id, exam.questionIds));

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

        // Calculate score
        let correct = 0;
        const subjectScores: Record<string, { correct: number; total: number }> = {};

        questionRecords.forEach((q) => {
          const userAnswer = attempt.answers[q.id];
          const correctOptionId = correctAnswerMap.get(q.id);
          const isCorrect = userAnswer && correctOptionId && userAnswer === correctOptionId;
          if (isCorrect) {
            correct++;
          }

          // Track by subject
          // @ts-ignore
          const subject = q.subject || "Unknown";
          if (!subjectScores[subject]) {
            subjectScores[subject] = { correct: 0, total: 0 };
          }
          subjectScores[subject].total++;
          if (isCorrect) {
            subjectScores[subject].correct++;
          }
        });

        const totalQuestions = questionRecords.length;
        const score = correct;
        const percentage = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;

        return {
          ...attempt,
          score,
          percentage,
          totalQuestions,
          subjectScores,
        };
      })
    );

    // Get recent scores (last 5)
    const recentScores = attemptsWithScores.slice(0, 5).map((a) => ({
      percentage: a.percentage,
      date: a.completedAt ? new Date(a.completedAt) : new Date(a.createdAt || Date.now()),
    }));

    // Calculate averages
    const allPercentages = attemptsWithScores.map((a) => a.percentage);
    const averageScore = allPercentages.length > 0
      ? allPercentages.reduce((sum, p) => sum + p, 0) / allPercentages.length
      : 0;

    // Recent average (last 5) vs previous average (5 before that)
    const recentAverage = recentScores.length > 0
      ? recentScores.reduce((sum, s) => sum + s.percentage, 0) / recentScores.length
      : 0;

    const previousAttempts = attemptsWithScores.slice(5, 10);
    const previousAverage = previousAttempts.length > 0
      ? previousAttempts.reduce((sum, a) => sum + a.percentage, 0) / previousAttempts.length
      : 0;

    // Determine trend
    let scoreTrend: "improving" | "declining" | "stable" = "stable";
    if (recentAverage > previousAverage + 5) {
      scoreTrend = "improving";
    } else if (recentAverage < previousAverage - 5) {
      scoreTrend = "declining";
    }

    // Calculate weak topics (subjects with < 60% average)
    const subjectAverages: Record<string, { total: number; correct: number; percentage: number }> = {};
    attemptsWithScores.forEach((attempt: any) => {
      Object.entries(attempt.subjectScores || {}).forEach(([subject, data]: [string, any]) => {
        if (!subjectAverages[subject]) {
          subjectAverages[subject] = { total: 0, correct: 0, percentage: 0 };
        }
        subjectAverages[subject].total += data.total;
        subjectAverages[subject].correct += data.correct;
      });
    });

    Object.keys(subjectAverages).forEach((subject) => {
      const data = subjectAverages[subject];
      data.percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
    });

    const weakTopics = Object.entries(subjectAverages)
      .filter(([_, data]) => data.percentage < 60)
      .sort(([_, a], [__, b]) => a.percentage - b.percentage)
      .slice(0, 5)
      .map(([subject, data]) => ({
        subject,
        percentage: Math.round(data.percentage),
      }));

    return res.json({
      recentScores,
      averageScore: Math.round(averageScore * 100) / 100,
      scoreTrend,
      totalAttempts: allAttempts.length,
      weakTopics,
      recentAverage: Math.round(recentAverage * 100) / 100,
      previousAverage: Math.round(previousAverage * 100) / 100,
    });
  } catch (err: any) {
    console.error("Error fetching performance:", err);
    return res.status(500).json({ message: "Failed to fetch performance", error: err.message || String(err) });
  }
});

// Alias for legacy path /api/exams/stats -> /api/stats
router.get("/exams/stats", (req: Request, res: Response) => {
  const search = req.originalUrl.includes("?") ? req.originalUrl.substring(req.originalUrl.indexOf("?")) : "";
  return res.redirect(307, `/api/stats${search}`);
});

// Comprehensive analytics endpoint for student performance tracking
router.get("/analytics", async (req: Request, res: Response) => {
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
      return res.json({
        overallStats: { totalAttempts: 0, averageScore: 0, totalQuestionsAnswered: 0 },
        subjectPerformance: [],
        weakAreas: [],
        improvementTrends: { current7DayAvg: 0, previous7DayAvg: 0, trend: "stable" },
        recentActivity: [],
        recommendations: []
      });
    }

    const user = userRecords[0];

    // Get all completed attempts with their exam data
    const allAttempts = await db
      .select()
      .from(attempts)
      .where(and(
        eq(attempts.userId, user.id),
        eq(attempts.status, "completed")
      ))
      .orderBy(desc(attempts.completedAt))
      .limit(100);

    if (allAttempts.length === 0) {
      return res.json({
        overallStats: { totalAttempts: 0, averageScore: 0, totalQuestionsAnswered: 0 },
        subjectPerformance: [],
        weakAreas: [],
        improvementTrends: { current7DayAvg: 0, previous7DayAvg: 0, trend: "stable" },
        recentActivity: [],
        recommendations: []
      });
    }

    // Track per-subject performance
    const subjectStats: Record<string, {
      correct: number;
      total: number;
      attempts: number;
      recentScores: number[];
    }> = {};

    let totalCorrect = 0;
    let totalQuestions = 0;

    // Process each attempt
    for (const attempt of allAttempts) {
      const examRecords = await db
        .select()
        .from(exams)
        .where(eq(exams.id, attempt.examId))
        .limit(1);

      if (examRecords.length === 0 || !examRecords[0].questionIds?.length) continue;

      const exam = examRecords[0];
      const questionRecords = await db
        .select()
        .from(questions)
        .where(inArray(questions.id, exam.questionIds));

      // Get correct answers
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

      const correctAnswerMap = new Map();
      correctAnswers.forEach(ca => correctAnswerMap.set(ca.questionId, ca.correctOptionId));

      // Calculate per-question scores
      questionRecords.forEach((q) => {
        const userAnswer = attempt.answers?.[q.id];
        const correctOptionId = correctAnswerMap.get(q.id);
        const isCorrect = userAnswer && correctOptionId && userAnswer === correctOptionId;

        // @ts-ignore
        const subject = q.subject || "General";
        if (!subjectStats[subject]) {
          subjectStats[subject] = { correct: 0, total: 0, attempts: 0, recentScores: [] };
        }

        subjectStats[subject].total++;
        totalQuestions++;
        if (isCorrect) {
          subjectStats[subject].correct++;
          totalCorrect++;
        }
      });

      // Track attempt count per subject
      // @ts-ignore
      const subjectsInAttempt = new Set(questionRecords.map(q => q.subject || "General"));
      subjectsInAttempt.forEach(subject => {
        if (subjectStats[subject]) {
          subjectStats[subject].attempts++;
        }
      });
    }

    // Calculate subject performance with percentages
    const subjectPerformance = Object.entries(subjectStats)
      .map(([subject, data]) => ({
        subject,
        correct: data.correct,
        total: data.total,
        percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        attempts: data.attempts,
      }))
      .sort((a, b) => b.total - a.total);

    // Identify weak areas using sensible logic:
    // - Subjects with < 60% average score OR
    // - Subjects with > 3 attempts AND < 70% average score
    const weakAreas = subjectPerformance
      .filter(s => s.percentage < 60 || (s.attempts > 3 && s.percentage < 70))
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 5)
      .map(s => ({
        subject: s.subject,
        percentage: s.percentage,
        questionsAnswered: s.total,
        reason: s.percentage < 60
          ? "Below 60% average"
          : "Multiple attempts with low improvement"
      }));

    // Calculate improvement trends (current 7-day avg vs previous 7-day avg)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentAttempts = allAttempts.filter(a => {
      const date = a.completedAt ? new Date(a.completedAt) : new Date(a.createdAt || 0);
      return date >= sevenDaysAgo;
    });

    const previousAttempts = allAttempts.filter(a => {
      const date = a.completedAt ? new Date(a.completedAt) : new Date(a.createdAt || 0);
      return date >= fourteenDaysAgo && date < sevenDaysAgo;
    });

    const calculateAvgScore = (attemptsList: typeof allAttempts) => {
      if (attemptsList.length === 0) return 0;
      const scores = attemptsList.map(a => {
        // @ts-ignore
        const score = a.score || 0;
        const total = a.totalQuestions || 1;
        return (score / total) * 100;
      });
      return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
    };

    const current7DayAvg = calculateAvgScore(recentAttempts);
    const previous7DayAvg = calculateAvgScore(previousAttempts);

    let trend: "improving" | "declining" | "stable" = "stable";
    if (current7DayAvg > previous7DayAvg + 5) {
      trend = "improving";
    } else if (current7DayAvg < previous7DayAvg - 5) {
      trend = "declining";
    }

    // Generate recommendations based on performance
    const recommendations: string[] = [];

    if (weakAreas.length > 0) {
      recommendations.push(`Focus on improving ${weakAreas[0].subject} - currently at ${weakAreas[0].percentage}%`);
    }

    if (trend === "declining") {
      recommendations.push("Your recent scores are declining. Consider reviewing fundamentals.");
    } else if (trend === "improving") {
      recommendations.push("Great progress! Keep up the consistent practice.");
    }

    if (allAttempts.length < 5) {
      recommendations.push("Complete more practice sessions to get accurate performance insights.");
    }

    // Recent activity (last 10 attempts)
    const recentActivity = allAttempts.slice(0, 10).map(a => ({
      id: a.id,
      examId: a.examId,
      // @ts-ignore
      score: a.score || 0,
      totalQuestions: a.totalQuestions || 0,
      // @ts-ignore
      percentage: a.totalQuestions ? Math.round(((a.score || 0) / a.totalQuestions) * 100) : 0,
      date: a.completedAt || a.createdAt,
    }));

    return res.json({
      overallStats: {
        totalAttempts: allAttempts.length,
        averageScore: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
        totalQuestionsAnswered: totalQuestions,
      },
      subjectPerformance,
      weakAreas,
      improvementTrends: {
        current7DayAvg,
        previous7DayAvg,
        trend,
      },
      recentActivity,
      recommendations,
    });
  } catch (err: any) {
    console.error("Error fetching analytics:", err);
    return res.status(500).json({ message: "Failed to fetch analytics", error: err.message || String(err) });
  }
});

// Get practice session metrics for a user
router.get("/practice-sessions", async (req: Request, res: Response) => {
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
      return res.json({
        totalSessions: 0,
        averageScore: 0,
        recentSessions: []
      });
    }

    const user = userRecords[0];

    // Get completed practice attempts
    const practiceAttempts = await db
      .select()
      .from(attempts)
      .where(and(
        eq(attempts.userId, user.id),
        eq(attempts.status, "completed")
      ))
      .orderBy(desc(attempts.completedAt))
      .limit(50);

    // Calculate metrics - score needs to be calculated from answers
    const totalSessions = practiceAttempts.length;

    let totalPercentage = 0;
    const sessionsWithScores: Array<{
      id: string;
      examId: string;
      score: number;
      totalQuestions: number;
      percentage: number;
      date: any;
    }> = [];

    for (const attempt of practiceAttempts) {
      // Get exam to find questions
      const examRecords = await db
        .select()
        .from(exams)
        .where(eq(exams.id, attempt.examId))
        .limit(1);

      let score = 0;
      let total = attempt.totalQuestions || 0;

      if (examRecords.length > 0 && examRecords[0].questionIds?.length) {
        const exam = examRecords[0];
        total = exam.questionIds.length;

        // Get correct answers
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

        const correctAnswerMap = new Map();
        correctAnswers.forEach(ca => correctAnswerMap.set(ca.questionId, ca.correctOptionId));

        // Calculate score from answers
        const answers = attempt.answers || {};
        Object.entries(answers).forEach(([questionId, userAnswer]) => {
          const correctAnswer = correctAnswerMap.get(questionId);
          if (userAnswer === correctAnswer) {
            score++;
          }
        });
      }

      const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
      totalPercentage += percentage;

      sessionsWithScores.push({
        id: attempt.id,
        examId: attempt.examId,
        score,
        totalQuestions: total,
        percentage,
        date: attempt.completedAt || attempt.createdAt,
      });
    }

    const averageScore = totalSessions > 0 ? Math.round(totalPercentage / totalSessions) : 0;

    // Format recent sessions
    const recentSessions = sessionsWithScores.slice(0, 10).map(session => ({
      id: session.id,
      examId: session.examId,
      score: session.score,
      totalQuestions: session.totalQuestions,
      percentage: session.percentage,
      date: session.date,
    }));

    return res.json({
      totalSessions,
      averageScore,
      recentSessions
    });
  } catch (err: any) {
    console.error("Error fetching practice sessions:", err);
    return res.status(500).json({ message: "Failed to fetch practice sessions", error: err.message || String(err) });
  }
});

// Get detailed results for an attempt
router.get("/results/:attemptId", async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const attemptRecords = await db.select().from(attempts).where(eq(attempts.id, attemptId));
    if (attemptRecords.length === 0) {
      return res.status(404).json({ message: "Attempt not found" });
    }
    const attempt = attemptRecords[0];

    // Get exam to get questions
    const examRecords = await db.select().from(exams).where(eq(exams.id, attempt.examId));
    if (examRecords.length === 0) {
      return res.json({ attempt, questions: [] });
    }
    const exam = examRecords[0];

    // Get questions
    if (!exam.questionIds || exam.questionIds.length === 0) {
      return res.json({ attempt, questions: [] });
    }

    const questionRecords = await db
      .select()
      .from(questions)
      .where(inArray(questions.id, exam.questionIds));

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

    // Format questions with user answers
    const formattedQuestions = await Promise.all(
      questionRecords.map(async (q) => {
        const userAnswer = attempt.answers[q.id];
        const correctOptionId = correctAnswerMap.get(q.id);
        const isCorrect = userAnswer && correctOptionId && userAnswer === correctOptionId;

        if (userAnswer) {
          console.log(`[MARKING DEBUG] Question: ${q.id.substring(0, 8)}..., User: "${userAnswer}", Correct: "${correctOptionId}", Match: ${isCorrect}`);
        }

        let options = q.options;

        // Try to get options from questionOptions table
        const dbOptions = await db
          .select()
          .from(questionOptions)
          .where(eq(questionOptions.questionId, q.id))
          .orderBy(questionOptions.order);

        if (dbOptions.length > 0) {
          options = dbOptions.map(opt => ({
            id: opt.optionId,
            text: opt.text,
            isCorrect: opt.isCorrect
          }));
        } else if (!Array.isArray(options)) {
          // Fallback to JSONB parsing if needed
          try {
            options = typeof options === "string" ? JSON.parse(options) : [];
          } catch {
            options = [];
          }
        }

        const correctOption = dbOptions.find(opt => opt.optionId === correctOptionId);
        const correctAnswerDescription = correctOption
          ? `${correctOption.optionId}. ${correctOption.text}`
          : correctOptionId;

        return {
          id: q.id,
          q: q.text,
          options: options,
          yourAnswer: userAnswer ? `${userAnswer} (${isCorrect ? "Correct" : "Incorrect"})` : "Not answered",
          // @ts-ignore
          correctAnswer: correctAnswerDescription,
          correct: isCorrect,
          // @ts-ignore
          explanation: q.explanation,
        };
      })
    );

    return res.json({ attempt, questions: formattedQuestions });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch results", error: String(err) });
  }
});

// Admin routes moved to /server/routes/admin.ts

// Blog/Resources endpoints
router.get("/blog", async (req: Request, res: Response) => {
  try {
    const { category, featured, contentType, subject, examBodyId, limit = 50, search } = req.query;

    let conditions: any[] = [eq(blogPosts.published, true)];

    if (category && category !== "all") {
      conditions.push(eq(blogPosts.category, category as string));
    }

    if (featured === "true") {
      conditions.push(eq(blogPosts.featured, true));
    }

    if (contentType && contentType !== "all") {
      // @ts-ignore
      conditions.push(eq(blogPosts.contentType, contentType as string));
    }

    if (subject && subject !== "all") {
      conditions.push(eq(blogPosts.subject, subject as string));
    }

    if (examBodyId && examBodyId !== "all") {
      conditions.push(eq(blogPosts.examBodyId, examBodyId as string));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    let posts = await db
      .select()
      .from(blogPosts)
      .where(whereClause);

    // Search filter (client-side for now, can be moved to DB query if needed)
    if (search) {
      const searchLower = (search as string).toLowerCase();
      posts = posts.filter(post =>
        post.title.toLowerCase().includes(searchLower) ||
        post.content.toLowerCase().includes(searchLower) ||
        post.excerpt?.toLowerCase().includes(searchLower) ||
        (post.tags && Array.isArray(post.tags) && post.tags.some((tag: string) => tag.toLowerCase().includes(searchLower)))
      );
    }

    // Sort: Notices first (by priority desc), then by createdAt desc
    posts.sort((a, b) => {
      // If both are notices, sort by priority
      if (a.contentType === "notice" && b.contentType === "notice") {
        const priorityA = a.priority || 0;
        const priorityB = b.priority || 0;
        if (priorityA !== priorityB) {
          return priorityB - priorityA; // Higher priority first
        }
      }
      // Notices always come first
      if (a.contentType === "notice" && b.contentType !== "notice") {
        return -1;
      }
      if (a.contentType !== "notice" && b.contentType === "notice") {
        return 1;
      }
      // For non-notices or notices with same priority, sort by date
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA; // Newest first
    });

    // Apply limit after sorting
    posts = posts.slice(0, Number(limit));

    return res.json(posts);
  } catch (err: any) {
    console.error("Error fetching blog posts:", err);
    return res.status(500).json({ message: "Failed to fetch blog posts", error: err.message || String(err) });
  }
});

router.get("/blog/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ message: "Slug is required" });
    }

    // First, try to find the post with the exact slug
    let posts = await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.slug, slug), eq(blogPosts.published, true)))
      .limit(1);

    // If not found, log for debugging
    if (posts.length === 0) {
      // Check if it exists but is unpublished
      const unpublishedPost = await db
        .select()
        .from(blogPosts)
        .where(eq(blogPosts.slug, slug))
        .limit(1);

      if (unpublishedPost.length > 0) {
        console.error(`GET /api/blog/:slug - Resource found but is unpublished. Slug: "${slug}", ID: ${unpublishedPost[0].id}, Published: ${unpublishedPost[0].published}`);
        return res.status(404).json({
          message: "Resource not found or not published",
          slug,
          published: false
        });
      }

      // Check if slug exists at all
      const allPosts = await db
        .select({ slug: blogPosts.slug, id: blogPosts.id, title: blogPosts.title })
        .from(blogPosts)
        .limit(100);

      console.error(`GET /api/blog/:slug - Resource not found. Slug: "${slug}"`);
      console.error(`GET /api/blog/:slug - Available slugs (first 10):`, allPosts.slice(0, 10).map(p => ({ id: p.id, slug: p.slug, title: p.title })));

      return res.status(404).json({
        message: "Resource not found",
        slug,
        hint: "Check if the slug matches exactly (case-sensitive)"
      });
    }

    // Increment views
    try {
      await db
        .update(blogPosts)
        .set({ views: sql`${blogPosts.views} + 1` })
        .where(eq(blogPosts.id, posts[0].id));
    } catch (viewErr) {
      console.error("Error incrementing views:", viewErr);
      // Don't fail the request if view increment fails
    }

    return res.json(posts[0]);
  } catch (err: any) {
    console.error("Error fetching blog post:", err);
    console.error("Error stack:", err.stack);
    return res.status(500).json({
      message: "Failed to fetch blog post",
      error: err.message || String(err),
      slug: req.params.slug
    });
  }
});

// Admin blog routes moved to /server/routes/admin.ts

// Get formulas (public endpoint)
router.get("/formulas", async (req: Request, res: Response) => {
  try {
    const { examBody, subject } = req.query;

    const conditions = [];

    if (examBody) {
      conditions.push(or(
        eq(examFormulas.examBody, examBody as string),
        sql`${examFormulas.examBody} IS NULL`
      ));
    }

    if (subject) {
      conditions.push(or(
        ilike(examFormulas.subject, `%${subject}%`),
        sql`${examFormulas.subject} IS NULL`
      ));
    }


    // Better pattern:
    const formulas = await db
      .select()
      .from(examFormulas)
      .where(and(...conditions))
      .orderBy(examFormulas.order, examFormulas.title);

    return res.json({ formulas });
  } catch (err: any) {
    console.error("Error fetching formulas:", err);
    return res.status(500).json({ message: "Failed to fetch formulas", error: err.message || String(err) });
  }
});

// Get user stats (streaks, accuracy, achievements)
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

    // Get or create user stats (handle missing table gracefully)
    interface UserStatsData {
      currentStreak: number;
      longestStreak: number;
      accuracy: number;
      achievements: string[];
      totalQuestionsAnswered: number;
      lastPracticeDate?: Date | null;
    }

    let stats: UserStatsData[] = [];
    try {
      const dbStats = await db
        .select()
        .from(userStats)
        .where(eq(userStats.userId, user.id))
        .limit(1);
      stats = dbStats as UserStatsData[];
    } catch (err) {
      // Table doesn't exist, create default stats
      stats = [];
    }

    if (stats.length === 0) {
      // Create initial stats if table exists
      try {
        const [newStats] = await db
          .insert(userStats)
          .values({
            userId: user.id,
            currentStreak: 0,
            longestStreak: 0,
            totalQuestionsAnswered: 0,
            totalCorrectAnswers: 0,
            accuracy: 0,
            achievements: [],
          })
          .returning();
        // @ts-ignore
        stats = [newStats];
      } catch (err) {
        // Table doesn't exist, return default stats
        // @ts-ignore
        stats = [{
          currentStreak: 0,
          longestStreak: 0,
          accuracy: 0,
          achievements: [],
          totalQuestionsAnswered: 0,
          lastPracticeDate: null,
        }];
      }
    }

    return res.json({
      currentStreak: stats[0].currentStreak || 0,
      longestStreak: stats[0].longestStreak || 0,
      accuracy: stats[0].accuracy || 0,
      achievements: stats[0].achievements || [],
      totalQuestions: stats[0].totalQuestionsAnswered || 0,
      lastPracticeDate: stats[0].lastPracticeDate,
    });
  } catch (err: any) {
    console.error("Error fetching user stats:", err);
    return res.status(500).json({ message: "Failed to fetch stats", error: err.message || String(err) });
  }
});


// Download Exam Endpoint (Record download and check limits)
router.post("/exams/:id/download", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { supabaseId } = req.body;

    if (!supabaseId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.supabaseId, supabaseId),
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const exam = await db.query.exams.findFirst({
      where: eq(exams.id, id),
    });

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // Check limits
    const limitCheck = await ExamLimitService.checkDownloadLimit(user.id);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        message: limitCheck.reason,
        requiresUpgrade: true
      });
    }

    // Record download
    await ExamLimitService.recordDownload(user.id, exam.id);

    return res.json({ success: true, message: "Download recorded" });
  } catch (err) {
    console.error("Error recording download:", err);
    return res.status(500).json({ message: "Failed to record download" });
  }
});

// Remove Download Endpoint (Free up slot)
router.delete("/exams/:id/download", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { supabaseId } = req.query; // pass as query param for delete

    if (!supabaseId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.supabaseId, supabaseId as string),
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await ExamLimitService.removeDownload(user.id, id);

    return res.json({ success: true, message: "Download removed" });
  } catch (err) {
    console.error("Error removing download:", err);
    return res.status(500).json({ message: "Failed to remove download" });
  }
});

// Get user download stats
router.get("/user/limits", async (req: Request, res: Response) => {
  try {
    const { supabaseId } = req.query;
    if (!supabaseId) return res.status(401).json({ message: "Auth required" });

    const user = await db.query.users.findFirst({
      where: eq(users.supabaseId, supabaseId as string),
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Re-use logic or manual query
    // To be efficient we can just expose the dashboard data here
    const genLimit = await ExamLimitService.checkGenerationLimit(user.id);
    const dlLimit = await ExamLimitService.checkDownloadLimit(user.id);

    return res.json({
      generation: genLimit,
      download: dlLimit
    });
  } catch (err) {
    return res.status(500).json({ message: "Error fetching limits" });
  }
});

export default router;

