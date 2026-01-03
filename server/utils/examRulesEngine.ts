import { db } from "../db";
import { examRules, examTypes } from "@shared/schema";
import { eq, and, or, desc, sql, isNull } from "drizzle-orm";

export interface ExamConfiguration {
  examTypeId: string;
  trackId?: string;
  customOverrides?: Record<string, any>;
}

export interface ResolvedExamRules {
  duration?: number;
  questionCount?: number;
  questionDistribution?: Record<string, number>; // subject -> count
  difficultyDistribution?: Record<string, number>; // easy/medium/hard -> percentage
  randomization?: boolean;
  showResults?: boolean;
  allowReview?: boolean;
  passingScore?: number;
  customRules?: Record<string, any>;
  appliedRules: Array<{
    id: string;
    name: string;
    priority: number;
    source: "exam_type" | "track" | "custom";
  }>;
}

/**
 * Exam Rules Engine
 * JSON-based extensible configuration system for exam behavior
 */

/**
 * Resolve all applicable rules for an exam configuration
 * Rules are applied in priority order: custom overrides > track rules > exam type rules
 */
export async function resolveExamRules(config: ExamConfiguration): Promise<ResolvedExamRules> {
  try {
    const { examTypeId, trackId, customOverrides = {} } = config;

    // Get exam type rules
    const examTypeRules = await db
      .select()
      .from(examRules)
      .where(and(
        eq(examRules.examTypeId, examTypeId),
        eq(examRules.isActive, true),
        isNull(examRules.trackId) // Exam type wide rules
      ))
      .orderBy(desc(examRules.priority));

    // Get track-specific rules (if track specified)
    let trackRules: (typeof examRules.$inferSelect)[] = [];
    if (trackId) {
      trackRules = await db
        .select()
        .from(examRules)
        .where(and(
          eq(examRules.examTypeId, examTypeId),
          eq(examRules.trackId, trackId),
          eq(examRules.isActive, true)
        ))
        .orderBy(desc(examRules.priority));
    }

    // Merge rules in priority order: custom > track > exam type
    const mergedRules: ResolvedExamRules = {
      appliedRules: []
    };

    // Apply exam type rules first (lowest priority)
    for (const rule of examTypeRules) {
      applyRule(mergedRules, rule, "exam_type");
    }

    // Apply track rules (medium priority)
    for (const rule of trackRules) {
      applyRule(mergedRules, rule, "track");
    }

    // Apply custom overrides (highest priority)
    if (Object.keys(customOverrides).length > 0) {
      Object.assign(mergedRules, customOverrides);
      mergedRules.appliedRules?.push({
        id: "custom",
        name: "Custom Overrides",
        priority: 999,
        source: "custom"
      });
    }

    return mergedRules;

  } catch (error) {
    console.error("[EXAM_RULES] Error resolving exam rules:", error);
    // Return default rules
    return {
      duration: 180,
      questionCount: 50,
      randomization: true,
      passingScore: 50,
      appliedRules: []
    };
  }
}

/**
 * Apply a single rule to the merged rules object
 */
function applyRule(
  merged: ResolvedExamRules,
  rule: any,
  source: "exam_type" | "track" | "custom"
): void {
  const ruleData = rule.rules;

  // Apply each rule property
  Object.keys(ruleData).forEach(key => {
    if (ruleData[key] !== null && ruleData[key] !== undefined) {
      (merged as any)[key] = ruleData[key];
    }
  });

  // Track applied rules
  merged.appliedRules?.push({
    id: rule.id,
    name: rule.name,
    priority: rule.priority,
    source
  });
}

/**
 * Validate exam configuration against rules
 */
export async function validateExamConfiguration(
  config: ExamConfiguration,
  questionIds: string[]
): Promise<{
  isValid: boolean;
  violations: string[];
  warnings: string[];
}> {
  try {
    const rules = await resolveExamRules(config);
    const violations: string[] = [];
    const warnings: string[] = [];

    // Validate question count
    if (rules.questionCount && questionIds.length !== rules.questionCount) {
      violations.push(`Question count ${questionIds.length} does not match required ${rules.questionCount}`);
    }

    // Validate question distribution (if specified)
    if (rules.questionDistribution) {
      // This would require getting subject counts from questions
      // Implementation depends on how we structure question queries
      warnings.push("Question distribution validation not yet implemented");
    }

    // Validate difficulty distribution
    if (rules.difficultyDistribution) {
      warnings.push("Difficulty distribution validation not yet implemented");
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings
    };

  } catch (error) {
    console.error("[EXAM_RULES] Error validating exam configuration:", error);
    return {
      isValid: false,
      violations: ["Failed to validate exam configuration"],
      warnings: []
    };
  }
}

