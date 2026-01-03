import { db } from "../db";
import { questions, examTypes, subjects, syllabi, topics, subtopics } from "@shared/schema";
import { eq, and, inArray, sql, gte, lte, or, ilike } from "drizzle-orm";
import { getSubjectIdsForTrack } from "./trackSubjectResolver";

export interface QuestionFilterCriteria {
  // Hierarchical filters
  examBodyId?: string;
  examTypeId?: string;
  trackId?: string; // Will resolve to subject IDs
  subjectIds?: string[];
  syllabusId?: string;
  topicId?: string;
  subtopicId?: string;

  // Question attributes
  difficulty?: ("easy" | "medium" | "hard")[];
  type?: ("multiple_choice" | "true_false" | "short_answer" | "essay")[];
  status?: ("draft" | "reviewed" | "approved" | "live" | "archived")[];

  // Content filters
  year?: string;
  source?: string;
  tags?: string[];

  // Search
  searchText?: string;

  // Limits
  limit?: number;
  offset?: number;

  // Ordering
  orderBy?: "created_at" | "difficulty" | "usage_count" | "random";
  orderDirection?: "asc" | "desc";
}

export interface FilteredQuestionsResult {
  questions: any[];
  totalCount: number;
  appliedFilters: {
    examBodyId?: string;
    examTypeId?: string;
    resolvedSubjectIds?: string[];
    trackId?: string;
    subjectIds?: string[];
    difficulty?: string[];
    status?: string[];
  };
}

/**
 * Advanced question filtering with hierarchical scoping
 * Supports the simplified CBT structure: Exam Body → Category (Track) → Subjects → Syllabus → Topics
 * Exam Type is optional (for backward compatibility)
 */
