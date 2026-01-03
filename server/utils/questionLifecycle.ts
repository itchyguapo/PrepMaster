import { db } from "../db";
import { questions, questionVersions, questionOptions, markingGuides, users } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export type QuestionStatus = "draft" | "reviewed" | "approved" | "live" | "archived";

export interface QuestionTransition {
  from: QuestionStatus;
  to: QuestionStatus;
  allowed: boolean;
  requiresApproval?: boolean;
  autoTransition?: boolean;
}

/**
 * Question Lifecycle Management
 * Handles versioning, approval workflow, and status transitions
 */

// Valid status transitions
const STATUS_TRANSITIONS: QuestionTransition[] = [
  { from: "draft", to: "reviewed", allowed: true },
  { from: "draft", to: "archived", allowed: true },
  { from: "reviewed", to: "draft", allowed: true }, // Send back for revision
  { from: "reviewed", to: "approved", allowed: true, requiresApproval: true },
  { from: "reviewed", to: "archived", allowed: true },
  { from: "approved", to: "live", allowed: true, autoTransition: true },
  { from: "approved", to: "reviewed", allowed: true }, // Rare case
  { from: "live", to: "archived", allowed: true },
  { from: "archived", to: "draft", allowed: true }, // Reactivate archived question
];

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: QuestionStatus, to: QuestionStatus): boolean {
  return STATUS_TRANSITIONS.some(t => t.from === from && t.to === to && t.allowed);
}

/**
 * Get next valid transitions for a question status
 */
export function getValidTransitions(currentStatus: QuestionStatus): QuestionStatus[] {
  return STATUS_TRANSITIONS
    .filter(t => t.from === currentStatus && t.allowed)
    .map(t => t.to);
}

/**
 * Create a new question version before making changes
 */
export async function createQuestionVersion(
  questionId: string,
  changedBy: string,
  changeReason?: string
): Promise<void> {
  try {
    // Get current question data
    const questionData = await db
      .select()
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);

    if (questionData.length === 0) {
      throw new Error("Question not found");
    }

    const question = questionData[0];

    // Get current options
    const options = await db
      .select()
      .from(questionOptions)
      .where(eq(questionOptions.questionId, questionId));

    // Get current marking guides (if any)
    const guides = await db
      .select()
      .from(markingGuides)
      .where(eq(markingGuides.questionId, questionId));

    // Get next version number
    const lastVersion = await db
      .select({ version: questionVersions.version })
      .from(questionVersions)
      .where(eq(questionVersions.questionId, questionId))
      .orderBy(desc(questionVersions.version))
      .limit(1);

    const nextVersion = (lastVersion[0]?.version || 0) + 1;

    // Create version snapshot
    await db.insert(questionVersions).values({
      // @ts-ignore
      questionId,
      version: nextVersion,

      text: question.text,
      type: question.type,
      difficulty: question.difficulty,
      marks: question.marks,
      examBodyId: question.examBodyId,
      examTypeId: question.examTypeId,
      subjectId: question.subjectId,
      syllabusId: question.syllabusId,
      topicId: question.topicId,
      subtopicId: question.subtopicId,
      options: options.map(opt => ({
        id: opt.optionId,
        text: opt.text,
        isCorrect: opt.isCorrect
      })),
      markingGuides: guides.map(guide => ({
        criteria: guide.criteria,
        description: guide.description,
        marks: guide.marks
      })),
      changeReason,
      changedBy
    });

  } catch (error) {
    console.error("[QUESTION_LIFECYCLE] Error creating question version:", error);
    throw error;
  }
}

/**
 * Transition question status with validation
 */
