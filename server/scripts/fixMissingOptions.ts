/**
 * Script to fix questions with missing options
 * 
 * This script identifies questions that have no options in the questionOptions table
 * and tries to create default options or reports them for manual fixing.
 * 
 * Usage: npx tsx server/scripts/fixMissingOptions.ts
 */

import { db } from "../db";
import { questions, questionOptions } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

async function fixMissingOptions() {
  console.log("🔍 Scanning for questions with missing options...\n");

  try {
    // Get all questions
    const allQuestions = await db.select().from(questions);
    console.log(`Found ${allQuestions.length} total questions\n`);

    let fixedCount = 0;
    let alreadyHasOptionsCount = 0;
    let needsManualFixCount = 0;
    const questionsNeedingFix: { id: string; text: string }[] = [];

    for (const question of allQuestions) {
      // Check if question has options in questionOptions table
      const existingOptions = await db
        .select()
        .from(questionOptions)
        .where(eq(questionOptions.questionId, question.id));

      if (existingOptions.length > 0) {
        alreadyHasOptionsCount++;
        continue;
      }

      // Try to get options from the JSONB field
      let parsedOptions: any[] = [];
      if (question.options) {
        try {
          parsedOptions = typeof question.options === "string"
            ? JSON.parse(question.options)
            : question.options;

          if (!Array.isArray(parsedOptions)) {
            parsedOptions = [];
          }
        } catch {
          parsedOptions = [];
        }
      }

      // Check if JSONB options have valid text
      const hasValidOptions = parsedOptions.length >= 2 && parsedOptions.every((opt: any) => {
        const text = opt?.text || opt?.content || (typeof opt === "string" ? opt : null);
        return text && text.trim().length > 0 && !text.startsWith("Option ");
      });

      if (hasValidOptions) {
        // Create questionOptions from JSONB
        const optionRecords = parsedOptions.map((opt: any, index: number) => {
          const optionId = opt.id || opt.optionId || String.fromCharCode(65 + index);
          const optionText = opt.text || opt.content || String(opt);
          // @ts-ignore
          const isCorrect = String(optionId).toUpperCase() === String(question.correctAnswer).toUpperCase();

          return {
            questionId: question.id,
            optionId,
            text: optionText,
            order: index,
            isCorrect,
          };
        });

        await db.insert(questionOptions).values(optionRecords);
        console.log(`✅ Fixed question ${question.id} - created ${optionRecords.length} options from JSONB`);
        fixedCount++;
      } else {
        // Question needs manual fixing
        questionsNeedingFix.push({
          id: question.id,
          text: question.text?.substring(0, 80) + (question.text && question.text.length > 80 ? "..." : ""),
        });
        needsManualFixCount++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total questions: ${allQuestions.length}`);
    console.log(`Already have options: ${alreadyHasOptionsCount}`);
    console.log(`Fixed from JSONB: ${fixedCount}`);
    console.log(`Need manual fix: ${needsManualFixCount}`);

    if (questionsNeedingFix.length > 0) {
      console.log("\n⚠️  Questions needing manual option entry:");
      console.log("-".repeat(60));
      questionsNeedingFix.slice(0, 20).forEach((q, i) => {
        console.log(`${i + 1}. [${q.id}] ${q.text}`);
      });
      if (questionsNeedingFix.length > 20) {
        console.log(`... and ${questionsNeedingFix.length - 20} more`);
      }
      console.log("\nTo fix these, use the admin panel to edit each question and add proper options.");
    }

    console.log("\n✨ Done!");
  } catch (error) {
    console.error("Error fixing options:", error);
    process.exit(1);
  }
}

fixMissingOptions();

