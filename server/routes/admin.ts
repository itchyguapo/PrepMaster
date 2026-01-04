import { Router, type Request, type Response } from "express";
import { db } from "../db";
import {
  examBodies,
  examTypes,
  categories,
  subjects,
  syllabi,
  topics,
  questions,
  questionOptions,
  questionDataVersions,
  markingGuides,
  questionVersions,
  users,
  subscriptions,
  userStats,
  attempts,
  exams,
  blogPosts,
  examFormulas,
  examRules,
  payments,
  tutorInquiries,
  subtopics
} from "@shared/schema";
import { eq, and, inArray, sql, count, gte, desc, or, ilike } from "drizzle-orm";
import { requireAdmin } from "../middleware/adminAuth";
import { formatQuestionOptions } from "../utils/questionFormatter";
import { adminLimiter } from "../middleware/rateLimiter";

const router = Router();

// Create or update user subscription (before any middleware)
router.post("/subscriptions", async (req: Request, res: Response) => {
  try {
    const { userId, plan, status, expiresAt, isLifetime } = req.body;

    if (!userId || !plan || !status) {
      return res.status(400).json({ message: "userId, plan, and status are required" });
    }

    // Check if user exists
    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userRecords.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if subscription already exists
    const existingSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    let subscription;
    if (existingSubscriptions.length > 0) {
      // Update existing subscription
      const [updated] = await db
        .update(subscriptions)
        .set({
          plan,
          status,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          isLifetime: isLifetime || false,
          updatedAt: new Date()
        })
        .where(eq(subscriptions.userId, userId))
        .returning();
      subscription = updated;
    } else {
      // Create new subscription
      const [newSubscription] = await db
        .insert(subscriptions)
        .values({
          userId,
          plan,
          status,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          isLifetime: isLifetime || false
        })
        .returning();
      subscription = newSubscription;
    }

    return res.json({
      message: "Subscription updated successfully",
      subscription
    });
  } catch (err: any) {
    console.error("[ADMIN] Error managing subscription:", err);
    return res.status(500).json({
      message: "Failed to manage subscription",
      error: err?.message || String(err)
    });
  }
});

// Temporary admin sync endpoint - before any middleware
router.post("/sync-admin", async (req: Request, res: Response) => {
  console.log("[SYNC-ADMIN] Endpoint reached, path:", req.path);
  try {
    const adminEmail = 'schools.medley@gmail.com';

    // Check if admin user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (existingUser.length === 0) {
      // Create admin user
      const [newUser] = await db
        .insert(users)
        .values({
          email: adminEmail,
          username: adminEmail.split('@')[0], // Generate username
          password: "managed-by-supabase", // Placeholder
          role: 'admin',
          supabaseId: adminEmail,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log("[SYNC-ADMIN] Admin user created:", newUser);
      return res.json({
        message: "Admin user created successfully",
        user: newUser
      });
    } else {
      console.log("[SYNC-ADMIN] Admin user already exists:", existingUser[0]);
      return res.json({
        message: "Admin user already exists",
        user: existingUser[0]
      });
    }
  } catch (err: any) {
    console.error("[SYNC-ADMIN] Error syncing admin user:", err);
    return res.status(500).json({
      message: "Failed to sync admin user",
      error: err.message || String(err)
    });
  }
});

// Normalize and validate options + correct answer
function validateAndNormalizeQuestion(questionData: any) {
  const errors: string[] = [];

  // Required fields validation
  if (!questionData.examBodyId) {
    errors.push("examBodyId is required");
  }
  if (!questionData.subjectId) {
    errors.push("subjectId is required");
  }
  if (!questionData.text || typeof questionData.text !== "string" || questionData.text.trim().length === 0) {
    errors.push("question_text is required and must be non-empty");
  }

  // Question type validation
  const validTypes = ["multiple_choice", "essay", "true_false"];
  const questionType = questionData.type || "multiple_choice";
  if (!validTypes.includes(questionType)) {
    errors.push(`question_type must be one of: ${validTypes.join(", ")}`);
  }

  let normalizedOptions: { id: string; text: string }[] = [];
  let normalizedCorrectAnswer = "";

  // Type-specific validation
  if (questionType === "multiple_choice") {
    // MCQ validation: minimum 4 options, exactly one correct, non-empty options
    let parsed = questionData.options;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        errors.push("Invalid options format (must be JSON array)");
        return { valid: false, errors, options: [], correctAnswer: "" };
      }
    }

    if (!Array.isArray(parsed)) {
      errors.push("Options must be an array for multiple choice questions");
      return { valid: false, errors, options: [], correctAnswer: "" };
    }

    if (parsed.length < 4) {
      errors.push("Multiple choice questions must have at least 4 options");
    }

    // Check for duplicate option IDs and texts
    const seenIds = new Set<string>();
    const seenTexts = new Set<string>();

    const normalized = parsed.map((opt: any, index: number) => {
      const text = opt?.text ?? opt?.content ?? opt?.label ?? opt?.value;
      if (text === undefined || text === null || String(text).trim().length === 0) {
        errors.push(`Option ${index + 1} must have non-empty text/content`);
        return null;
      }

      const textStr = String(text).trim();
      if (seenTexts.has(textStr.toLowerCase())) {
        errors.push(`Duplicate option text found: "${textStr}"`);
      }
      seenTexts.add(textStr.toLowerCase());

      const id = opt?.id ?? opt?.optionId ?? String.fromCharCode(65 + index);
      const idStr = String(id).trim();
      if (seenIds.has(idStr.toLowerCase())) {
        errors.push(`Duplicate option ID found: "${idStr}"`);
      }
      seenIds.add(idStr.toLowerCase());

      return {
        id: idStr,
        text: textStr,
      };
    }).filter(opt => opt !== null) as { id: string; text: string }[];

    if (normalized.length !== parsed.length) {
      return { valid: false, errors, options: [], correctAnswer: "" };
    }

    // Validate correct answer
    if (!questionData.correctAnswer) {
      errors.push("correctAnswer is required for multiple choice questions");
      return { valid: false, errors, options: [], correctAnswer: "" };
    }

    const answerRaw = String(questionData.correctAnswer).trim();
    let finalAnswer: string | null = null;

    const byId = normalized.find((o) => o.id.toLowerCase() === answerRaw.toLowerCase());
    if (byId) {
      finalAnswer = byId.id;
    } else {
      const byText = normalized.find(
        (o) => o.text.toLowerCase().trim() === answerRaw.toLowerCase()
      );
      if (byText) {
        finalAnswer = byText.id;
      }
    }

    if (!finalAnswer) {
      errors.push(`correctAnswer "${questionData.correctAnswer}" must match an option ID or text`);
    }

    normalizedOptions = normalized;
    normalizedCorrectAnswer = finalAnswer || "";

  } else if (questionType === "essay") {
    // Essay validation: marking guide required
    if (!questionData.markingGuide && !questionData.detailedExplanation) {
      errors.push("Essay questions must include a marking guide or detailed explanation");
    }
    // Essays don't need options
    normalizedOptions = [];
    normalizedCorrectAnswer = "";

  } else if (questionType === "true_false") {
    // True/false: exactly 2 options (True/False), correct answer required
    normalizedOptions = [
      { id: "A", text: "True" },
      { id: "B", text: "False" }
    ];

    if (!questionData.correctAnswer) {
      errors.push("correctAnswer is required for true/false questions");
    } else {
      const answerRaw = String(questionData.correctAnswer).toLowerCase().trim();
      if (["true", "a", "t"].includes(answerRaw)) {
        normalizedCorrectAnswer = "A";
      } else if (["false", "b", "f"].includes(answerRaw)) {
        normalizedCorrectAnswer = "B";
      } else {
        errors.push(`correctAnswer for true/false must be "True"/"A" or "False"/"B"`);
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, options: [], correctAnswer: "" };
  }

  return {
    valid: true,
    errors: [],
    options: normalizedOptions,
    correctAnswer: normalizedCorrectAnswer
  };
}

// Diagnostic endpoint - shows detailed admin status info (before middleware)
// Use this to debug admin access issues
router.get("/diagnostic", async (req: Request, res: Response) => {
  try {
    const { checkAdminStatus, extractSupabaseId, extractBearerToken, verifySupabaseToken } = await import("../services/adminAuthService");
    const { isAdminEmail, getAdminEmails, normalizeEmail } = await import("../utils/adminEmails");
    const { eq } = await import("drizzle-orm");

    const bearerToken = extractBearerToken(req);
    let supabaseId = req.query?.supabaseId as string || null;

    // Verify token if present
    if (bearerToken && bearerToken.length > 50) {
      const verifiedId = await verifySupabaseToken(bearerToken);
      if (verifiedId) {
        supabaseId = verifiedId;
      }
    }

    if (!supabaseId) {
      return res.status(400).json({
        message: "supabaseId is required",
        diagnostic: {
          hasBearerToken: !!bearerToken,
          hasQueryParam: !!req.query?.supabaseId,
          bearerTokenLength: bearerToken?.length || 0
        }
      });
    }

    // Get user from database
    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, supabaseId))
      .limit(1);

    const user = userRecords[0] || null;
    const userEmail = user ? normalizeEmail(user.email) : null;

    // Check admin status (force refresh to get latest)
    const { isAdmin } = await checkAdminStatus(supabaseId, user, bearerToken || undefined, true);

    // Get admin emails config
    const adminEmails = getAdminEmails();
    const isInWhitelist = userEmail ? isAdminEmail(userEmail) : false;

    return res.json({
      supabaseId: supabaseId.slice(0, 8) + "...",
      userExists: !!user,
      userEmail: userEmail || "no email",
      userRole: user?.role || "no user",
      isInWhitelist,
      hasAdminRole: user?.role === "admin",
      isAdmin,
      adminEmailsConfigured: adminEmails.length,
      adminEmailsList: adminEmails,
      adminEmailsEnv: process.env.ADMIN_EMAILS ? "SET" : "NOT SET",
      recommendations: [
        !user ? "User not found in database. Try syncing via /api/auth/sync-user" : null,
        !userEmail ? "User has no email. Email is required for admin access." : null,
        !isInWhitelist && userEmail ? `Email "${userEmail}" is not in ADMIN_EMAILS whitelist. Add it to .env file.` : null,
        user?.role !== "admin" && !isInWhitelist ? "User role is not 'admin' and email is not in whitelist." : null,
        !process.env.ADMIN_EMAILS ? "ADMIN_EMAILS environment variable is not set." : null,
        !process.env.SUPABASE_SERVICE_ROLE_KEY ? "SUPABASE_SERVICE_ROLE_KEY is not set (required for auth)." : null
      ].filter(Boolean)
    });
  } catch (err: any) {
    console.error("[ADMIN DIAGNOSTIC] Error:", err);
    return res.status(500).json({
      message: "Diagnostic check failed",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  }
});

