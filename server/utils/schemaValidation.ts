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
  } catch (error) {
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
}> {
  const warnings: string[] = [];
  const missingColumns: Array<{ table: string; column: string }> = [];
  const missingTables: string[] = [];
  
  // Expected critical tables and columns
  const expectedSchema = {
    exams: ['id', 'title', 'examBodyId', 'questionIds', 'createdAt'],
    users: ['id', 'email', 'supabaseId', 'role', 'createdAt'],
    questions: ['id', 'text', 'examBodyId', 'subjectId', 'status'],
    user_stats: ['id', 'userId', 'currentStreak', 'totalQuestionsAnswered'],
    subscriptions: ['id', 'userId', 'plan', 'status', 'createdAt']
  };
  
  // Check tables and columns
  for (const [tableName, requiredColumns] of Object.entries(expectedSchema)) {
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
  }
  
  // Check for optional but recommended columns
  const optionalColumns = {
    exams: ['description', 'trackId'],
    user_stats: ['longestStreak', 'accuracy', 'achievements']
  };
  
  for (const [tableName, columns] of Object.entries(optionalColumns)) {
    const tableExistsResult = await tableExists(tableName);
    if (!tableExistsResult) continue;
    
    const existingColumns = await getTableColumns(tableName);
    for (const column of columns) {
      if (!existingColumns.includes(column)) {
        warnings.push(`Optional column ${tableName}.${column} is missing`);
      }
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
    
    if (!validation.isValid) {
      console.error('❌ Database Schema Validation Failed:');
      console.error('Missing Tables:', validation.missingTables);
      console.error('Missing Columns:', validation.missingColumns);
      
      if (validation.missingTables.length > 0) {
        throw new Error(`Critical tables missing: ${validation.missingTables.join(', ')}`);
      }
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️  Schema Warnings:');
      validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
    
    console.log('✅ Database schema validation passed');
  } catch (error) {
    console.error('❌ Schema validation error:', error);
    throw error;
  }
}