export async function filterQuestions(criteria: QuestionFilterCriteria): Promise<FilteredQuestionsResult> {
  try {
    let whereConditions = [];
    let resolvedSubjectIds: string[] | undefined;
    const appliedFilters: any = {};

    // 1. Hierarchical filtering (most important)

    // Exam Body filter
    if (criteria.examBodyId) {
      whereConditions.push(eq(questions.examBodyId, criteria.examBodyId));
      appliedFilters.examBodyId = criteria.examBodyId;
    }

    // Exam Type filter (optional - Categories are primary)
    if (criteria.examTypeId) {
      whereConditions.push(eq(questions.examTypeId, criteria.examTypeId));
      appliedFilters.examTypeId = criteria.examTypeId;
    }
    // Note: Questions without examTypeId are included when examTypeId is not specified

    // Track → Subject resolution (CRITICAL BUSINESS RULE)
    if (criteria.trackId && !criteria.subjectIds) {
      resolvedSubjectIds = await getSubjectIdsForTrack(criteria.trackId);
      if (resolvedSubjectIds.length > 0) {
        whereConditions.push(inArray(questions.subjectId, resolvedSubjectIds));
        appliedFilters.resolvedSubjectIds = resolvedSubjectIds;
        appliedFilters.trackId = criteria.trackId;
      } else {
        // No subjects for this track - return empty result
        return {
          questions: [],
          totalCount: 0,
          appliedFilters
        };
      }
    }

    // Direct subject filtering
    if (criteria.subjectIds && criteria.subjectIds.length > 0) {
      whereConditions.push(inArray(questions.subjectId, criteria.subjectIds));
      appliedFilters.subjectIds = criteria.subjectIds;
    }

    // Syllabus filtering
    if (criteria.syllabusId) {
      whereConditions.push(eq(questions.syllabusId, criteria.syllabusId));
    }

    // Topic filtering
    if (criteria.topicId) {
      whereConditions.push(eq(questions.topicId, criteria.topicId));
    }

    // Subtopic filtering
    if (criteria.subtopicId) {
      whereConditions.push(eq(questions.subtopicId, criteria.subtopicId));
    }

    // 2. Question attribute filtering

    // Difficulty filter
    if (criteria.difficulty && criteria.difficulty.length > 0) {
      whereConditions.push(inArray(questions.difficulty, criteria.difficulty));
      appliedFilters.difficulty = criteria.difficulty;
    }

    // Type filter
    if (criteria.type && criteria.type.length > 0) {
      whereConditions.push(inArray(questions.type, criteria.type));
    }

    // Status filter (default to live questions for public access)
    if (criteria.status && criteria.status.length > 0) {
      whereConditions.push(inArray(questions.status, criteria.status));
      appliedFilters.status = criteria.status;
    } else {
      // Default to live questions if no status specified
      whereConditions.push(inArray(questions.status, ["live"]));
      appliedFilters.status = ["live"];
    }

    // 3. Content filtering

    // Year filter
    if (criteria.year) {
      whereConditions.push(eq(questions.year, criteria.year));
    }

    // Source filter
    if (criteria.source) {
      whereConditions.push(ilike(questions.source, `%${criteria.source}%`));
    }

    // Tags filter
    if (criteria.tags && criteria.tags.length > 0) {
      // Check if any of the question's tags match the filter tags
      const tagConditions = criteria.tags.map(tag =>
        sql`${questions.tags}::text LIKE ${`%${tag}%`}`
      );
      whereConditions.push(or(...tagConditions));
    }

    // Search text
    if (criteria.searchText) {
      whereConditions.push(
        or(
          ilike(questions.text, `%${criteria.searchText}%`),
          ilike(questions.year, `%${criteria.searchText}%`),
          ilike(questions.source, `%${criteria.searchText}%`)
        )
      );
    }

    // Combine all conditions
    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Ordering
    let orderByClause;
    switch (criteria.orderBy) {
      case "difficulty":
        orderByClause = criteria.orderDirection === "desc"
          ? sql`${questions.difficulty} DESC`
          : sql`${questions.difficulty} ASC`;
        break;
      case "usage_count":
        orderByClause = criteria.orderDirection === "desc"
          ? sql`${questions.usageCount} DESC`
          : sql`${questions.usageCount} ASC`;
        break;
      case "random":
        orderByClause = sql`RANDOM()`;
        break;
      case "created_at":
      default:
        orderByClause = criteria.orderDirection === "desc"
          ? sql`${questions.createdAt} DESC`
          : sql`${questions.createdAt} ASC`;
        break;
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(questions)
      .where(whereClause);

    const totalCount = countResult[0]?.count || 0;

    // Get questions with pagination
    const questionsQuery = db
      .select()
      .from(questions)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(criteria.limit || 50)
      .offset(criteria.offset || 0);

    const questionsResult = await questionsQuery;

    return {
      questions: questionsResult,
      totalCount,
      appliedFilters
    };

  } catch (error) {
    console.error("[QUESTION_FILTER] Error filtering questions:", error);
    return {
      questions: [],
      totalCount: 0,
      appliedFilters: {}
    };
  }
}

/**
 * Get question counts by subject for a given track
 * Used for exam composition planning
 */
export async function getQuestionCountsBySubject(trackId: string): Promise<Array<{
  subjectId: string;
  subjectName: string;
  totalQuestions: number;
  approvedQuestions: number;
  difficultyBreakdown: { easy: number; medium: number; hard: number };
}>> {
  try {
    const subjectIds = await getSubjectIdsForTrack(trackId);
    if (subjectIds.length === 0) return [];

    const results = await db
      .select({
        subjectId: questions.subjectId,
        subjectName: subjects.name,
        difficulty: questions.difficulty,
        status: questions.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(questions)
      .innerJoin(subjects, eq(questions.subjectId, subjects.id))
      .where(inArray(questions.subjectId, subjectIds))
      .groupBy(questions.subjectId, subjects.name, questions.difficulty, questions.status);

    // Aggregate by subject
    const subjectMap = new Map<string, any>();

    results.forEach(row => {
      if (!subjectMap.has(row.subjectId)) {
        subjectMap.set(row.subjectId, {
          subjectId: row.subjectId,
          subjectName: row.subjectName,
          totalQuestions: 0,
          approvedQuestions: 0,
          difficultyBreakdown: { easy: 0, medium: 0, hard: 0 }
        });
      }

      const subject = subjectMap.get(row.subjectId);
      const count = row.count;

      subject.totalQuestions += count;

      if (row.status === "approved" || row.status === "live") {
        subject.approvedQuestions += count;
      }

      subject.difficultyBreakdown[row.difficulty as keyof typeof subject.difficultyBreakdown] += count;
    });

    return Array.from(subjectMap.values());

  } catch (error) {
    console.error("[QUESTION_FILTER] Error getting question counts by subject:", error);
    return [];
  }
}

/**
 * Validate question exists and is accessible for given criteria
 */
export async function validateQuestionAccess(questionId: string, criteria: QuestionFilterCriteria): Promise<boolean> {
  const result = await filterQuestions({
    ...criteria,
    limit: 1,
    offset: 0
  });

  return result.questions.some(q => q.id === questionId);
}
