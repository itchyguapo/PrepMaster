import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.co') ? { rejectUnauthorized: false } : false
});

async function testBulkDelete() {
  try {
    console.log('🔍 Testing bulk delete logic...');
    
    // Get current question count
    const countBefore = await pool.query('SELECT COUNT(*) as count FROM questions');
    console.log(`Questions before deletion: ${countBefore.rows[0].count}`);
    
    if (countBefore.rows[0].count === 0) {
      console.log('No questions to delete');
      return;
    }
    
    // Get all question IDs
    const allQuestions = await pool.query('SELECT id FROM questions');
    const questionIds = allQuestions.rows.map(q => q.id);
    console.log(`Found ${questionIds.length} questions to delete`);
    
    // Start transaction
    await pool.query('BEGIN');
    
    try {
      // Delete question options first (foreign key constraint)
      const deleteOptions = await pool.query(
        'DELETE FROM question_options WHERE question_id = ANY($1)',
        [questionIds]
      );
      console.log(`Deleted ${deleteOptions.rowCount} question_options records`);
      
      // Delete questions
      const deleteQuestions = await pool.query(
        'DELETE FROM questions WHERE id = ANY($1)',
        [questionIds]
      );
      console.log(`Deleted ${deleteQuestions.rowCount} questions`);
      
      // Commit transaction
      await pool.query('COMMIT');
      
      // Verify deletion
      const countAfter = await pool.query('SELECT COUNT(*) as count FROM questions');
      console.log(`Questions after deletion: ${countAfter.rows[0].count}`);
      
      if (countAfter.rows[0].count === 0) {
        console.log('✅ Bulk delete successful!');
      } else {
        console.log(`⚠️  ${countAfter.rows[0].count} questions still remain`);
      }
      
    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('❌ Transaction failed, rolled back:', error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testBulkDelete();