// Admin check endpoint (before middleware so it can be called without auth)
// Uses the centralized admin auth service for consistency
router.get("/check", async (req: Request, res: Response) => {
  try {
    const { checkAdminStatus, extractSupabaseId, extractBearerToken, verifySupabaseToken } = await import("../services/adminAuthService");
    const { isAdminEmail, getAdminEmails } = await import("../utils/adminEmails");

    // Try to get Bearer token first
    const bearerToken = extractBearerToken(req);
    let supabaseId = req.query?.supabaseId as string || null;

    // If we have a Bearer token, verify it
    if (bearerToken) {
      if (bearerToken.length > 50) {
        // Looks like a JWT, verify it
        const verifiedId = await verifySupabaseToken(bearerToken);
        if (verifiedId) {
          supabaseId = verifiedId;
        }
      } else if (!supabaseId) {
        // Short token, might be supabaseId
        supabaseId = bearerToken;
      }
    }

    if (!supabaseId) {
      return res.status(400).json({
        message: "supabaseId is required",
        isAdmin: false,
        code: "MISSING_SUPABASE_ID"
      });
    }

    // Use centralized service (with caching and token for syncing)
    const { isAdmin, user, email } = await checkAdminStatus(supabaseId, undefined, bearerToken || undefined, false);

    // Provide helpful debug info in development
    const debugInfo = process.env.NODE_ENV === "development" ? {
      supabaseId: supabaseId.slice(0, 8) + "...",
      email: email || "no email",
      role: user?.role || "no user",
      userExists: !!user,
      isInWhitelist: email ? isAdminEmail(email) : false,
      adminEmailsCount: getAdminEmails().length,
      adminEmailsEnv: process.env.ADMIN_EMAILS ? "SET" : "NOT SET"
    } : undefined;

    return res.json({
      isAdmin,
      email: email || undefined,
      role: user?.role || undefined,
      ...(debugInfo && { debug: debugInfo })
    });
  } catch (err: any) {
    console.error("[ADMIN CHECK] Error:", err);
    return res.status(500).json({
      message: "Failed to check admin status",
      isAdmin: false,
      code: "CHECK_ERROR",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
});

// =====================================================
// EXAM TYPES MANAGEMENT
// =====================================================

router.get("/exam-types", async (req: Request, res: Response) => {
  try {
    const { examBodyId } = req.query;
    const conditions = [];

    if (examBodyId) {
      conditions.push(eq(examTypes.examBodyId, examBodyId as string));
    }

    const examTypesList = await db
      .select()
      .from(examTypes)
      .where(and(...conditions))
      .orderBy(examTypes.name);

    return res.json(examTypesList);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch exam types", error: String(err) });
  }
});

router.post("/exam-types", async (req: Request, res: Response) => {
  try {
    const { name, code, examBodyId, durationMinutes, rules } = req.body;

    if (!name || !code || !examBodyId || !durationMinutes) {
      return res.status(400).json({ message: "Name, code, examBodyId, and durationMinutes are required" });
    }

    const [newExamType] = await db.insert(examTypes).values({
      name,
      code,
      examBodyId,
      durationMinutes,
      rules: rules || {
        questionCount: 50,
        subjectsRequired: 9,
        randomizationEnabled: true,
        passingScore: 50
      }
    }).returning();

    return res.json(newExamType);
  } catch (err) {
    return res.status(500).json({ message: "Failed to create exam type", error: String(err) });
  }
});

router.put("/exam-types/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, durationMinutes, rules, isActive } = req.body;

    const [updated] = await db.update(examTypes)
      .set({
        name,
        code,
        durationMinutes,
        rules,
        // isActive removed
        updatedAt: new Date()
      })
      .where(eq(examTypes.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Exam type not found" });
    }

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: "Failed to update exam type", error: String(err) });
  }
});

router.delete("/exam-types/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if exam type is being used
    const questionsUsing = await db.select({ count: count() })
      .from(questions)
      .where(eq(questions.examTypeId, id));

    if (questionsUsing[0]?.count > 0) {
      return res.status(400).json({
        message: "Cannot delete exam type that has questions associated with it"
      });
    }

    await db.delete(examTypes).where(eq(examTypes.id, id));
    return res.json({ message: "Exam type deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete exam type", error: String(err) });
  }
});

// =====================================================
// CATEGORIES MANAGEMENT (per instruction1.md)
// =====================================================

router.get("/categories", async (req: Request, res: Response) => {
  try {
    const { examBodyId } = req.query;
    const conditions = [];

    if (examBodyId) {
      conditions.push(eq(categories.examBodyId, examBodyId as string));
    }

    const cats = await db
      .select()
      .from(categories)
      .where(and(...conditions))
      .orderBy(categories.name);
    return res.json(cats);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch categories", error: String(err) });
  }
});

router.post("/categories", async (req: Request, res: Response) => {
  try {
    const { name, examBodyId } = req.body;

    if (!name || !examBodyId) {
      return res.status(400).json({ message: "Name and examBodyId are required" });
    }

    const [newCategory] = await db.insert(categories).values({
      name,
      examBodyId
    }).returning();

    return res.json(newCategory);
  } catch (err: any) {
    if (err.code === '23505') { // Unique violation
      return res.status(400).json({ message: "Category with this name already exists for this exam body" });
    }
    return res.status(500).json({ message: "Failed to create category", error: String(err) });
  }
});

router.delete("/categories/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if category has questions
    const questionCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(questions)
      .where(eq(questions.categoryId, id));

    if (Number(questionCount[0]?.count || 0) > 0) {
      return res.status(400).json({
        message: "Cannot delete category with existing questions. Delete questions first."
      });
    }

    await db.delete(categories).where(eq(categories.id, id));
    return res.json({ message: "Category deleted successfully" });
  } catch (err) {
  }
});

// =====================================================
// SYLLABI MANAGEMENT
// =====================================================

router.get("/syllabi", async (req: Request, res: Response) => {
  try {
    const { examBodyId: queryExamBodyId, subjectId: querySubjectId, syllabusId } = req.query;

    const filters = [eq(syllabi.isActive, true)];
    let query = db
      .select({
        syllabus: syllabi,
        subjectName: subjects.name,
        examBodyName: examBodies.name
      })
      .from(syllabi)
      .innerJoin(subjects, eq(syllabi.subjectId, subjects.id))
      .innerJoin(examBodies, eq(syllabi.examBodyId, examBodies.id));

    if (queryExamBodyId) {
      filters.push(eq(syllabi.examBodyId, queryExamBodyId as string));
    }

    if (querySubjectId) {
      filters.push(eq(syllabi.subjectId, querySubjectId as string));
    }

    if (syllabusId) {
      filters.push(eq(syllabi.id, syllabusId as string));
    }

    const syllabiList = await query.where(and(...filters)).orderBy(syllabi.version);
    return res.json(syllabiList);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch syllabi", error: String(err) });
  }
});

router.post("/syllabi", async (req: Request, res: Response) => {
  try {
    const { title, version, examBodyId, subjectId, content, effectiveFrom, effectiveTo } = req.body;

    if (!title || !version || !examBodyId || !subjectId) {
      return res.status(400).json({ message: "Title, version, examBodyId, and subjectId are required" });
    }

    const [newSyllabus] = await db.insert(syllabi).values({
      title,
      version,
      examBodyId,
      subjectId,
      content,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
      effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined
    }).returning();

    return res.json(newSyllabus);
  } catch (err) {
    return res.status(500).json({ message: "Failed to create syllabus", error: String(err) });
  }
});

router.put("/syllabi/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, version, content, effectiveFrom, effectiveTo, isActive } = req.body;

    const [updated] = await db.update(syllabi)
      .set({
        title,
        version,
        content,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
        effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
        isActive,
        updatedAt: new Date()
      })
      .where(eq(syllabi.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Syllabus not found" });
    }

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: "Failed to update syllabus", error: String(err) });
  }
});

router.delete("/syllabi/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db.delete(syllabi).where(eq(syllabi.id, id));
    return res.json({ message: "Syllabus deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete syllabus", error: String(err) });
  }
});

// =====================================================
// TOPICS MANAGEMENT
// =====================================================

router.get("/topics", async (req: Request, res: Response) => {
  try {
    const { syllabusId, subjectId } = req.query;

    const conditions = [eq(topics.isActive, true)];

    if (syllabusId) {
      conditions.push(eq(topics.syllabusId, syllabusId as string));
    }

    if (subjectId) {
      conditions.push(eq(topics.subjectId, subjectId as string));
    }

    const topicsList = await db
      .select({
        topic: topics,
        syllabusTitle: syllabi.title,
        subjectName: subjects.name
      })
      .from(topics)
      .innerJoin(syllabi, eq(topics.syllabusId, syllabi.id))
      .innerJoin(subjects, eq(topics.subjectId, subjects.id))
      .where(and(...conditions))
      .orderBy(topics.order);

    return res.json(topicsList);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch topics", error: String(err) });
  }
});

router.post("/topics", async (req: Request, res: Response) => {
  try {
    const { name, code, syllabusId, subjectId, examBodyId, description, order } = req.body;

    if (!name || !syllabusId || !subjectId || !examBodyId) {
      return res.status(400).json({ message: "Name, syllabusId, subjectId, and examBodyId are required" });
    }

    const [newTopic] = await db.insert(topics).values({
      name,
      code,
      syllabusId,
      subjectId,
      examBodyId,
      description,
      order: order || 0
    }).returning();

    return res.json(newTopic);
  } catch (err) {
    return res.status(500).json({ message: "Failed to create topic", error: String(err) });
  }
});

router.put("/topics/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, description, order, isActive } = req.body;

    const [updated] = await db.update(topics)
      .set({
        name,
        code,
        description,
        order,
        isActive,
        updatedAt: new Date()
      })
      .where(eq(topics.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Topic not found" });
    }

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: "Failed to update topic", error: String(err) });
  }
});

router.delete("/topics/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db.delete(topics).where(eq(topics.id, id));
    return res.json({ message: "Topic deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete topic", error: String(err) });
  }
});

// =====================================================
// SUBTOPICS MANAGEMENT
// =====================================================

router.get("/subtopics", async (req: Request, res: Response) => {
  try {
    const { topicId } = req.query;

    const conditions = [eq(subtopics.isActive, true)];

    if (topicId) {
      conditions.push(eq(subtopics.topicId, topicId as string));
    }

    const subtopicsList = await db
      .select({
        subtopic: subtopics,
        topicName: topics.name,
        syllabusTitle: syllabi.title
      })
      .from(subtopics)
      .innerJoin(topics, eq(subtopics.topicId, topics.id))
      .innerJoin(syllabi, eq(subtopics.syllabusId, syllabi.id))
      .where(and(...conditions))
      .orderBy(subtopics.order);

    return res.json(subtopicsList);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch subtopics", error: String(err) });
  }
});

router.post("/subtopics", async (req: Request, res: Response) => {
  try {
    const { name, code, topicId, syllabusId, subjectId, examBodyId, description, order } = req.body;

    if (!name || !topicId || !syllabusId || !subjectId || !examBodyId) {
      return res.status(400).json({ message: "Name, topicId, syllabusId, subjectId, and examBodyId are required" });
    }

    const [newSubtopic] = await db.insert(subtopics).values({
      name,
      code,
      topicId,
      syllabusId,
      subjectId,
      examBodyId,
      description,
      order: order || 0
    }).returning();

    return res.json(newSubtopic);
  } catch (err) {
    return res.status(500).json({ message: "Failed to create subtopic", error: String(err) });
  }
});

// =====================================================
// QUESTION LIFECYCLE MANAGEMENT
// =====================================================

router.get("/questions/pending-review", async (req: Request, res: Response) => {
  try {
    const { examBodyId } = req.query;
    const { getQuestionsPendingReview } = await import("../utils/questionLifecycle");

    const pendingQuestions = await getQuestionsPendingReview(examBodyId as string);
    return res.json(pendingQuestions);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch pending reviews", error: String(err) });
  }
});

router.post("/questions/:id/transition", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newStatus, reason } = req.body;
    const { transitionQuestionStatus } = await import("../utils/questionLifecycle");

    // Get user ID from session (assuming it's available)
    const userId = "admin"; // TODO: Get from session

    const result = await transitionQuestionStatus(id, newStatus, userId, reason);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({ message: result.message });
  } catch (err) {
    return res.status(500).json({ message: "Failed to transition question status", error: String(err) });
  }
});

router.post("/questions/bulk-transition", async (req: Request, res: Response) => {
  try {
    const { questionIds, newStatus, reason } = req.body;
    const { bulkTransitionQuestions } = await import("../utils/questionLifecycle");

    const userId = "admin"; // TODO: Get from session

    const results = await bulkTransitionQuestions(questionIds, newStatus, userId, reason);

    return res.json({
      message: `Processed ${questionIds.length} questions`,
      successCount: results.successCount,
      failures: results.failures
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to bulk transition questions", error: String(err) });
  }
});

router.get("/questions/:id/versions", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { getQuestionVersions } = await import("../utils/questionLifecycle");

    const versions = await getQuestionVersions(id);
    return res.json(versions);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch question versions", error: String(err) });
  }
});

