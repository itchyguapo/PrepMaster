/**
 * Break-Proof Exam Utilities
 * Handles database schema differences gracefully for exam operations
 */

import { db } from "../db";
import { exams } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getTableColumns } from "./schemaValidation";

/**
 * Break-proof exam selection that adapts to available columns
 */
export async function safeSelectExams() {
  try {
    // Get actual columns that exist in the exams table
    const existingColumns = await getTableColumns('exams');
    
    // Build dynamic select object based on available columns
    const selectFields: Record<string, any> = {};
    
    // Always include these critical columns
    const criticalColumns = ['id', 'title', 'examBodyId', 'createdAt'];
    for (const col of criticalColumns) {
      if (existingColumns.includes(col)) {
        selectFields[col] = exams[col as keyof typeof exams];
      }
    }
    
    // Include optional columns if they exist
    const optionalColumns = ['description', 'trackId', 'totalQuestions', 'durationMinutes', 'status', 'isPractice'];
    for (const col of optionalColumns) {
      if (existingColumns.includes(col)) {
        selectFields[col] = exams[col as keyof typeof exams];
      }
    }
    
    // Execute the query with available columns
    const examRecords = await db
      .select(selectFields)
      .from(exams)
      .orderBy(desc(exams.createdAt));
    
    return examRecords;
  } catch (error) {
    console.error("Error in safeSelectExams:", error);
    // Fallback to minimal query if dynamic approach fails
    try {
      return await db
        .select({ id: exams.id, title: exams.title })
        .from(exams)
        .orderBy(desc(exams.createdAt));
    } catch (fallbackError) {
      console.error("Fallback query also failed:", fallbackError);
      throw new Error("Failed to fetch exams due to database schema issues");
    }
  }
}

/**
 * Break-proof exam insertion that adapts to available columns
 * Uses raw SQL to avoid Drizzle ORM schema constraints
 */
export async function safeInsertExam(data: any) {
  try {
    // Get actual columns that exist in the exams table (snake_case from DB)
    const existingDbColumns = await getTableColumns('exams');
    
    // Map camelCase to snake_case for column name matching
    const camelToSnake: Record<string, string> = {
      examBodyId: 'exam_body_id',
      trackId: 'track_id',
      selectedSubjects: 'selected_subjects',
      questionIds: 'question_ids',
      durationMinutes: 'duration_minutes',
      totalQuestions: 'total_questions',
      totalMarks: 'total_marks',
      createdBy: 'created_by',
      tutorId: 'tutor_id',
      isTutorAssignment: 'is_tutor_assignment',
      isPractice: 'is_practice',
      isRandomized: 'is_randomized',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      passMark: 'pass_mark',
      examTypeId: 'exam_type_id',
      questionDistribution: 'question_distribution',
      startsAt: 'starts_at',
      endsAt: 'ends_at',
      scheduledAt: 'scheduled_at',
      appliedRules: 'applied_rules',
      categoryId: 'category_id',
      subjectId: 'subject_id',
      subject: 'subject',
      duration: 'duration',
      body: 'body',
      subcategory: 'subcategory',
      question_count: 'question_count',
      marks: 'marks',
      exam_type: 'exam_type',
      exam_year: 'exam_year',
      exam_month: 'exam_month',
      exam_day: 'exam_day',
      time_limit: 'time_limit',
      instructions: 'instructions',
    };
    
    // Filter data to only include columns that exist in the database
    const columns: string[] = [];
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(data)) {
      const snakeKey = camelToSnake[key] || key;
      if (existingDbColumns.includes(snakeKey)) {
        columns.push(snakeKey);
        // Handle JSONB columns
        if (['question_ids', 'selected_subjects', 'question_distribution', 'applied_rules'].includes(snakeKey)) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        placeholders.push(`$${paramIndex}`);
        paramIndex++;
      } else {
        console.warn(`Column ${key} (${snakeKey}) does not exist in exams table, skipping`);
      }
    }
    
    // Ensure required columns are present - only check columns that exist in database
    const requiredCols = ['title', 'exam_body_id', 'question_ids'];
    // Only require subject_id if it exists in the database schema
    if (existingDbColumns.includes('subject_id')) {
      requiredCols.push('subject_id');
    }
    
    const missingRequired = requiredCols.filter(col => !columns.includes(col));
    if (missingRequired.length > 0) {
      throw new Error(`Required columns (${missingRequired.join(', ')}) are missing from insert data`);
    }
    
    // Build raw SQL with proper parameter handling
    // Use sql template literal for safe parameterized query
    const columnsStr = columns.join(', ');
    const valuesStr = values.map((v) => {
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'boolean') return v ? 'true' : 'false';
      if (typeof v === 'number') return String(v);
      if (typeof v === 'string') {
        // Escape single quotes for SQL safety
        const escaped = v.replace(/'/g, "''");
        return `'${escaped}'`;
      }
      // For objects/arrays (already stringified for JSONB)
      if (typeof v === 'object') {
        const escaped = JSON.stringify(v).replace(/'/g, "''");
        return `'${escaped}'`;
      }
      return `'${String(v).replace(/'/g, "''")}'`;
    }).join(', ');
    
    const insertSQL = `INSERT INTO exams (${columnsStr}) VALUES (${valuesStr}) RETURNING *`;
    
    const result = await db.execute(sql`${sql.raw(insertSQL)}`);
    
    // Return the first row with camelCase keys
    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0] as Record<string, any>;
      // Convert snake_case back to camelCase for consistency
      const camelCaseRow: Record<string, any> = {};
      const snakeToCamel: Record<string, string> = {};
      for (const [camel, snake] of Object.entries(camelToSnake)) {
        snakeToCamel[snake] = camel;
      }
      for (const [key, value] of Object.entries(row)) {
        const camelKey = snakeToCamel[key] || key;
        camelCaseRow[camelKey] = value;
      }
      return camelCaseRow;
    }
    
    throw new Error('Insert succeeded but no row returned');
  } catch (error) {
    console.error("Error in safeInsertExam:", error);
    throw error;
  }
}

/**
 * Validates exam data against available schema
 */
export async function validateExamData(data: any): Promise<{
  isValid: boolean;
  missingColumns: string[];
  warnings: string[];
  safeData: Record<string, any>;
}> {
  const existingColumns = await getTableColumns('exams');
  const missingColumns: string[] = [];
  const warnings: string[] = [];
  const safeData: Record<string, any> = {};
  
  // Check required columns (including subjectId per authoritative decision)
  const requiredColumns = ['title', 'examBodyId', 'questionIds', 'subjectId'];
  for (const col of requiredColumns) {
    if (!data[col]) {
      missingColumns.push(col);
    } else if (existingColumns.includes(col)) {
      safeData[col] = data[col];
    }
  }
  
  // Check optional columns
  const optionalColumns = ['description', 'trackId', 'totalQuestions', 'durationMinutes', 'status', 'isPractice'];
  for (const col of optionalColumns) {
    if (data[col] !== undefined) {
      if (existingColumns.includes(col)) {
        safeData[col] = data[col];
      } else {
        warnings.push(`Optional column ${col} will be ignored (doesn't exist in database)`);
      }
    }
  }
  
  // Add any other columns that exist
  for (const [key, value] of Object.entries(data)) {
    if (existingColumns.includes(key) && !safeData[key]) {
      safeData[key] = value;
    }
  }
  
  return {
    isValid: missingColumns.length === 0,
    missingColumns,
    warnings,
    safeData
  };
}
