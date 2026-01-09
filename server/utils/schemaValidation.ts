/**
 * Break-Proof Database Utilities
 * Handles schema differences between code and database gracefully
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Checks if a column exists in a table
 */
export async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = ${tableName} 
      AND column_name = ${columnName}
      AND table_schema = 'public'
      LIMIT 1
    `);
    const rows = (result as any).rows || result;
    return Array.isArray(rows) && rows.length > 0;
  } catch (error) {
    console.warn(`Error checking column ${tableName}.${columnName}:`, error);
    return false;
  }
}

/**
 * Checks if a table exists
 */
export async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = ${tableName}
      AND table_schema = 'public'
      LIMIT 1
    `);
    const rows = (result as any).rows || result;
    return Array.isArray(rows) && rows.length > 0;
  } catch (error: any) {
    // If it's a connection error, we should rethrow it so the caller knows the DB is unreachable
    const errorMsg = error.message || String(error);
    if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('timeout') || errorMsg.includes('Connection terminated')) {
      throw error;
    }
    console.warn(`Error checking table ${tableName}:`, error);
    return false;
  }
}

/**
 * Gets actual column names for a table
 */
export async function getTableColumns(tableName: string): Promise<string[]> {
  try {
    const result = await db.execute(sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = ${tableName}
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    // db.execute returns QueryResult - access rows property
    const rows = (result as any).rows || result;
    if (Array.isArray(rows)) {
      return rows.map((row: any) => row.column_name);
    }
    return [];
  } catch (error) {
    console.warn(`Error getting columns for ${tableName}:`, error);
    return [];
  }
}

/**
 * Creates a safe SELECT query that only includes existing columns
 */
export function createSafeSelect(tableName: string, requestedColumns: Record<string, any>) {
  return async () => {
    const existingColumns = await getTableColumns(tableName);
    const safeColumns: Record<string, any> = {};

    // Only include columns that actually exist in the database
    for (const [key, value] of Object.entries(requestedColumns)) {
      if (existingColumns.includes(key)) {
        safeColumns[key] = value;
      } else {
        console.warn(`Column ${key} does not exist in table ${tableName}, skipping`);
      }
    }

    return safeColumns;
  };
}

/**
 * Creates a safe INSERT object that only includes existing columns
 */
export async function createSafeInsert(tableName: string, data: Record<string, any>) {
  const existingColumns = await getTableColumns(tableName);
  const safeData: Record<string, any> = {};

  // Only include columns that actually exist in the database
  for (const [key, value] of Object.entries(data)) {
    if (existingColumns.includes(key)) {
      safeData[key] = value;
    } else {
      console.warn(`Column ${key} does not exist in table ${tableName}, skipping`);
    }
  }

  return safeData;
}

/**
 * Validates database schema against expected schema
 */
export async function validateSchema(): Promise<{
  isValid: boolean;
  missingColumns: Array<{ table: string; column: string }>;
  missingTables: string[];
  warnings: string[];
  connectionError?: string;
}> {
  const warnings: string[] = [];
  const missingColumns: Array<{ table: string; column: string }> = [];
  const missingTables: string[] = [];

  // Test connectivity first
  try {
    await db.execute(sql`SELECT 1`);
  } catch (error: any) {
    return {
      isValid: false,
      missingColumns: [],
      missingTables: [],
      warnings: [],
      connectionError: error.message || String(error)
    };
  }

  // Expected critical tables and columns
  const expectedSchema = {
    exams: ['id', 'title', 'exam_body_id', 'question_ids', 'created_at'],
    users: ['id', 'email', 'supabase_id', 'role', 'created_at'],
    questions: ['id', 'text', 'exam_body_id', 'subject_id', 'status'],
    user_stats: ['id', 'user_id', 'current_streak', 'total_questions_answered'],
    subscriptions: ['id', 'user_id', 'plan', 'status', 'created_at']
  };

  // Optional but recommended columns
  const optionalColumns: Record<string, string[]> = {
    exams: ['description', 'track_id'],
    user_stats: ['longest_streak', 'accuracy', 'achievements']
  };

  // Check tables and columns
  for (const [tableName, requiredColumns] of Object.entries(expectedSchema)) {
    try {
      const tableExistsResult = await tableExists(tableName);

      if (!tableExistsResult) {
        missingTables.push(tableName);
        continue;
      }

      const existingColumns = await getTableColumns(tableName);
      for (const column of requiredColumns) {
        if (!existingColumns.includes(column)) {
          missingColumns.push({ table: tableName, column });
        }
      }
    } catch (error) {
      // If we hit a connection error here (though it should have been caught above)
      return {
        isValid: false,
        missingColumns,
        missingTables,
        warnings,
        connectionError: (error as any).message || String(error)
      };
    }
  }

  // Check for optional but recommended columns
  for (const [tableName, columns] of Object.entries(optionalColumns)) {
    try {
      const tableExistsResult = await tableExists(tableName);
      if (!tableExistsResult) continue;

      const existingColumns = await getTableColumns(tableName);
      for (const column of columns) {
        if (!existingColumns.includes(column)) {
          warnings.push(`Optional column ${tableName}.${column} is missing`);
        }
      }
    } catch (error) {
      // Ignore errors for optional columns or let it break the whole thing?
      // Better to warn
      warnings.push(`Could not check optional columns for ${tableName}: ${(error as any).message}`);
    }
  }

  const isValid = missingTables.length === 0 && missingColumns.length === 0;

  return {
    isValid,
    missingColumns,
    missingTables,
    warnings
  };
}

/**
 * Runs schema validation on startup
 */
export async function validateSchemaOnStartup(): Promise<void> {
  try {
    const validation = await validateSchema();

    if (validation.connectionError) {
      console.error('❌ Database Connection Error during validation:');
      console.error(`   ${validation.connectionError}`);
      console.error('   Please check your DATABASE_URL and network connectivity.');
      return; // Stop validation but don't crash the server
    }

    if (!validation.isValid) {
      console.error('❌ Database Schema Validation Failed:');
      if (validation.missingTables.length > 0) console.error('Missing Tables:', validation.missingTables);
      if (validation.missingColumns.length > 0) console.error('Missing Columns:', validation.missingColumns);

      // We don't throw here anymore to be more resilient, just log clearly
    } else {
      console.log('✅ Database schema validation passed');
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️  Schema Warnings:');
      validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
  } catch (error) {
    console.error('❌ Unexpected schema validation error:', error);
  }
}