/**
 * Generate exam template from rules
 */
export async function generateExamFromRules(
  config: ExamConfiguration
): Promise<{
  success: boolean;
  template?: {
    durationMinutes: number;
    totalQuestions: number;
    questionDistribution: Record<string, number>;
    rules: ResolvedExamRules;
  };
  error?: string;
}> {
  try {
    const rules = await resolveExamRules(config);

    // Generate template based on rules
    const template = {
      durationMinutes: rules.duration || 180,
      totalQuestions: rules.questionCount || 50,
      questionDistribution: rules.questionDistribution || {},
      rules
    };

    return { success: true, template };

  } catch (error) {
    console.error("[EXAM_RULES] Error generating exam template:", error);
    return {
      success: false,
      error: "Failed to generate exam template from rules"
    };
  }
}

/**
 * Get all available rules for an exam type
 */
export async function getExamTypeRules(examTypeId: string) {
  try {
    const rules = await db
      .select({
        rule: examRules,
        trackName: sql<string>`NULL`
      })
      .from(examRules)
      .where(and(
        eq(examRules.examTypeId, examTypeId),
        eq(examRules.isActive, true)
      ))
      .orderBy(desc(examRules.priority));

    return rules;
  } catch (error) {
    console.error("[EXAM_RULES] Error getting exam type rules:", error);
    return [];
  }
}

/**
 * Create default rules for a new exam type
 */
export async function createDefaultExamRules(examTypeId: string): Promise<void> {
  try {
    const examTypeRecords = await db
      .select({ examBodyId: examTypes.examBodyId })
      .from(examTypes)
      .where(eq(examTypes.id, examTypeId))
      .limit(1);

    const examBodyId = examTypeRecords[0]?.examBodyId;
    if (!examBodyId) {
      return;
    }

    const defaultRules = [
      {
        examBodyId,
        examTypeId,
        trackId: null,
        name: "Default Exam Configuration",
        description: "Standard exam settings",
        rules: {
          duration: 180,
          questionCount: 50,
          randomization: true,
          showResults: true,
          allowReview: true,
          passingScore: 50,
          difficultyDistribution: {
            easy: 30,
            medium: 50,
            hard: 20
          }
        },
        priority: 0,
        isActive: true
      }
    ];

    for (const rule of defaultRules) {
      await db.insert(examRules).values(rule);
    }

  } catch (error) {
    console.error("[EXAM_RULES] Error creating default exam rules:", error);
    throw error;
  }
}

/**
 * Evaluate exam results against rules
 */
export function evaluateExamResults(
  rules: ResolvedExamRules,
  score: number,
  totalQuestions: number
): {
  passed: boolean;
  grade?: string;
  feedback: string[];
} {
  const results: { passed: boolean; grade?: string; feedback: string[] } = {
    passed: false,
    feedback: [] as string[]
  };

  // Check passing score
  const passingScore = rules.passingScore || 50;
  const percentage = (score / totalQuestions) * 100;

  if (percentage >= passingScore) {
    results.passed = true;
    results.feedback.push(`Passed with ${percentage.toFixed(1)}% (${score}/${totalQuestions})`);
  } else {
    results.feedback.push(`Failed with ${percentage.toFixed(1)}% (${score}/${totalQuestions}). Required: ${passingScore}%`);
  }

  // Generate grade feedback (basic implementation)
  if (percentage >= 90) results.grade = "A+";
  else if (percentage >= 80) results.grade = "A";
  else if (percentage >= 70) results.grade = "B";
  else if (percentage >= 60) results.grade = "C";
  else if (percentage >= 50) results.grade = "D";
  else results.grade = "F";

  return results;
}
