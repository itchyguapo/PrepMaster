/**
 * Script to run the database migration
 * Usage: tsx script/run-migration.ts
 */

import "dotenv/config";
import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set");
  console.error("   Please set it in your .env file");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('supabase.co') ? {
    rejectUnauthorized: false
  } : undefined,
});

async function runMigration() {
  try {
    // Get migration file from command line argument or use default
    const migrationFile = process.argv[2] || "add_payment_type_columns.sql";
    console.log(`🔄 Reading migration file: ${migrationFile}...`);
    const migrationPath = join(process.cwd(), "migrations", migrationFile);
    const sql = readFileSync(migrationPath, "utf-8");

    console.log("🔄 Connecting to database...");
    const client = await pool.connect();

    console.log("🔄 Running migration...");
    await client.query(sql);

    client.release();

    console.log("✅ Migration completed successfully!");

    if (migrationFile === "add_payment_type_columns.sql") {
      console.log("\n📋 What was added:");
      console.log("   - payment_type column to subscriptions table");
      console.log("   - is_lifetime column to subscriptions table");
      console.log("   - payment_type column to payments table");
      console.log("   - Indexes on payment_type columns");
      console.log("\n✨ You can now use lifetime payment options!");
    } else if (migrationFile === "add_question_explanations_and_indexes.sql") {
      console.log("\n📋 What was added:");
      console.log("   - brief_explanation column");
      console.log("   - detailed_explanation column");
      console.log("   - updated_at column");
      console.log("   - 9 database indexes for better performance");
      console.log("\n✨ You can now use the improved question bank system!");
    } else if (migrationFile === "minimal_cbt_migration.sql") {
      console.log("\n📋 Minimal CBT Migration Complete!");
      console.log("\n🆕 What was added:");
      console.log("   - exam_types table");
      console.log("   - academic_tracks table");
      console.log("   - status column to questions");
      console.log("   - created_by column to questions");
      console.log("   - exam_type_id column to questions");
      console.log("   - Categories migrated to academic_tracks");
      console.log("   - Default exam types created");
      console.log("\n✨ Basic CBT structure is now in place!");
    } else if (migrationFile === "cbt_question_bank_system.sql") {
      console.log("\n📋 CBT Question Bank System Migration Complete!");
      console.log("\n🆕 New Tables Created:");
      console.log("   - exam_types (WASSCE, SSCE, UTME, etc.)");
      console.log("   - academic_tracks (Science, Arts, Commercial)");
      console.log("   - track_subjects (junction table - CRITICAL)");
      console.log("   - syllabi (version-controlled curriculum)");
      console.log("   - topics & subtopics (hierarchical structure)");
      console.log("   - exam_rules (extensible JSON configuration)");
      console.log("   - question_options (separate from questions)");
      console.log("   - marking_guides (for essay questions)");
      console.log("   - question_versions (change tracking)");
      console.log("\n🔄 Tables Modified:");
      console.log("   - subjects (now neutral entities)");
      console.log("   - questions (new hierarchical relationships)");
      console.log("   - exams (updated structure)");
      console.log("\n📊 Data Migrated:");
      console.log("   - Categories → Academic Tracks");
      console.log("   - Created track-subject mappings");
      console.log("   - Added default exam types");
      console.log("   - Migrated question options");
      console.log("\n✨ The system now supports:");
      console.log("   - Exam Body → Exam Type → Track → Subjects hierarchy");
      console.log("   - Syllabus and topic management");
      console.log("   - Question lifecycle workflow");
      console.log("   - Extensible exam rules");
      console.log("   - Nigerian examination structures");
    } else if (migrationFile === "fix_subjects_table.sql") {
      console.log("\n📋 Subjects Table Fix Migration Complete!");
      console.log("\n🔄 What was fixed:");
      console.log("   - Added 'code' column to subjects table (required field)");
      console.log("   - Generated codes for existing subjects from their names");
      console.log("   - Added 'description' column");
      console.log("   - Added 'is_active' column with default true");
      console.log("   - Added 'updated_at' column");
      console.log("   - Set 'code' as NOT NULL constraint");
      console.log("\n✨ You can now:");
      console.log("   - Create new subjects via the admin panel");
      console.log("   - Upload questions without errors");
      console.log("   - Use the question bank fully");
    } else if (migrationFile === "fix_subjects_to_neutral_entities.sql") {
      console.log("\n📋 Subjects Neutral Entities Migration Complete!");
      console.log("\n🔄 What was fixed (CRITICAL ARCHITECTURE ALIGNMENT):");
      console.log("   - Removed 'category_id' column from subjects (subjects are neutral!)");
      console.log("   - Removed 'exam_body_id' column from subjects (relationships via track_subjects)");
      console.log("   - Added all required columns (code, description, is_active, updated_at)");
      console.log("   - Ensured track_subjects junction table exists");
      console.log("   - Created performance indexes");
      console.log("\n✨ Architecture Compliance:");
      console.log("   ✅ Subjects are now neutral entities");
      console.log("   ✅ Relationships are through track_subjects junction table");
      console.log("   ✅ Matches CBT Question Bank System architecture");
      console.log("\n⚠️  IMPORTANT: After this migration, subjects must be mapped to tracks");
      console.log("   via the track_subjects table, not directly!");
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Migration failed:");
    console.error(error.message);
    
    if (error.message.includes("already exists")) {
      console.log("\n💡 Some objects might already exist. This is usually okay.");
      console.log("   The migration uses IF NOT EXISTS, so it's safe to run multiple times.");
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