router.post("/questions/:id/restore/:version", async (req: Request, res: Response) => {
  try {
    const { id, version } = req.params;
    const { restoreQuestionVersion } = await import("../utils/questionLifecycle");

    const userId = "admin"; // TODO: Get from session
    const versionNumber = parseInt(version);

    const result = await restoreQuestionVersion(id, versionNumber, userId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({ message: result.message });
  } catch (err) {
    return res.status(500).json({ message: "Failed to restore question version", error: String(err) });
  }
});

// =====================================================
// EXAM RULES MANAGEMENT
// =====================================================

router.get("/exam-rules", async (req: Request, res: Response) => {
  try {
    const { examTypeId, examBodyId, trackId } = req.query;

    const conditions = [eq(examRules.isActive, true)];

    // Filter by examBodyId (primary) or examTypeId (optional, for backward compatibility)
    if (examBodyId) {
      conditions.push(eq(examRules.examBodyId, examBodyId as string));
    } else if (examTypeId) {
      conditions.push(eq(examRules.examTypeId, examTypeId as string));
    }

    if (trackId) {
      conditions.push(eq(examRules.trackId, trackId as string));
    }

    const rules = await db
      .select()
      .from(examRules)
      .where(and(...conditions))
      .orderBy(examRules.priority);

    return res.json(rules);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch exam rules", error: String(err) });
  }
});

router.post("/exam-rules", async (req: Request, res: Response) => {
  try {
    const { examBodyId, examTypeId, trackId, name, description, rules } = req.body;

    if (!examBodyId || !name || !rules) {
      return res.status(400).json({ message: "examBodyId, name, and rules are required" });
    }

    // Validate examBodyId exists
    const examBodyExists = await db.select().from(examBodies).where(eq(examBodies.id, examBodyId)).limit(1);
    if (examBodyExists.length === 0) {
      return res.status(400).json({ message: "Invalid examBodyId" });
    }

    // Validate examTypeId if provided
    if (examTypeId) {
      const examTypeExists = await db.select().from(examTypes).where(eq(examTypes.id, examTypeId)).limit(1);
      if (examTypeExists.length === 0) {
        return res.status(400).json({ message: "Invalid examTypeId" });
      }
    }

    const [newRule] = await db.insert(examRules).values({
      examBodyId,
      examTypeId: examTypeId || null,
      trackId: trackId || null,
      name,
      description,
      rules
    }).returning();

    return res.json(newRule);
  } catch (err) {
    return res.status(500).json({ message: "Failed to create exam rule", error: String(err) });
  }
});

router.put("/exam-rules/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, rules, isActive, priority } = req.body;

    const [updated] = await db.update(examRules)
      .set({
        name,
        description,
        rules,
        isActive,
        priority,
        updatedAt: new Date()
      })
      .where(eq(examRules.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Exam rule not found" });
    }

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: "Failed to update exam rule", error: String(err) });
  }
});

// Questions distribution diagnostic endpoint
router.get("/questions-diagnostic", async (_req: Request, res: Response) => {
  try {
    console.log("[DIAGNOSTIC] Checking question distribution...");

    // Get all exam bodies
    const examBodyRecords = await db.select().from(examBodies);

    const distribution = [];
    let totalQuestions = 0;

    for (const examBody of examBodyRecords) {
      const questionCount = await db
        .select({ count: sql`count(*)` })
        .from(questions)
        .where(eq(questions.examBodyId, examBody.id));

      const count = Number(questionCount[0]?.count || 0);
      totalQuestions += count;

      // Get sample questions
      const sampleQuestions = await db
        .select({
          id: questions.id,
          text: questions.text,
          status: questions.status,
          subjectId: questions.subjectId
        })
        .from(questions)
        .where(eq(questions.examBodyId, examBody.id))
        .limit(3);

      distribution.push({
        examBody: examBody.name,
        examBodyId: examBody.id,
        questionCount: count,
        sampleQuestions: sampleQuestions.map(q => ({
          id: q.id,
          text: q.text.substring(0, 80) + '...',
          status: q.status,
          subjectId: q.subjectId
        }))
      });
    }

    // Get questions by status
    const liveQuestions = await db
      .select({ count: sql`count(*)` })
      .from(questions)
      .where(eq(questions.status, 'live'));

    const result = {
      totalQuestions,
      liveQuestions: Number(liveQuestions[0]?.count || 0),
      distribution
    };

    console.log("[DIAGNOSTIC] Question distribution:", result);
    return res.json(result);

  } catch (err: any) {
    console.error("[DIAGNOSTIC] Error:", err);
    return res.status(500).json({
      message: "Failed to get question distribution",
      error: err.message || String(err)
    });
  }
});

// Apply admin middleware and rate limiting to all routes except /check, /diagnostic, and /questions-diagnostic
router.use((req, res, next) => {
  if (req.path === "/check" || req.path === "/diagnostic" || req.path === "/questions-diagnostic") {
    return next();
  }
  // Apply admin rate limiter first, then admin auth
  return adminLimiter(req, res, (err) => {
    if (err) return next(err);
    return requireAdmin(req, res, next);
  });
});

// Dashboard stats
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    // Get total revenue from payments
    const revenueRecords = await db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(payments)
      .where(eq(payments.status, "success"));
    const totalRevenue = Number(revenueRecords[0]?.total || 0) / 100; // Convert from kobo

    // Get active subscriptions count
    const activeSubsRecords = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));
    const activeSubscriptions = activeSubsRecords[0]?.count || 0;

    // Get questions count
    const questionsRecords = await db
      .select({ count: count() })
      .from(questions)
      .where(eq(questions.status, "live"));
    const questionsInBank = questionsRecords[0]?.count || 0;

    // Get active tutors count
    const tutorsRecords = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "tutor"));
    const activeTutors = tutorsRecords[0]?.count || 0;

    // Get pending tutor inquiries
    let pendingInquiries = 0;
    try {
      const inquiriesRecords = await db
        .select({ count: count() })
        .from(tutorInquiries)
        .where(eq(tutorInquiries.status, "pending"));
      pendingInquiries = inquiriesRecords[0]?.count || 0;
    } catch {
      // Table might not exist yet
    }

    // Calculate subscription growth (last 7 months)
    const subscriptionGrowth: number[] = [];
    for (let i = 6; i >= 0; i--) {
      try {
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - i);
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        const monthSubs = await db
          .select({ count: count() })
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.status, "active"),
              gte(subscriptions.createdAt, monthStart),
              sql`${subscriptions.createdAt} < ${monthEnd}`
            )
          );
        subscriptionGrowth.push(monthSubs[0]?.count || 0);
      } catch (err: any) {
        console.error(`[ADMIN STATS] Error fetching month ${i} subscriptions:`, err.message);
        subscriptionGrowth.push(0);
      }
    }

    // Calculate revenue change (current month vs previous month)
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    let currentMonthRevenue = 0;
    let previousMonthRevenue = 0;
    try {
      // Get revenue from payments table for current month
      const currentMonthPayments = await db
        .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
        .from(payments)
        .where(
          and(
            eq(payments.status, "success"),
            gte(payments.createdAt, currentMonthStart),
            sql`${payments.createdAt} < ${currentMonthEnd}`
          )
        );
      currentMonthRevenue = Number(currentMonthPayments[0]?.total || 0) / 100;

      // Get revenue from payments table for previous month
      const previousMonthPayments = await db
        .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
        .from(payments)
        .where(
          and(
            eq(payments.status, "success"),
            gte(payments.createdAt, previousMonthStart),
            sql`${payments.createdAt} < ${previousMonthEnd}`
          )
        );
      previousMonthRevenue = Number(previousMonthPayments[0]?.total || 0) / 100;
    } catch (err: any) {
      console.error("[ADMIN STATS] Error calculating revenue change:", err.message);
    }

    const revenueChange = previousMonthRevenue > 0
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : (currentMonthRevenue > 0 ? 100 : 0);

    // Calculate subscriptions change (current month vs previous month)
    let currentMonthSubs = 0;
    let previousMonthSubs = 0;
    try {
      const currentMonthSubsRecords = await db
        .select({ count: count() })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.status, "active"),
            gte(subscriptions.createdAt, currentMonthStart),
            sql`${subscriptions.createdAt} < ${currentMonthEnd}`
          )
        );
      currentMonthSubs = currentMonthSubsRecords[0]?.count || 0;

      const previousMonthSubsRecords = await db
        .select({ count: count() })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.status, "active"),
            gte(subscriptions.createdAt, previousMonthStart),
            sql`${subscriptions.createdAt} < ${previousMonthEnd}`
          )
        );
      previousMonthSubs = previousMonthSubsRecords[0]?.count || 0;
    } catch (err: any) {
      console.error("[ADMIN STATS] Error calculating subscriptions change:", err.message);
    }

    const subscriptionsChange = previousMonthSubs > 0
      ? ((currentMonthSubs - previousMonthSubs) / previousMonthSubs) * 100
      : (currentMonthSubs > 0 ? 100 : 0);

    // Calculate questions change (last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    let currentPeriodQuestions = 0;
    let previousPeriodQuestions = 0;
    try {
      const currentPeriodQuestionsRecords = await db
        .select({ count: count() })
        .from(questions)
        .where(
          and(
            eq(questions.status, "live"),
            gte(questions.createdAt, thirtyDaysAgo)
          )
        );
      currentPeriodQuestions = currentPeriodQuestionsRecords[0]?.count || 0;

      const previousPeriodQuestionsRecords = await db
        .select({ count: count() })
        .from(questions)
        .where(
          and(
            eq(questions.status, "live"),
            gte(questions.createdAt, sixtyDaysAgo),
            sql`${questions.createdAt} < ${thirtyDaysAgo}`
          )
        );
      previousPeriodQuestions = previousPeriodQuestionsRecords[0]?.count || 0;
    } catch (err: any) {
      console.error("[ADMIN STATS] Error calculating questions change:", err.message);
    }

    const questionsChange = previousPeriodQuestions > 0
      ? ((currentPeriodQuestions - previousPeriodQuestions) / previousPeriodQuestions) * 100
      : (currentPeriodQuestions > 0 ? 100 : 0);

    // Calculate tutors change (last 30 days vs previous 30 days)
    let currentPeriodTutors = 0;
    let previousPeriodTutors = 0;
    try {
      const currentPeriodTutorsRecords = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.role, "tutor"),
            gte(users.createdAt, thirtyDaysAgo)
          )
        );
      currentPeriodTutors = currentPeriodTutorsRecords[0]?.count || 0;

      const previousPeriodTutorsRecords = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.role, "tutor"),
            gte(users.createdAt, sixtyDaysAgo),
            sql`${users.createdAt} < ${thirtyDaysAgo}`
          )
        );
      previousPeriodTutors = previousPeriodTutorsRecords[0]?.count || 0;
    } catch (err: any) {
      console.error("[ADMIN STATS] Error calculating tutors change:", err.message);
    }

    const tutorsChange = previousPeriodTutors > 0
      ? ((currentPeriodTutors - previousPeriodTutors) / previousPeriodTutors) * 100
      : (currentPeriodTutors > 0 ? 100 : 0);

    // Get recent activity (last 10 subscriptions, payments, user registrations)
    const recentActivity: Array<{ type: string; description: string; timestamp: Date }> = [];
    try {
      // Recent subscriptions
      const recentSubs = await db
        .select()
        .from(subscriptions)
        .orderBy(desc(subscriptions.createdAt))
        .limit(5);

      recentSubs.forEach(sub => {
        recentActivity.push({
          type: "subscription",
          description: `New ${sub.plan} subscription`,
          timestamp: sub.createdAt || new Date(),
        });
      });

      // Recent payments
      try {
        const recentPayments = await db
          .select()
          .from(payments)
          .orderBy(desc(payments.createdAt))
          .limit(5);

        recentPayments.forEach(payment => {
          recentActivity.push({
            type: "payment",
            description: `Payment of ₦${(payment.amount / 100).toFixed(2)} for ${payment.plan}`,
            timestamp: payment.createdAt || new Date(),
          });
        });
      } catch {
        // Payments table might not exist
      }

      // Recent user registrations
      const recentUsers = await db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(5);

      recentUsers.forEach(user => {
        recentActivity.push({
          type: "user",
          description: `New ${user.role} user registered`,
          timestamp: user.createdAt || new Date(),
        });
      });

      // Sort by timestamp and take most recent 10
      recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      recentActivity.splice(10);
    } catch (err: any) {
      console.error("[ADMIN STATS] Error fetching recent activity:", err.message);
    }

    return res.json({
      totalRevenue,
      revenueChange: Math.round(revenueChange * 100) / 100, // Round to 2 decimal places
      activeSubscriptions,
      subscriptionsChange: Math.round(subscriptionsChange * 100) / 100,
      questionsInBank,
      questionsChange: Math.round(questionsChange * 100) / 100,
      activeTutors,
      tutorsChange: Math.round(tutorsChange * 100) / 100,
      subscriptionGrowth,
      recentActivity: recentActivity.map(activity => ({
        type: activity.type,
        description: activity.description,
        timestamp: activity.timestamp.toISOString(),
      })),
      pendingInquiries,
    });
  } catch (err: any) {
    console.error("[ADMIN STATS] Error:", err);
    return res.status(500).json({
      message: "Failed to fetch stats",
      error: err.message || String(err)
    });
  }
});