export async function transitionQuestionStatus(
  questionId: string,
  newStatus: QuestionStatus,
  userId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get current question
    const questionData = await db
      .select({ status: questions.status, createdBy: questions.createdBy })
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);

    if (questionData.length === 0) {
      return { success: false, message: "Question not found" };
    }

    const currentStatus = questionData[0].status as QuestionStatus;

    // Validate transition
    if (!isValidTransition(currentStatus, newStatus)) {
      return {
        success: false,
        message: `Invalid status transition from ${currentStatus} to ${newStatus}`
      };
    }

    // Create version snapshot for significant changes
    if (["approved", "live", "archived"].includes(newStatus)) {
      await createQuestionVersion(questionId, userId, `Status changed to ${newStatus}: ${reason || ""}`);
    }

    // Update question status
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date()
    };

    // Set appropriate timestamps and user fields
    switch (newStatus) {
      case "reviewed":
        updateData.reviewedBy = userId;
        updateData.reviewedAt = new Date();
        break;
      case "approved":
        updateData.approvedBy = userId;
        updateData.approvedAt = new Date();
        break;
      case "archived":
        updateData.archivedBy = userId;
        updateData.archivedAt = new Date();
        updateData.archiveReason = reason;
        break;
    }

    await db.update(questions)
      .set(updateData)
      .where(eq(questions.id, questionId));

    return { success: true, message: `Question status updated to ${newStatus}` };

  } catch (error) {
    console.error("[QUESTION_LIFECYCLE] Error transitioning question status:", error);
    return { success: false, message: "Failed to update question status" };
  }
}

/**
 * Bulk status transition for multiple questions
 */
export async function bulkTransitionQuestions(
  questionIds: string[],
  newStatus: QuestionStatus,
  userId: string,
  reason?: string
): Promise<{ successCount: number; failures: Array<{ id: string; message: string }> }> {
  const results = {
    successCount: 0,
    failures: [] as Array<{ id: string; message: string }>
  };

  for (const questionId of questionIds) {
    const result = await transitionQuestionStatus(questionId, newStatus, userId, reason);
    if (result.success) {
      results.successCount++;
    } else {
      results.failures.push({ id: questionId, message: result.message });
    }
  }

  return results;
}

/**
 * Get question version history
 */
export async function getQuestionVersions(questionId: string) {
  try {
    const versions = await db
      .select({
        version: questionVersions,
        changedBy: {
          id: users.id,
          username: users.username
        }
      })
      .from(questionVersions)
      .innerJoin(users, eq(questionVersions.changedBy, users.id))
      .where(eq(questionVersions.questionId, questionId))
      .orderBy(desc(questionVersions.createdAt));

    return versions;
  } catch (error) {
    console.error("[QUESTION_LIFECYCLE] Error getting question versions:", error);
    return [];
  }
}

/**
 * Restore question from a specific version
 */
export async function restoreQuestionVersion(
  questionId: string,
  versionNumber: number,
  restoredBy: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get the version to restore
    const versionData = await db
      .select()
      .from(questionVersions)
      .where(and(
        eq(questionVersions.questionId, questionId),
        eq(questionVersions.version, versionNumber)
      ))
      .limit(1);

    if (versionData.length === 0) {
      return { success: false, message: "Version not found" };
    }

    const version = versionData[0];

    // Create a new version with current state before restoring
    await createQuestionVersion(questionId, restoredBy, `Restored to version ${versionNumber}`);

    // Restore question data
    await db.update(questions)
      .set({
        text: version.text,
        type: version.type,
        difficulty: version.difficulty || "medium",

        marks: version.marks,
        syllabusId: version.syllabusId,
        topicId: version.topicId,
        subtopicId: version.subtopicId,
        updatedAt: new Date()
      })
      .where(eq(questions.id, questionId));

    // Restore options (delete current, insert from version)
    await db.delete(questionOptions).where(eq(questionOptions.questionId, questionId));

    if (version.options && Array.isArray(version.options)) {
      const optionsToInsert = version.options.map((opt: any, index: number) => ({
        questionId,
        optionId: opt.id,
        text: opt.text,
        order: index,
        isCorrect: opt.isCorrect
      }));

      for (const option of optionsToInsert) {
        await db.insert(questionOptions).values(option);
      }
    }

    return { success: true, message: `Question restored to version ${versionNumber}` };

  } catch (error) {
    console.error("[QUESTION_LIFECYCLE] Error restoring question version:", error);
    return { success: false, message: "Failed to restore question version" };
  }
}

/**
 * Get questions pending review
 */
export async function getQuestionsPendingReview(examBodyId?: string) {
  try {
    const conditions = [eq(questions.status, "reviewed")];

    if (examBodyId) {
      conditions.push(eq(questions.examBodyId, examBodyId));
    }

    const pendingQuestions = await db
      .select({
        question: questions,
        createdBy: {
          id: users.id,
          username: users.username
        }
      })
      .from(questions)
      .innerJoin(users, eq(questions.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(questions.createdAt));

    return pendingQuestions;

  } catch (error) {
    console.error("[QUESTION_LIFECYCLE] Error getting pending reviews:", error);
    return [];
  }
}
