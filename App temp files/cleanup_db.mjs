import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.DATABASE_URL?.includes('supabase.co') ? {
    rejectUnauthorized: false
  } : false
});

async function cleanupDatabase() {
  try {
    console.log('🧹 Cleaning up redundant tables...\n');
    
    const tablesToDrop = ['academic_tracks', 'exam_types', 'track_subjects'];
    
    for (const tableName of tablesToDrop) {
      try {
        // Double-check row count before dropping
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const rowCount = parseInt(countResult.rows[0].count);
        
        if (rowCount === 0) {
          await pool.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
          console.log(`✅ Dropped table: ${tableName} (${rowCount} rows)`);
        } else {
          console.log(`⚠️  Skipped table: ${tableName} (${rowCount} rows - not empty)`);
        }
      } catch (error) {
        console.log(`❌ Could not drop ${tableName}: ${error.message}`);
      }
    }
    
    console.log('\n✅ Database cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

cleanupDatabase();