// Users management
router.get("/users", async (_req: Request, res: Response) => {
  try {
    const userRecords = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));

    const usersWithSubscriptions = await Promise.all(
      userRecords.map(async (u) => {
        const subRecords = await db
          .select()
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.userId, u.id),
              eq(subscriptions.status, "active")
            )
          )
          .orderBy(desc(subscriptions.createdAt))
          .limit(1);

        const subscription = subRecords[0];
        const plan = subscription?.plan || "basic";
        const status = subscription?.status || "inactive";

        const roleDisplay = u.role === "admin" ? "Admin" : u.role === "tutor" ? "Tutor" : "Student";
        const planDisplay = plan === "basic" ? "Basic" : plan === "standard" ? "Standard" : plan === "premium" ? "Premium" : plan;

        return {
          id: u.id,
          name: u.username,
          email: u.email || "Not set",
          role: roleDisplay,
          roleValue: u.role || "student",
          plan: planDisplay,
          planValue: plan,
          status: status === "active" ? "Active" : "Inactive",
          joined: new Date(u.createdAt || new Date()).toLocaleDateString(),
        };
      })
    );

    return res.json(usersWithSubscriptions);
  } catch (err: any) {
    console.error("Error fetching users:", err);
    return res.status(500).json({
      message: "Failed to fetch users",
      error: err.message || String(err)
    });
  }
});

router.put("/users/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, plan, subscriptionStatus } = req.body;

    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (userRecords.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRecords[0];
    const updates: any = { updatedAt: new Date() };

    if (role && ["student", "tutor", "admin"].includes(role)) {
      updates.role = role;
    }

    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id));

    // Handle subscription updates if provided
    if (plan || subscriptionStatus) {
      const subRecords = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, id),
            eq(subscriptions.status, "active")
          )
        )
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);

      if (subRecords.length > 0) {
        const subUpdates: any = { updatedAt: new Date() };
        if (plan && ["basic", "standard", "premium"].includes(plan)) {
          subUpdates.plan = plan;
        }
        if (subscriptionStatus === "cancelled" || subscriptionStatus === "expired") {
          subUpdates.status = subscriptionStatus;
        }
        await db
          .update(subscriptions)
          .set(subUpdates)
          .where(eq(subscriptions.id, subRecords[0].id));
      }
    }

    return res.json({ message: "User updated successfully" });
  } catch (err: any) {
    console.error("Error updating user:", err);
    return res.status(500).json({
      message: "Failed to update user",
      error: err.message || String(err)
    });
  }
});

// Exam bodies management
router.get("/exam-bodies", async (_req: Request, res: Response) => {
  try {
    const bodies = await db.select().from(examBodies);
    return res.json(bodies);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch exam bodies", error: String(err) });
  }
});

// Subjects management
router.get("/subjects", async (req: Request, res: Response) => {
  try {
    const { examBodyId, categoryId } = req.query;

    // If filtering by category or exam body, use direct subject relationships
    if (categoryId || examBodyId) {
      const conditions = [];

      if (categoryId) {
        conditions.push(eq(subjects.categoryId, categoryId as string));
      }

      if (examBodyId) {
        conditions.push(eq(subjects.examBodyId, examBodyId as string));
      }

      const subjectsList = await db
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
        .where(and(...conditions))
        .orderBy(subjects.name);

      return res.json(subjectsList);

    }

    // Otherwise, return all subjects
    const subjectsList = await db
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
      .orderBy(subjects.name);

    return res.json(subjectsList);
  } catch (err: any) {
    console.error("[ADMIN] Error fetching subjects:", err);
    return res.status(500).json({
      message: "Failed to fetch subjects",
      error: err?.message || String(err)
    });
  }
});

// Create subject
router.post("/subjects", async (req: Request, res: Response) => {
  try {
    const { name, code, description, isActive, categoryId, examBodyId } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    // Generate code from name if not provided
    const subjectCode = code || name
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 4) || 'SUB';

    // Check if subject already exists
    const existingSubject = await db
      .select()
      .from(subjects)
      .where(eq(subjects.name, name))
      .limit(1);

    let subjectId: string;
    let newSubject: any;

    if (existingSubject.length > 0) {
      // Subject exists, use it
      newSubject = existingSubject[0];
      subjectId = newSubject.id;
    } else {
      // Create new subject with direct category and exam body relationships
      const [createdSubject] = await db
        .insert(subjects)
        .values({
          name,
          code: subjectCode,
          description: description || null,
          isActive: isActive !== undefined ? isActive : true,
          categoryId: categoryId || null,
          examBodyId: examBodyId || null
        })
        .returning();

      newSubject = createdSubject;
      subjectId = createdSubject.id;
    }

    // Return subject with category and exam body info
    return res.json({
      ...newSubject,
      categoryId: categoryId || null,
      examBodyId: examBodyId || null
    });
  } catch (err: any) {
    console.error("[ADMIN] Error creating subject:", err);
    return res.status(500).json({
      message: "Failed to create subject",
      error: err?.message || String(err),
      details: process.env.NODE_ENV === "development" ? err?.stack : undefined
    });
  }
});

// Update subject
router.put("/subjects/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, description, isActive, categoryId, examBodyId } = req.body;

    const updateData: any = {
      updatedAt: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (examBodyId !== undefined) updateData.examBodyId = examBodyId;

    const [updated] = await db
      .update(subjects)
      .set(updateData)
      .where(eq(subjects.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Subject not found" });
    }

    return res.json(updated);
  } catch (err: any) {
    console.error("[ADMIN] Error updating subject:", err);
    return res.status(500).json({
      message: "Failed to update subject",
      error: err?.message || String(err)
    });
  }
});

// Delete subject
router.delete("/subjects/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db.delete(subjects).where(eq(subjects.id, id));
    return res.json({ message: "Subject deleted successfully" });
  } catch (err: any) {
    console.error("[ADMIN] Error deleting subject:", err);
    return res.status(500).json({
      message: "Failed to delete subject",
      error: err?.message || String(err)
    });
  }
});

