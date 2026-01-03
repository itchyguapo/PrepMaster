import { db } from './db';
import { questions, examBodies, subjects } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function checkQuestions() {
  try {
    console.log('=== QUESTION DISTRIBUTION ===');
    
    // Get all exam bodies
    const examBodyRecords = await db.select().from(examBodies);
    console.log('\nExam Bodies:', examBodyRecords.map(eb => `${eb.name} (${eb.id})`));
    
    // Count questions by exam body
    for (const examBody of examBodyRecords) {
      const questionCount = await db
        .select({ count: sql`count(*)` })
        .from(questions)
        .where(eq(questions.examBodyId, examBody.id));
      
      console.log(`\n${examBody.name}: ${questionCount[0].count} questions`);
      
      // Get sample questions
      const sampleQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.examBodyId, examBody.id))
        .limit(3);
      
      sampleQuestions.forEach((q, i) => {
        console.log(`  ${i+1}. ${q.text.substring(0, 60)}...`);
        console.log(`     Status: ${q.status}, Subject: ${q.subjectId}`);
      });
    }
    
    // Total questions
    const totalQuestions = await db
      .select({ count: sql`count(*)` })
      .from(questions);
    
    console.log(`\n=== TOTAL QUESTIONS: ${totalQuestions[0].count} ===`);
    
    // Questions by status
    const liveQuestions = await db
      .select({ count: sql`count(*)` })
      .from(questions)
      .where(eq(questions.status, 'live'));
    
    console.log(`Live questions: ${liveQuestions[0].count}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkQuestions();