// Dashboard metrics (per instruction1.md)
router.get("/questions/metrics", async (req: Request, res: Response) => {
  try {
    // Get total questions count
    const totalCount = await db.select({ count: sql<number>`count(*)` }).from(questions);
    const total = Number(totalCount[0]?.count || 0);

    // Get questions by status
    const statusCounts = await db
      .select({
        status: questions.status,
        count: sql<number>`count(*)`
      })
      .from(questions)
      .groupBy(questions.status);

    const statusMap: Record<string, number> = { live: 0, review: 0, disabled: 0 };
    statusCounts.forEach((row: any) => {
      const status = row.status === "approved" ? "live" :
        row.status === "draft" || row.status === "reviewed" ? "review" :
          row.status === "archived" ? "disabled" : row.status;
      if (statusMap.hasOwnProperty(status)) {
        statusMap[status] = Number(row.count || 0);
      }
    });

    // Get questions per exam body
    const examBodyCounts = await db
      .select({
        examBodyId: questions.examBodyId,
        count: sql<number>`count(*)`
      })
      .from(questions)
      .groupBy(questions.examBodyId);

    const examBodyMap: Record<string, number> = {};
    for (const row of examBodyCounts) {
      examBodyMap[row.examBodyId] = Number(row.count || 0);
    }

    // Get questions per subject
    const subjectCounts = await db
      .select({
        subjectId: questions.subjectId,
        count: sql<number>`count(*)`
      })
      .from(questions)
      .groupBy(questions.subjectId);

    const subjectMap: Record<string, number> = {};
    for (const row of subjectCounts) {
      subjectMap[row.subjectId] = Number(row.count || 0);
    }

    return res.json({
      total: total,
      byStatus: statusMap,
      byExamBody: examBodyMap,
      bySubject: subjectMap
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch metrics", error: String(err) });
  }
});

// Questions management (per instruction1.md)
// GET /api/admin/questions?subject_id=UUID
router.get("/questions", async (req: Request, res: Response) => {
  try {
    const { subject_id, subjectId } = req.query;

    // Per instruction1.md: filter by subject_id
    const targetSubjectId = (subject_id || subjectId) as string;

    const conditions: any[] = [];
    if (targetSubjectId) {
      conditions.push(eq(questions.subjectId, targetSubjectId));
    }

    let questionsQuery = db.select().from(questions);

    // Note: Using hard delete (DELETE endpoint deletes records), so no need to filter deleted_at
    // Only fetch questions with status "live", "review", or "disabled" (per instruction1.md)

    if (conditions.length > 0) {
      // @ts-ignore
      questionsQuery = questionsQuery.where(and(...conditions));
    }

    // Sort by creation date (newest first) for easy management
    const questionsList = await questionsQuery.orderBy(desc(questions.createdAt));

    // Fetch options for each question from question_options table
    // CRITICAL: Must fetch from question_options table, not from questions.options JSONB
    const questionsWithOptions = await Promise.all(
      questionsList.map(async (q) => {
        const options = await db
          .select()
          .from(questionOptions)
          .where(eq(questionOptions.questionId, q.id))
          .orderBy(questionOptions.order);

        // Get correct answer from questionOptions table (isCorrect flag)
        const correctOption = options.find(opt => opt.isCorrect);
        const correctAnswer = correctOption?.optionId || null;

        // Map status: old statuses -> new statuses for compatibility
        let mappedStatus = q.status || "review";
        if (mappedStatus === "draft" || mappedStatus === "reviewed") {
          mappedStatus = "review";
        } else if (mappedStatus === "approved") {
          mappedStatus = "live";
        } else if (mappedStatus === "archived") {
          mappedStatus = "disabled";
        }

        return {
          id: q.id,
          text: q.text,
          examBodyId: q.examBodyId,
          categoryId: q.categoryId || null,
          subjectId: q.subjectId,
          topic: q.topic || q.topicId || null,
          status: mappedStatus,
          createdAt: q.createdAt || null,
          options: options.map(opt => ({
            optionId: opt.optionId,
            id: opt.optionId, // Include both id and optionId for compatibility
            text: opt.text,
            isCorrect: opt.isCorrect,
            order: opt.order
          })),
          correctAnswer // Derived from questionOptions.isCorrect flag
        };
      })
    );

    return res.json(questionsWithOptions);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch questions", error: String(err) });
  }
});

// Helper function to create a question for a specific exam body
async function createQuestionForExamBody(
  questionData: any,
  examBodyId: string,
  normalizedOptions: { id: string; text: string }[],
  normalizedCorrectAnswer: string,
  createdBy: string
) {
  const {
    text,
    year,
    topicId,
    subtopicId,
    syllabusId,
    difficulty,
    examTypeId,
    subjectId,
    status,
    type
  } = questionData;

  // Default to live status if not provided
  const questionStatus = status || "live";

  // Validate that examBodyId exists
  const examBodyExists = await db.select().from(examBodies).where(eq(examBodies.id, examBodyId)).limit(1);
  if (examBodyExists.length === 0) {
    throw new Error(`Invalid examBodyId: ${examBodyId}`);
  }

  // Validate examTypeId only if provided (now optional)
  if (examTypeId) {
    const examTypeExists = await db.select().from(examTypes).where(eq(examTypes.id, examTypeId)).limit(1);
    if (examTypeExists.length === 0) {
      throw new Error(`Invalid examTypeId: ${examTypeId}`);
    }
  }

  // Validate subjectId exists
  const subjectExists = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
  if (subjectExists.length === 0) {
    throw new Error(`Invalid subjectId: ${subjectId}`);
  }

  // Set default difficulty if not provided
  const questionDifficulty = difficulty || "medium";

  // Create question
  // NOTE: correctAnswer is NOT stored in questions table - only in questionOptions via isCorrect flag
  const [newQuestion] = await db
    .insert(questions)
    .values({
      text,
      options: normalizedOptions, // Store normalized options as JSONB (secondary source - primary is questionOptions table)
      // correct column may not exist - let database handle this
      // correctAnswer is NOT a column - stored in questionOptions table via isCorrect flag
      year: year || null,
      topicId: topicId || null,
      subtopicId: subtopicId || null,
      syllabusId: syllabusId || null,
      difficulty: questionDifficulty,
      type: type || "multiple_choice",
      examBodyId,
      examTypeId: examTypeId || null, // Made optional - Categories are primary
      subjectId,
      status: questionStatus,
      createdBy
    })
    .returning();

  // Create question options in the questionOptions table
  if (normalizedOptions.length > 0) {
    const optionRecords = normalizedOptions.map((opt, index) => ({
      questionId: newQuestion.id,
      optionId: opt.id,
      text: opt.text,
      order: index,
      isCorrect: opt.id.toLowerCase() === normalizedCorrectAnswer.toLowerCase(),
    }));
    await db.insert(questionOptions).values(optionRecords);
  }

  return newQuestion;
}

// Simple question creation endpoint
router.post("/questions/simple", async (req: Request, res: Response) => {
  try {
    const {
      question,
      options,
      correctAnswer,
      subjectId,
      difficulty = "medium",
      type = "multiple_choice"
    } = req.body;

    // Validation
    if (!question || !options || !correctAnswer || !subjectId) {
      return res.status(400).json({
        message: "question, options, correctAnswer, and subjectId are required"
      });
    }

    // Validate options array
    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        message: "Options must be an array with at least 2 options"
      });
    }

    // Get subject info to determine exam body
    const subjectInfo = await db
      .select({
        examBodyId: subjects.examBodyId,
        categoryId: subjects.categoryId
      })
      .from(subjects)
      .where(eq(subjects.id, subjectId))
      .limit(1);

    if (!subjectInfo.length) {
      return res.status(400).json({
        message: "Invalid subjectId"
      });
    }

    const { examBodyId, categoryId } = subjectInfo[0];

    // Auto-generate options with IDs (A, B, C, D...)
    const formattedOptions = options.map((opt, index) => ({
      id: String.fromCharCode(65 + index), // A, B, C, D...
      text: String(opt).trim()
    }));

    // Validate correct answer exists in options
    const correctOption = formattedOptions.find(opt =>
      opt.id === correctAnswer ||
      opt.text.toLowerCase() === String(correctAnswer).toLowerCase()
    );

    if (!correctOption) {
      return res.status(400).json({
        message: "Correct answer must match one of the options"
      });
    }

    // Create the question following the working pattern (no correct column in questions table)
    const [newQuestion] = await db
      .insert(questions)
      // @ts-ignore
      .values({
        text: question,
        type,
        subjectId,
        examBodyId,
        categoryId,
        status: "live", // Auto-approve for simplicity
        difficulty,
        options: formattedOptions, // Store options as JSONB for backward compatibility
        // correct column may not exist - correct answer stored in question_options table
        createdBy: "system-user", // Use valid system user ID instead of "admin"
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Insert options into question_options table
    for (const option of formattedOptions) {
      await db.insert(questionOptions).values({
        questionId: newQuestion.id,
        optionId: option.id,
        text: option.text,
        isCorrect: option.id === correctOption.id || option.text.toLowerCase() === String(correctAnswer).toLowerCase(),
        order: formattedOptions.indexOf(option)
      });
    }

    // Return the created question with all necessary info for CBT
    return res.json({
      id: newQuestion.id,
      question: newQuestion.text,
      type: newQuestion.type,
      options: formattedOptions,
      correctAnswer: correctOption.id,
      subjectId,
      examBodyId,
      categoryId,
      difficulty: newQuestion.difficulty,
      explanation: null,
      status: newQuestion.status,
      createdAt: newQuestion.createdAt,
      // CBT system marking info
      markingInfo: {
        totalOptions: formattedOptions.length,
        correctOptionId: correctOption.id,
        correctOptionText: correctOption.text,
        questionType: type,
        autoMarkable: true
      }
    });

  } catch (err: any) {
    console.error("[ADMIN] Error creating simple question:", err);
    return res.status(500).json({
      message: "Failed to create question",
      error: err?.message || String(err)
    });
  }
});

// Bulk simple question creation
router.post("/questions/simple/bulk", async (req: Request, res: Response) => {
  try {
    const { questions: questionsArray, subjectId } = req.body;

    if (!Array.isArray(questionsArray) || !subjectId) {
      return res.status(400).json({
        message: "questions array and subjectId are required"
      });
    }

    // Get subject info once
    const subjectInfo = await db
      .select({
        examBodyId: subjects.examBodyId,
        categoryId: subjects.categoryId
      })
      .from(subjects)
      .where(eq(subjects.id, subjectId))
      .limit(1);

    if (!subjectInfo.length) {
      return res.status(400).json({
        message: "Invalid subjectId"
      });
    }

    const { examBodyId, categoryId } = subjectInfo[0];
    const results = [];
    const errors = [];

    for (let i = 0; i < questionsArray.length; i++) {
      const q = questionsArray[i];

      try {
        const {
          question,
          options,
          correctAnswer,
          explanation,
          difficulty = "medium",
          type = "multiple_choice"
        } = q;

        // Validation
        if (!question || !options || !correctAnswer) {
          errors.push({
            index: i,
            error: "question, options, and correctAnswer are required"
          });
          continue;
        }

        if (!Array.isArray(options) || options.length < 2) {
          errors.push({
            index: i,
            error: "Options must be an array with at least 2 options"
          });
          continue;
        }

        // Format options
        const formattedOptions = options.map((opt, index) => ({
          id: String.fromCharCode(65 + index),
          text: String(opt).trim()
        }));

        const correctOption = formattedOptions.find(opt =>
          opt.id === correctAnswer ||
          opt.text.toLowerCase() === String(correctAnswer).toLowerCase()
        );

        if (!correctOption) {
          errors.push({
            index: i,
            error: "Correct answer must match one of the options"
          });
          continue;
        }

        // Create question following the working pattern (no correct column in questions table)
        const [newQuestion] = await db
          .insert(questions)
          // @ts-ignore
          .values({
            text: question,
            type,
            subjectId,
            examBodyId,
            categoryId,
            status: "live",
            difficulty,
            options: formattedOptions, // Store options as JSONB for backward compatibility
            createdBy: "system-user", // Use valid system user ID instead of "admin"
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        // Insert options
        for (const option of formattedOptions) {
          await db.insert(questionOptions).values({
            questionId: newQuestion.id,
            optionId: option.id,
            text: option.text,
            isCorrect: option.id === correctOption.id || option.text.toLowerCase() === String(correctAnswer).toLowerCase(),
            order: formattedOptions.indexOf(option)
          });
        }

        results.push({
          id: newQuestion.id,
          question: newQuestion.text,
          options: formattedOptions,
          correctAnswer: correctOption.id,
          status: newQuestion.status,
          markingInfo: {
            totalOptions: formattedOptions.length,
            correctOptionId: correctOption.id,
            correctOptionText: correctOption.text,
            questionType: type,
            autoMarkable: true
          }
        });

      } catch (err: any) {
        errors.push({
          index: i,
          error: err?.message || String(err)
        });
      }
    }

    return res.json({
      message: `Processed ${questionsArray.length} questions`,
      success: results.length,
      failed: errors.length,
      results,
      errors
    });

  } catch (err: any) {
    console.error("[ADMIN] Error in bulk simple question creation:", err);
    return res.status(500).json({
      message: "Failed to create questions",
      error: err?.message || String(err)
    });
  }
});

router.post("/questions", async (req: Request, res: Response) => {
  try {
    // Handle bulk upload (array of questions)
    if (Array.isArray(req.body)) {
      const results = [];
      const errors = [];

      for (let i = 0; i < req.body.length; i++) {
        const questionItem = req.body[i];
        try {
          const {
            text,
            options,
            correctAnswer,
            explanation,
            briefExplanation,
            detailedExplanation,
            year,
            topicId,
            subtopicId,
            syllabusId,
            difficulty,
            examBodyId, // Single exam body (backward compatible)
            examBodies, // Array of exam bodies (new feature)
            examTypeId,
            subjectId,
            status,
            type,
            createdBy = "system-user" // Use valid system user ID instead of "admin"
          } = questionItem;

          // Determine which exam bodies to use
          let targetExamBodies: string[] = [];
          if (examBodies && Array.isArray(examBodies) && examBodies.length > 0) {
            // New format: multiple exam bodies
            targetExamBodies = examBodies;
          } else if (examBodyId) {
            // Backward compatible: single exam body
            targetExamBodies = [examBodyId];
          } else {
            errors.push({
              index: i,
              error: "Either examBodyId or examBodies array is required"
            });
            continue;
          }

          if (!text || !options || !correctAnswer || !subjectId) {
            errors.push({
              index: i,
              error: "text, options, correctAnswer, and subjectId are required"
            });
            continue;
          }

          // Validate question structure (use first exam body for validation)
          const questionData = {
            examBodyId: targetExamBodies[0], // Use first for validation
            subjectId,
            text,
            options,
            correctAnswer,
            type,
            markingGuide: detailedExplanation || explanation
          };

          const validation = validateAndNormalizeQuestion(questionData);
          if (!validation.valid) {
            errors.push({
              index: i,
              error: "Question validation failed",
              details: validation.errors
            });
            continue;
          }

          const { options: normalizedOptions, correctAnswer: normalizedCorrectAnswer } = validation;

          // Create question for each exam body
          const createdQuestions = [];
          for (const bodyId of targetExamBodies) {
            try {
              const newQuestion = await createQuestionForExamBody(
                {
                  text,
                  year,
                  topicId,
                  subtopicId,
                  syllabusId,
                  difficulty,
                  examTypeId,
                  subjectId,
                  status,
                  type
                },
                bodyId,
                normalizedOptions,
                normalizedCorrectAnswer,
                createdBy
              );
              createdQuestions.push(newQuestion);
            } catch (bodyErr: any) {
              errors.push({
                index: i,
                examBodyId: bodyId,
                error: bodyErr.message || String(bodyErr)
              });
            }
          }

          if (createdQuestions.length > 0) {
            results.push({
              index: i,
              questions: createdQuestions,
              examBodies: targetExamBodies
            });
          }
        } catch (err: any) {
          errors.push({
            index: i,
            error: err.message || String(err)
          });
        }
      }

      return res.status(201).json({
        message: `Processed ${req.body.length} question(s)`,
        created: results.length,
        totalQuestionsCreated: results.reduce((sum, r) => sum + r.questions.length, 0),
        results,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    // Handle single question upload
    const {
      text,
      options,
      correctAnswer,
      explanation,
      briefExplanation,
      detailedExplanation,
      year,
      topicId,
      subtopicId,
      syllabusId,
      difficulty,
      examBodyId, // Single exam body (backward compatible)
      examBodies, // Array of exam bodies (new feature)
      examTypeId,
      subjectId,
      status,
      type,
      createdBy = "system-user" // Use valid system user ID instead of "admin"
    } = req.body;

    // Determine which exam bodies to use
    let targetExamBodies: string[] = [];
    if (examBodies && Array.isArray(examBodies) && examBodies.length > 0) {
      // New format: multiple exam bodies
      targetExamBodies = examBodies;
    } else if (examBodyId) {
      // Backward compatible: single exam body
      targetExamBodies = [examBodyId];
    } else {
      return res.status(400).json({
        message: "Either examBodyId or examBodies array is required"
      });
    }

    if (!text || !options || !correctAnswer || !subjectId) {
      return res.status(400).json({
        message: "text, options, correctAnswer, and subjectId are required"
      });
    }

    // Validate question structure (use first exam body for validation)
    const questionData = {
      examBodyId: targetExamBodies[0], // Use first for validation
      subjectId,
      text,
      options,
      correctAnswer,
      type,
      markingGuide: detailedExplanation || explanation
    };

    const validation = validateAndNormalizeQuestion(questionData);
    if (!validation.valid) {
      return res.status(400).json({
        message: "Question validation failed",
        errors: validation.errors
      });
    }

    const { options: normalizedOptions, correctAnswer: normalizedCorrectAnswer } = validation;

    // Create question for each exam body
    const createdQuestions = [];
    const errors = [];
    for (const bodyId of targetExamBodies) {
      try {
        const newQuestion = await createQuestionForExamBody(
          {
            text,
            year,
            topicId,
            subtopicId,
            syllabusId,
            difficulty,
            examTypeId,
            subjectId,
            status,
            type
          },
          bodyId,
          normalizedOptions,
          normalizedCorrectAnswer,
          createdBy
        );
        createdQuestions.push(newQuestion);
      } catch (bodyErr: any) {
        errors.push({
          examBodyId: bodyId,
          error: bodyErr.message || String(bodyErr)
        });
      }
    }

    if (createdQuestions.length === 0) {
      return res.status(400).json({
        message: "Failed to create question for any exam body",
        errors
      });
    }

    // If only one question created, return single format (backward compatible)
    if (createdQuestions.length === 1 && targetExamBodies.length === 1) {
      return res.status(201).json({
        message: "Question created successfully",
        question: createdQuestions[0]
      });
    }

    // Multiple exam bodies - return array format
    return res.status(201).json({
      message: `Question created successfully for ${createdQuestions.length} exam body/bodies`,
      questions: createdQuestions,
      examBodies: targetExamBodies,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err: any) {
    console.error("Error creating question:", err);
    return res.status(500).json({
      message: "Failed to create question",
      error: err.message || String(err),
      details: process.env.NODE_ENV === "development" ? err?.stack : undefined
    });
  }
});

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

    return res.json(questionRecords[0]);
  } catch (err: any) {
    console.error("Error fetching question:", err);
    return res.status(500).json({
      message: "Failed to fetch question",
      error: err.message || String(err)
    });
  }
});

router.put("/questions/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existingRecords = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
    if (existingRecords.length === 0) {
      return res.status(404).json({ message: "Question not found" });
    }
    const existingQuestion = existingRecords[0];

    const updates: Partial<{
      text: string;
      options: unknown;
      correctAnswer: string;
      explanation: string | null;
      briefExplanation: string | null;
      detailedExplanation: string | null;
      subject: string;
      year: string | null;
      topic: string | null;
      difficulty: "easy" | "medium" | "hard" | null;
      examBodyId: string;
      examTypeId: string;
      subjectId: string;
      status: "live" | "reviewed";
      updatedAt: Date;
    }> = { updatedAt: new Date() };

    const allowedFields = [
      "text", "options", "year", "topicId", "subtopicId", "syllabusId", "difficulty",
      "examBodyId", "examTypeId",
      "subjectId", "status", "type"
    ];

    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        // @ts-ignore
        updates[key] = req.body[key];
      }
    });

    // Normalize options/correctAnswer if provided
    let normalizedOptions: { id: string; text: string }[] | undefined;
    let normalizedCorrectAnswer: string | undefined;
    const requestCorrectAnswer = (req.body?.correctAnswer ?? req.body?.answer ?? req.body?.correct_option) as
      | string
      | undefined;

    if (updates.options || requestCorrectAnswer !== undefined) {
      let sourceOptions: any = updates.options;
      if (!sourceOptions) {
        // Try to load existing options from questionOptions table first
        const existingOpts = await db
          .select()
          .from(questionOptions)
          .where(eq(questionOptions.questionId, id))
          .orderBy(questionOptions.order);
        if (existingOpts.length > 0) {
          sourceOptions = existingOpts.map((opt) => ({ id: opt.optionId, text: opt.text }));
        } else {
          sourceOptions = existingQuestion.options || [];
        }
      }

      const answerForValidation = requestCorrectAnswer ?? "";

      try {
        const questionData = {
          examBodyId: updates.examBodyId || existingQuestion.examBodyId,
          subjectId: updates.subjectId || existingQuestion.subjectId,
          text: updates.text || existingQuestion.text,
          options: sourceOptions,
          correctAnswer: answerForValidation,
          // @ts-ignore
          type: updates.type || existingQuestion.type,
          markingGuide: req.body?.detailedExplanation || req.body?.explanation
        };

        const validation = validateAndNormalizeQuestion(questionData);
        if (!validation.valid) {
          return res.status(400).json({
            message: "Question validation failed",
            errors: validation.errors
          });
        }

        normalizedOptions = validation.options;
        normalizedCorrectAnswer = validation.correctAnswer;
        updates.options = normalizedOptions;
      } catch (err: any) {
        return res.status(400).json({ message: err.message || "Question validation failed" });
      }
    }

    // Validate foreign keys if being updated
    if (updates.examBodyId) {
      const examBodyExists = await db.select().from(examBodies).where(eq(examBodies.id, updates.examBodyId)).limit(1);
      if (examBodyExists.length === 0) {
        return res.status(400).json({ message: "Invalid examBodyId" });
      }
    }
    // Validate examTypeId only if provided (now optional)
    if (updates.examTypeId) {
      const examTypeExists = await db.select().from(examTypes).where(eq(examTypes.id, updates.examTypeId)).limit(1);
      if (examTypeExists.length === 0) {
        return res.status(400).json({ message: "Invalid examTypeId" });
      }
    } else if (updates.examTypeId === null || updates.examTypeId === undefined) {
      // Allow setting examTypeId to null
      // @ts-ignore
      updates.examTypeId = null;
    }
    if (updates.subjectId) {
      const subjectExists = await db.select().from(subjects).where(eq(subjects.id, updates.subjectId)).limit(1);
      if (subjectExists.length === 0) {
        return res.status(400).json({ message: "Invalid subjectId" });
      }
    }

    const [updated] = await db
      .update(questions)
      // @ts-ignore
      .set(updates)
      .where(eq(questions.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Question not found" });
    }

    // If options were updated, refresh questionOptions rows
    if (normalizedOptions) {
      await db.delete(questionOptions).where(eq(questionOptions.questionId, id));
      const optionRecords = normalizedOptions.map((opt, index) => ({
        questionId: id,
        optionId: opt.id,
        text: opt.text,
        order: index,
        isCorrect:
          !!(normalizedCorrectAnswer &&
            opt.id.toLowerCase() === normalizedCorrectAnswer.toLowerCase()),
      }));
      await db.insert(questionOptions).values(optionRecords);
    }

    return res.json({ message: "Question updated successfully", question: updated });
  } catch (err: any) {
    console.error("Error updating question:", err);
    return res.status(500).json({
      message: "Failed to update question",
      error: err.message || String(err)
    });
  }
});

// PATCH /api/admin/questions/:id/status (per instruction1.md - change question status)
router.patch("/questions/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status (per instruction1.md: live, review, disabled)
    const validStatuses = ["live", "review", "disabled"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${validStatuses.join(", ")}`
      });
    }

    const [updated] = await db
      .update(questions)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(questions.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Question not found" });
    }

    return res.json({
      message: `Question status updated to ${status}`,
      question: updated
    });
  } catch (err: any) {
    console.error("Error updating question status:", err);
    return res.status(500).json({
      message: "Failed to update question status",
      error: err.message || String(err)
    });
  }
});

router.delete("/questions/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // CRITICAL: Delete question_options first (foreign key constraint)
    await db.delete(questionOptions).where(eq(questionOptions.questionId, id));

    // Then delete the question (hard delete per instruction1.md)
    await db.delete(questions).where(eq(questions.id, id));

    return res.json({ message: "Question deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting question:", err);
    return res.status(500).json({
      message: "Failed to delete question",
      error: err.message || String(err)
    });
  }
});

// DELETE /api/admin/questions/by-subject/:subject_id (per instruction1.md)
router.delete("/questions/by-subject/:subject_id", async (req: Request, res: Response) => {
  try {
    const { subject_id } = req.params;

    // Get all question IDs for this subject
    const questionRecords = await db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.subjectId, subject_id));

    const questionIds = questionRecords.map(q => q.id);

    if (questionIds.length === 0) {
      return res.json({
        message: "No questions found for this subject",
        deletedCount: 0
      });
    }

    // Delete in transaction
    await db.transaction(async (tx) => {
      // Delete question options first
      await tx.delete(questionOptions).where(
        inArray(questionOptions.questionId, questionIds)
      );

      // Then delete questions
      await tx.delete(questions).where(
        inArray(questions.id, questionIds)
      );
    });

    return res.json({
      message: `Successfully deleted ${questionIds.length} questions for this subject`,
      deletedCount: questionIds.length
    });
  } catch (err: any) {
    console.error("Error deleting questions by subject:", err);
    return res.status(500).json({
      message: "Failed to delete questions by subject",
      error: err.message || String(err)
    });
  }
});

router.post("/questions/bulk-delete", async (req: Request, res: Response) => {
  try {
    const { questionIds, examBodyId, categoryId, subjectId } = req.body;

    // Support both: deleting by IDs array OR by filters
    if (questionIds && Array.isArray(questionIds) && questionIds.length > 0) {
      // Delete by specific question IDs
      await db.delete(questions).where(inArray(questions.id, questionIds));
      return res.json({ message: `Deleted ${questionIds.length} questions` });
    } else if (examBodyId || categoryId || subjectId) {
      // Delete by filters
      const conditions: any[] = [];
      if (examBodyId) {
        conditions.push(eq(questions.examBodyId, examBodyId));
      }
      if (subjectId) {
        conditions.push(eq(questions.subjectId, subjectId));
      }
      // Note: categoryId is not directly on questions table, would need to join with tracks
      // For now, we'll skip categoryId filter or implement it via subjectId if needed

      if (conditions.length === 0) {
        return res.status(400).json({
          message: "Either questionIds array or at least one filter (examBodyId, subjectId) is required"
        });
      }

      // Count questions before deletion
      const questionsToDelete = await db
        .select({ id: questions.id })
        .from(questions)
        .where(and(...conditions));

      const count = questionsToDelete.length;

      if (count === 0) {
        return res.json({ message: "No questions found matching the filters" });
      }

      // Delete questions
      await db.delete(questions).where(and(...conditions));

      return res.json({
        message: `Deleted ${count} questions`,
        deleted_count: count,
        filters: { examBodyId, subjectId }
      });
    } else {
      return res.status(400).json({
        message: "Either questionIds array or filters (examBodyId, subjectId) are required"
      });
    }
  } catch (err: any) {
    console.error("Error bulk deleting questions:", err);
    return res.status(500).json({
      message: "Failed to bulk delete questions",
      error: err.message || String(err)
    });
  }
});

// Bulk upload endpoint for simpler JSON format (from rebuild plan)
// Accepts JSON format: { exam_body, category, subject, questions: [...] }
router.post("/questions/bulk-upload", async (req: Request, res: Response) => {
  try {
    // Accept JSON in request body (can be sent as file or direct JSON)
    let uploadData: any;

    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      // Direct JSON in body
      uploadData = req.body;
    } else {
      return res.status(400).json({
        status: "error",
        message: "Invalid request format. Expected JSON object with exam_body, category, subject, and questions array."
      });
    }

    // Support both ID-based and name-based uploads
    const { exam_body, exam_body_id, category, category_id, subject, subject_id, questions: questionsArray } = uploadData;

    // Validation errors array
    const errors: string[] = [];

    // Validate top-level fields - accept either IDs or names
    const examBodyIdentifier = exam_body_id || exam_body;
    const categoryIdentifier = category_id || category;
    const subjectIdentifier = subject_id || subject;

    if (!examBodyIdentifier || typeof examBodyIdentifier !== "string" || examBodyIdentifier.trim().length === 0) {
      errors.push("exam_body or exam_body_id is required and must be a non-empty string");
    }
    if (!categoryIdentifier || typeof categoryIdentifier !== "string" || categoryIdentifier.trim().length === 0) {
      errors.push("category or category_id is required and must be a non-empty string");
    }
    if (!subjectIdentifier || typeof subjectIdentifier !== "string" || subjectIdentifier.trim().length === 0) {
      errors.push("subject or subject_id is required and must be a non-empty string");
    }
    if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
      errors.push("questions must be a non-empty array");
    }

    if (errors.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors
      });
    }

    // Lookup exam body by ID (preferred) or name (fallback)
    let examBodyRecords;
    if (exam_body_id) {
      // Direct ID lookup
      examBodyRecords = await db
        .select()
        .from(examBodies)
        .where(eq(examBodies.id, exam_body_id.trim()))
        .limit(1);
    } else {
      // Name lookup (case-insensitive)
      examBodyRecords = await db
        .select()
        .from(examBodies)
        .where(
          or(
            ilike(examBodies.name, examBodyIdentifier.trim()),
            ilike(examBodies.id, examBodyIdentifier.trim().toUpperCase())
          )
        )
        .limit(1);
    }

    if (examBodyRecords.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: [`Exam body "${exam_body}" not found in database`]
      });
    }
    const examBodyId = examBodyRecords[0].id;

    // Lookup or create category (per instruction1.md)
    let categoryRecords;
    if (category_id) {
      // Direct ID lookup
      categoryRecords = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.examBodyId, examBodyId),
            eq(categories.id, category_id.trim())
          )
        )
        .limit(1);
    } else {
      // Name lookup (case-insensitive)
      categoryRecords = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.examBodyId, examBodyId),
            ilike(categories.name, categoryIdentifier.trim())
          )
        )
        .limit(1);
    }

    let categoryId: string | null = null;
    if (categoryRecords.length === 0) {
      // Create new category if it doesn't exist (per instruction1.md)
      const [newCategory] = await db
        .insert(categories)
        .values({
          name: categoryIdentifier.trim(),
          examBodyId
        })
        .returning();
      categoryId = newCategory.id;
    } else {
      categoryId = categoryRecords[0].id;
    }

    // Lookup subject by ID (preferred) or name/code (fallback)
    let subjectRecords;
    if (subject_id) {
      // Direct ID lookup
      subjectRecords = await db
        .select()
        .from(subjects)
        .where(eq(subjects.id, subject_id.trim()))
        .limit(1);
    } else {
      // Name/code lookup (case-insensitive)
      subjectRecords = await db
        .select()
        .from(subjects)
        .where(
          or(
            ilike(subjects.name, subjectIdentifier.trim()),
            ilike(subjects.code, subjectIdentifier.trim().toUpperCase().replace(/\s+/g, "_"))
          )
        )
        .limit(1);
    }

    if (subjectRecords.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: [`Subject "${subject}" not found in database`]
      });
    }
    const subjectId = subjectRecords[0].id;

    // Validate each question
    const questionErrors: Array<{ index: number; errors: string[] }> = [];
    const validQuestions: any[] = [];

    for (let i = 0; i < questionsArray.length; i++) {
      const q = questionsArray[i];
      const questionErrorsList: string[] = [];

      // Validate question text
      if (!q.question || typeof q.question !== "string" || q.question.trim().length === 0) {
        questionErrorsList.push("question text is required and must be non-empty");
      }

      // Validate options
      if (!q.options || typeof q.options !== "object" || Array.isArray(q.options)) {
        questionErrorsList.push("options must be an object with keys A, B, C, D (and optionally E)");
      } else {
        const optionKeys = Object.keys(q.options);
        const requiredKeys = ["A", "B", "C", "D"];
        const missingKeys = requiredKeys.filter(key => !optionKeys.includes(key));
        if (missingKeys.length > 0) {
          questionErrorsList.push(`Missing required option keys: ${missingKeys.join(", ")}`);
        }

        // Validate option values are non-empty
        for (const key of optionKeys) {
          const value = q.options[key];
          if (!value || typeof value !== "string" || value.trim().length === 0) {
            questionErrorsList.push(`Option ${key} must have non-empty text`);
          }
        }
      }

      // Validate answer (support both "answer" and "correct_answer" per instruction1.md)
      const answerValue = q.answer || q.correct_answer;
      if (!answerValue || typeof answerValue !== "string") {
        questionErrorsList.push("answer (or correct_answer) is required and must be a string (A, B, C, D, or E)");
      } else {
        const answerKey = answerValue.trim().toUpperCase();
        if (!["A", "B", "C", "D", "E"].includes(answerKey)) {
          questionErrorsList.push(`answer must be one of: A, B, C, D, E (got "${answerValue}")`);
        } else if (q.options && !q.options[answerKey]) {
          questionErrorsList.push(`answer "${answerKey}" does not match any option key`);
        }
      }

      if (questionErrorsList.length > 0) {
        questionErrors.push({ index: i + 1, errors: questionErrorsList });
      } else {
        validQuestions.push(q);
      }
    }

    if (questionErrors.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: questionErrors.map(err => `Question ${err.index}: ${err.errors.join("; ")}`)
      });
    }

    if (validQuestions.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No valid questions found after validation"
      });
    }

    // Convert to current system format and insert questions
    const createdQuestions = [];
    const createdBy = "system-user"; // Use valid system user ID instead of "admin"

    // Use transaction for data integrity
    await db.transaction(async (tx) => {
      for (const q of validQuestions) {
        // DIAGNOSTIC LOGGING - Step 1: Log raw question data
        console.log("[BULK UPLOAD] Processing question:", {
          question: q.question,
          options: q.options,
          answer: q.answer
        });

        // Convert options object to array format
        const optionsArray = Object.keys(q.options)
          .sort() // A, B, C, D, E
          .map((key) => ({
            id: key,
            text: String(q.options[key]).trim()
          }));

        // Support both "answer" and "correct_answer" per instruction1.md
        const answerValue = q.answer || q.correct_answer;
        const correctAnswer = answerValue.trim().toUpperCase();

        // DIAGNOSTIC LOGGING - Step 2: Log converted data
        console.log("[BULK UPLOAD] Converted data:", {
          optionsArray,
          correctAnswer
        });

        // Validate question using existing validation function
        const questionData = {
          examBodyId,
          subjectId,
          text: q.question.trim(),
          options: optionsArray,
          correctAnswer,
          type: "multiple_choice"
        };

        const validation = validateAndNormalizeQuestion(questionData);
        if (!validation.valid) {
          console.error("[BULK UPLOAD] Validation failed:", validation.errors);
          throw new Error(`Question validation failed: ${validation.errors.join(", ")}`);
        }

        const { options: normalizedOptions, correctAnswer: normalizedCorrectAnswer } = validation;

        // DIAGNOSTIC LOGGING - Step 3: Log normalized data before insert
        console.log("[BULK UPLOAD] Normalized data before insert:", {
          normalizedOptions,
          normalizedCorrectAnswer,
          questionText: q.question.trim(),
          topic: q.topic || null,
          categoryId
        });

        // Create question (per instruction1.md: default status is "review")
        // NOTE: correctAnswer is NOT stored in questions table - only in questionOptions via isCorrect flag
        const [newQuestion] = await tx
          .insert(questions)
          .values({
            text: q.question.trim(),
            options: normalizedOptions, // Store options as JSONB for backward compatibility (secondary source)
            // correctAnswer is NOT a column - stored in questionOptions table via isCorrect flag
            difficulty: "medium",
            type: "multiple_choice",
            examBodyId,
            categoryId, // NEW: Required per instruction1.md
            subjectId,
            topic: q.topic || null, // Optional topic per instruction1.md
            status: "live", // Questions should be live for practice tests
            createdBy
          })
          .returning();

        // DIAGNOSTIC LOGGING - Step 4: Log inserted question
        console.log("[BULK UPLOAD] Question inserted:", {
          id: newQuestion.id,
          text: newQuestion.text,
          options: newQuestion.options
          // correctAnswer is stored in questionOptions table, not here
        });

        // Create question options
        if (normalizedOptions.length > 0) {
          const optionRecords = normalizedOptions.map((opt, index) => ({
            questionId: newQuestion.id,
            optionId: opt.id,
            text: opt.text,
            order: index,
            isCorrect: opt.id.toLowerCase() === normalizedCorrectAnswer.toLowerCase()
          }));

          // DIAGNOSTIC LOGGING - Step 5: Log option records before insert
          console.log("[BULK UPLOAD] Option records to insert:", optionRecords);

          await tx.insert(questionOptions).values(optionRecords);

          // DIAGNOSTIC LOGGING - Step 6: Verify options were inserted
          const insertedOptions = await tx
            .select()
            .from(questionOptions)
            .where(eq(questionOptions.questionId, newQuestion.id));
          console.log("[BULK UPLOAD] Options inserted and verified:", insertedOptions);
        }

        createdQuestions.push(newQuestion);
      }
    });

    return res.status(201).json({
      status: "success",
      message: `${createdQuestions.length} questions uploaded successfully`,
      total_uploaded: createdQuestions.length,
      exam_body: exam_body,
      category: category,
      subject: subject
    });
  } catch (err: any) {
    console.error("Error in bulk upload:", err);
    return res.status(500).json({
      status: "error",
      message: "Failed to upload questions",
      error: err.message || String(err),
      details: process.env.NODE_ENV === "development" ? err?.stack : undefined
    });
  }
});

// Copy questions between exam bodies
router.post("/questions/copy", async (req: Request, res: Response) => {
  try {
    const {
      sourceExamBodyId,
      sourceCategoryId,
      sourceSubjectId,
      destinationExamBodyId
    } = req.body;

    // Validation
    if (!sourceExamBodyId || !destinationExamBodyId) {
      return res.status(400).json({
        message: "sourceExamBodyId and destinationExamBodyId are required"
      });
    }

    if (sourceExamBodyId === destinationExamBodyId) {
      return res.status(400).json({
        message: "Source and destination exam bodies must be different"
      });
    }

    // Verify exam bodies exist
    const sourceExamBody = await db.select().from(examBodies).where(eq(examBodies.id, sourceExamBodyId)).limit(1);
    const destExamBody = await db.select().from(examBodies).where(eq(examBodies.id, destinationExamBodyId)).limit(1);

    if (sourceExamBody.length === 0) {
      return res.status(400).json({ message: "Source exam body not found" });
    }
    if (destExamBody.length === 0) {
      return res.status(400).json({ message: "Destination exam body not found" });
    }

    // Build query conditions
    const conditions: any[] = [eq(questions.examBodyId, sourceExamBodyId)];
    if (sourceSubjectId) {
      conditions.push(eq(questions.subjectId, sourceSubjectId));
    }

    // Fetch matching questions
    const sourceQuestions = await db
      .select()
      .from(questions)
      .where(and(...conditions));

    if (sourceQuestions.length === 0) {
      return res.status(404).json({
        message: "No questions found matching the source criteria"
      });
    }

    // Copy questions in transaction
    const copiedQuestions = [];
    const createdBy = "system-user"; // Use valid system user ID instead of "admin"

    await db.transaction(async (tx) => {
      for (const sourceQ of sourceQuestions) {
        // Fetch options for source question
        const sourceOptions = await tx
          .select()
          .from(questionOptions)
          .where(eq(questionOptions.questionId, sourceQ.id))
          .orderBy(questionOptions.order);

        // Create new question with destination exam body
        const [newQuestion] = await tx
          .insert(questions)
          .values({
            text: sourceQ.text,
            options: sourceQ.options,
            difficulty: sourceQ.difficulty,
            type: sourceQ.type,
            examBodyId: destinationExamBodyId,
            subjectId: sourceQ.subjectId, // Keep same subject
            status: sourceQ.status,
            createdBy
          })
          .returning();

        // Copy options
        if (sourceOptions.length > 0) {
          const optionRecords = sourceOptions.map((opt) => ({
            questionId: newQuestion.id,
            optionId: opt.optionId,
            text: opt.text,
            order: opt.order,
            isCorrect: opt.isCorrect
          }));
          await tx.insert(questionOptions).values(optionRecords);
        }

        copiedQuestions.push(newQuestion);
      }
    });

    return res.status(201).json({
      message: `Successfully copied ${copiedQuestions.length} questions`,
      total_copied: copiedQuestions.length,
      source_exam_body: sourceExamBodyId,
      destination_exam_body: destinationExamBodyId
    });
  } catch (err: any) {
    console.error("Error copying questions:", err);
    return res.status(500).json({
      message: "Failed to copy questions",
      error: err.message || String(err)
    });
  }
});

// Get sample JSON file for bulk upload
router.get("/questions/bulk-upload/sample", async (_req: Request, res: Response) => {
  const sampleJson = {
    exam_body: "WAEC",
    category: "Science",
    subject: "Mathematics",
    questions: [
      {
        question: "What is 2 + 2?",
        options: {
          A: "3",
          B: "4",
          C: "5",
          D: "6"
        },
        answer: "B"
      },
      {
        question: "What is the square root of 16?",
        options: {
          A: "2",
          B: "3",
          C: "4",
          D: "5"
        },
        answer: "C"
      },
      {
        question: "What is 10 - 5?",
        options: {
          A: "3",
          B: "4",
          C: "5",
          D: "6"
        },
        answer: "C"
      }
    ]
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", "attachment; filename=sample-questions.json");
  return res.json(sampleJson);
});

// Question Bank Diagnostics Endpoint
router.get("/questions/diagnostics", async (_req: Request, res: Response) => {
  try {
    const allQuestions = await db.select().from(questions);

    const diagnostics = {
      totalQuestions: allQuestions.length,
      problems: [] as Array<{ type: string; questionId: string; issue: string; severity: "error" | "warning" }>,
      statistics: {
        questionsWithNoText: 0,
        questionsWithInvalidOptions: 0,
        questionsWithMismatchedAnswer: 0,
        questionsWithMissingFields: 0,
        questionsWithEmptyOptions: 0,
        questionsWithInvalidStatus: 0,
        questionsWithNoOptions: 0,
      },
    };

    for (const question of allQuestions) {
      const issues: Array<{ type: string; issue: string; severity: "error" | "warning" }> = [];

      // Check 1: Missing or empty text
      if (!question.text || typeof question.text !== "string" || question.text.trim().length === 0) {
        issues.push({ type: "missing_text", issue: "Question text is missing or empty", severity: "error" });
        diagnostics.statistics.questionsWithNoText++;
      }

      // Check 2: Invalid options structure
      let options: any = question.options;
      if (!options) {
        issues.push({ type: "no_options", issue: "Options field is missing", severity: "error" });
        diagnostics.statistics.questionsWithNoOptions++;
      } else {
        // Try to parse if string
        if (typeof options === "string") {
          try {
            options = JSON.parse(options);
          } catch {
            issues.push({ type: "invalid_options", issue: "Options is invalid JSON string", severity: "error" });
            diagnostics.statistics.questionsWithInvalidOptions++;
          }
        }

        // Check if options is an array
        if (!Array.isArray(options)) {
          issues.push({ type: "invalid_options", issue: "Options is not an array", severity: "error" });
          diagnostics.statistics.questionsWithInvalidOptions++;
        } else {
          // Check if options array is empty
          if (options.length === 0) {
            issues.push({ type: "empty_options", issue: "Options array is empty", severity: "error" });
            diagnostics.statistics.questionsWithEmptyOptions++;
          } else if (options.length < 2) {
            issues.push({ type: "insufficient_options", issue: `Only ${options.length} option(s) found (need at least 2)`, severity: "error" });
            diagnostics.statistics.questionsWithInvalidOptions++;
          } else {
            // Check each option for missing text
            const optionsWithIssues = options.filter((opt: any, idx: number) => {
              if (typeof opt === "string") {
                return opt.trim().length === 0;
              }
              if (opt && typeof opt === "object") {
                const text = opt.text || opt.content || opt.label || opt.value;
                return !text || String(text).trim().length === 0;
              }
              return true;
            });

            if (optionsWithIssues.length > 0) {
              issues.push({
                type: "empty_option_text",
                issue: `${optionsWithIssues.length} option(s) have empty or missing text`,
                severity: "warning"
              });
            }
          }
        }
      }

      // Check 3: Missing correct answer
      // @ts-ignore
      if (!question.correctAnswer || typeof question.correctAnswer !== "string" || question.correctAnswer.trim().length === 0) {
        issues.push({ type: "missing_correct_answer", issue: "Correct answer is missing or empty", severity: "error" });
        diagnostics.statistics.questionsWithMissingFields++;
      } else if (options && Array.isArray(options)) {
        // Check if correct answer matches any option
        const formattedOptions = formatQuestionOptions(options);
        const optionIds = formattedOptions.map(opt => opt.id.toLowerCase());
        const optionTexts = formattedOptions.map(opt => opt.text.toLowerCase().trim());
        // @ts-ignore
        const correctAnswerLower = question.correctAnswer.toLowerCase().trim();

        const answerExists =
          optionIds.includes(correctAnswerLower) ||
          optionTexts.includes(correctAnswerLower) ||
          formattedOptions.some(opt =>
            opt.id.toLowerCase() === correctAnswerLower ||
            opt.text.toLowerCase().trim() === correctAnswerLower
          );

        if (!answerExists) {
          issues.push({
            type: "mismatched_answer",
            // @ts-ignore
            issue: `Correct answer "${question.correctAnswer}" does not match any option`,
            severity: "error"
          });
          diagnostics.statistics.questionsWithMismatchedAnswer++;
        }
      }

      // Check 4: Missing required foreign keys
      if (!question.examBodyId) {
        issues.push({ type: "missing_exam_body", issue: "examBodyId is missing", severity: "error" });
        diagnostics.statistics.questionsWithMissingFields++;
      }
      if (!question.examTypeId) {
        issues.push({ type: "missing_exam_type", issue: "examTypeId is missing", severity: "error" });
        diagnostics.statistics.questionsWithMissingFields++;
      }
      if (!question.subjectId) {
        issues.push({ type: "missing_subject", issue: "subjectId is missing", severity: "error" });
        diagnostics.statistics.questionsWithMissingFields++;
      }

      // Check 5: Invalid status
      if (question.status && !["live", "reviewed"].includes(question.status)) {
        issues.push({ type: "invalid_status", issue: `Invalid status: ${question.status}`, severity: "warning" });
        diagnostics.statistics.questionsWithInvalidStatus++;
      }

      // Add all issues for this question
      issues.forEach(issue => {
        diagnostics.problems.push({
          questionId: question.id,
          ...issue,
        });
      });
    }

    // Calculate summary
    const errorCount = diagnostics.problems.filter(p => p.severity === "error").length;
    const warningCount = diagnostics.problems.filter(p => p.severity === "warning").length;
    const healthyQuestions = diagnostics.totalQuestions - errorCount;

    return res.json({
      ...diagnostics,
      summary: {
        totalProblems: diagnostics.problems.length,
        errors: errorCount,
        warnings: warningCount,
        healthyQuestions,
        healthPercentage: diagnostics.totalQuestions > 0
          ? Math.round((healthyQuestions / diagnostics.totalQuestions) * 100)
          : 100,
      },
    });
  } catch (err: any) {
    console.error("Error running question diagnostics:", err);
    return res.status(500).json({
      message: "Failed to run diagnostics",
      error: err.message || String(err)
    });
  }
});

// Fix missing options endpoint - migrates options from JSONB to questionOptions table
router.post("/questions/fix-options", async (req: Request, res: Response) => {
  try {
    const { questionIds } = req.body; // Optional: specific question IDs to fix

    // Get questions to fix
    let questionsToFix;
    if (questionIds && Array.isArray(questionIds) && questionIds.length > 0) {
      questionsToFix = await db
        .select()
        .from(questions)
        .where(inArray(questions.id, questionIds));
    } else {
      questionsToFix = await db.select().from(questions);
    }

    let fixedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const results: { questionId: string; status: string; message: string }[] = [];

    for (const question of questionsToFix) {
      // Check if question already has options in questionOptions table
      const existingOptions = await db
        .select()
        .from(questionOptions)
        .where(eq(questionOptions.questionId, question.id));

      if (existingOptions.length > 0) {
        skippedCount++;
        results.push({ questionId: question.id, status: "skipped", message: "Already has options" });
        continue;
      }

      // Try to get options from the JSONB field
      let parsedOptions: any[] = [];
      if (question.options) {
        try {
          parsedOptions = typeof question.options === "string"
            ? JSON.parse(question.options as string)
            : (question.options as any[]);

          if (!Array.isArray(parsedOptions)) {
            parsedOptions = [];
          }
        } catch {
          parsedOptions = [];
        }
      }

      // Check if JSONB options have valid text
      const hasValidOptions = parsedOptions.length >= 2 && parsedOptions.every((opt: any) => {
        const text = opt?.text || opt?.content || (typeof opt === "string" ? opt : null);
        return text && String(text).trim().length > 0 && !String(text).startsWith("Option ");
      });

      if (hasValidOptions) {
        try {
          // Create questionOptions from JSONB
          const optionRecords = parsedOptions.map((opt: any, index: number) => {
            const optionId = opt.id || opt.optionId || String.fromCharCode(65 + index);
            const optionText = opt.text || opt.content || String(opt);
            // @ts-ignore
            const isCorrect = String(optionId).toUpperCase() === String(question.correctAnswer).toUpperCase();

            return {
              questionId: question.id,
              optionId,
              text: optionText,
              order: index,
              isCorrect,
            };
          });

          await db.insert(questionOptions).values(optionRecords);
          fixedCount++;
          results.push({ questionId: question.id, status: "fixed", message: `Created ${optionRecords.length} options` });
        } catch (err: any) {
          failedCount++;
          results.push({ questionId: question.id, status: "failed", message: err.message || String(err) });
        }
      } else {
        failedCount++;
        results.push({ questionId: question.id, status: "needs_manual_fix", message: "No valid options in JSONB field" });
      }
    }

    return res.json({
      message: "Options fix completed",
      summary: {
        total: questionsToFix.length,
        fixed: fixedCount,
        skipped: skippedCount,
        failed: failedCount,
      },
      results: results.slice(0, 100), // Limit results in response
    });
  } catch (err: any) {
    console.error("Error fixing options:", err);
    return res.status(500).json({
      message: "Failed to fix options",
      error: err.message || String(err)
    });
  }
});

// Bulk delete ALL questions (dangerous operation)
router.delete("/questions/bulk-delete-all", async (req: Request, res: Response) => {
  try {
    const { confirmation } = req.body;

    // Require explicit confirmation
    if (confirmation !== "DELETE ALL QUESTIONS") {
      return res.status(400).json({
        message: "Confirmation required. Must send { confirmation: 'DELETE ALL QUESTIONS' }"
      });
    }

    // Get count and IDs before deletion for logging
    const allQuestions = await db.select({ id: questions.id }).from(questions);
    const totalCount = allQuestions.length;
    const questionIds = allQuestions.map(q => q.id);

    if (totalCount === 0) {
      return res.json({ message: "No questions to delete", deletedCount: 0 });
    }

    console.log(`[BULK DELETE ALL] Starting deletion of ${totalCount} questions...`);

    // Use direct SQL for more reliable deletion
    await db.transaction(async (tx) => {
      // Delete question options first
      await tx.execute(sql`DELETE FROM question_options WHERE question_id = ANY(${questionIds})`);
      console.log(`[BULK DELETE ALL] Deleted question_options for ${questionIds.length} questions`);

      // Delete questions
      await tx.execute(sql`DELETE FROM questions WHERE id = ANY(${questionIds})`);
      console.log(`[BULK DELETE ALL] Deleted ${questionIds.length} questions`);
    });

    // Verify deletion
    const countAfter = await db.select({ count: sql<number>`count(*)` }).from(questions);
    const remainingCount = Number(countAfter[0]?.count || 0);

    if (remainingCount > 0) {
      console.error(`[BULK DELETE ALL] ⚠️ WARNING: ${remainingCount} questions still remain after deletion!`);
      return res.status(500).json({
        message: `Deletion incomplete. ${remainingCount} questions still remain.`,
        deletedCount: totalCount - remainingCount,
        remainingCount: remainingCount
      });
    }

    console.log(`[BULK DELETE ALL] ✅ Successfully deleted ${totalCount} questions and all related records`);

    return res.json({
      message: `Successfully deleted ${totalCount} questions and all related records`,
      deletedCount: totalCount,
      verified: true
    });
  } catch (err: any) {
    console.error("[BULK DELETE ALL] Error bulk deleting questions:", err);
    return res.status(500).json({
      message: "Failed to bulk delete questions",
      error: err.message || String(err),
      stack: process.env.NODE_ENV === "development" ? err?.stack : undefined
    });
  }
});

// =====================================================
// BLOG/RESOURCES MANAGEMENT
// =====================================================

router.get("/blog", async (req: Request, res: Response) => {
  try {
    const { category, featured, contentType, subject, examBodyId, limit = 50, search, published } = req.query;

    let conditions: any[] = [];

    // If published is specified, filter by it; otherwise show all for admin
    if (published !== undefined) {
      conditions.push(eq(blogPosts.published, published === "true"));
    }

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

    const whereClause = conditions.length > 1 ? and(...conditions) : (conditions[0] || undefined);

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

router.get("/blog/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const postRecords = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    if (postRecords.length === 0) {
      return res.status(404).json({ message: "Blog post not found" });
    }

    return res.json(postRecords[0]);
  } catch (err: any) {
    console.error("Error fetching blog post:", err);
    return res.status(500).json({ message: "Failed to fetch blog post", error: err.message || String(err) });
  }
});

router.post("/blog", async (req: Request, res: Response) => {
  try {
    const {
      title,
      slug,
      content,
      excerpt,
      videoUrl,
      videoEmbedCode,
      fileUrl,
      externalUrl,
      author,
      category,
      contentType,
      subject,
      examBodyId,
      priority,
      metadata,
      tags,
      featured,
      published
    } = req.body;

    if (!title || !slug || !content) {
      return res.status(400).json({ message: "Title, slug, and content are required" });
    }

    const [newPost] = await db.insert(blogPosts).values({
      title,
      slug,
      content,
      excerpt,
      videoUrl,
      videoEmbedCode,
      fileUrl,
      externalUrl,
      author: author || "PrepMaster Team",
      category,
      contentType: contentType || "note",
      subject,
      examBodyId,
      priority: priority || 0,
      metadata,
      tags: tags || [],
      featured: featured || false,
      published: published !== undefined ? published : true
    }).returning();

    return res.status(201).json(newPost);
  } catch (err: any) {
    console.error("Error creating blog post:", err);
    return res.status(500).json({ message: "Failed to create blog post", error: err.message || String(err) });
  }
});

router.put("/blog/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates: Partial<{
      title: string;
      slug: string;
      content: string;
      excerpt: string;
      videoUrl: string;
      videoEmbedCode: string;
      fileUrl: string;
      externalUrl: string;
      author: string;
      category: string;
      contentType: string;
      subject: string;
      examBodyId: string;
      priority: number;
      metadata: any;
      tags: string[];
      featured: boolean;
      published: boolean;
      views: number;
      updatedAt: Date;
    }> = { updatedAt: new Date() };

    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        // @ts-ignore
        updates[key] = req.body[key];
      }
    });

    const [updated] = await db.update(blogPosts)
      // @ts-ignore
      .set(updates)
      .where(eq(blogPosts.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Blog post not found" });
    }

    return res.json(updated);
  } catch (err: any) {
    console.error("Error updating blog post:", err);
    return res.status(500).json({ message: "Failed to update blog post", error: err.message || String(err) });
  }
});

router.delete("/blog/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db.delete(blogPosts).where(eq(blogPosts.id, id));

    return res.json({ message: "Blog post deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting blog post:", err);
    return res.status(500).json({ message: "Failed to delete blog post", error: err.message || String(err) });
  }
});

export default router;
