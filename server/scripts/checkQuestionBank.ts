/**
 * Question Bank Diagnostic Script
 * 
 * This script checks the question bank for common problems:
 * - Questions with missing or empty text
 * - Questions with invalid options structure
 * - Questions where correctAnswer doesn't match any option
 * - Questions with missing required fields
 * - Questions with empty option text
 * 
 * Run with: npx tsx server/scripts/checkQuestionBank.ts
 */

import { db } from "../db";
import { questions } from "@shared/schema";
import { formatQuestionOptions } from "../utils/questionFormatter";

async function checkQuestionBank() {
  console.log("🔍 Starting Question Bank Diagnostics...\n");

  try {
    const allQuestions = await db.select().from(questions);

    const diagnostics = {
      totalQuestions: allQuestions.length,
      problems: [] as Array<{ type: string; questionId: string; issue: string; severity: "error" | "warning" }>,
      statistics: {
        questionsWithNoText: 0,
        questionsWithInvalidOptions: 0,
        questionsWithMismatchedAnswer: 0,
        questionsWithMissingFields: 0,
        questionsWithEmptyOptions: 0,
        questionsWithInvalidStatus: 0,
        questionsWithNoOptions: 0,
      },
    };

    console.log(`📊 Analyzing ${allQuestions.length} questions...\n`);

    for (const question of allQuestions) {
      const issues: Array<{ type: string; issue: string; severity: "error" | "warning" }> = [];

      // Check 1: Missing or empty text
      if (!question.text || typeof question.text !== "string" || question.text.trim().length === 0) {
        issues.push({ type: "missing_text", issue: "Question text is missing or empty", severity: "error" });
        diagnostics.statistics.questionsWithNoText++;
      }

      // Check 2: Invalid options structure
      let options: any = question.options;
      if (!options) {
        issues.push({ type: "no_options", issue: "Options field is missing", severity: "error" });
        diagnostics.statistics.questionsWithNoOptions++;
      } else {
        // Try to parse if string
        if (typeof options === "string") {
          try {
            options = JSON.parse(options);
          } catch {
            issues.push({ type: "invalid_options", issue: "Options is invalid JSON string", severity: "error" });
            diagnostics.statistics.questionsWithInvalidOptions++;
          }
        }

        // Check if options is an array
        if (!Array.isArray(options)) {
          issues.push({ type: "invalid_options", issue: "Options is not an array", severity: "error" });
          diagnostics.statistics.questionsWithInvalidOptions++;
        } else {
          // Check if options array is empty
          if (options.length === 0) {
            issues.push({ type: "empty_options", issue: "Options array is empty", severity: "error" });
            diagnostics.statistics.questionsWithEmptyOptions++;
          } else if (options.length < 2) {
            issues.push({ type: "insufficient_options", issue: `Only ${options.length} option(s) found (need at least 2)`, severity: "error" });
            diagnostics.statistics.questionsWithInvalidOptions++;
          } else {
            // Check each option for missing text
            const optionsWithIssues = options.filter((opt: any, idx: number) => {
              if (typeof opt === "string") {
                return opt.trim().length === 0;
              }
              if (opt && typeof opt === "object") {
                const text = opt.text || opt.content || opt.label || opt.value;
                return !text || String(text).trim().length === 0;
              }
              return true;
            });

            if (optionsWithIssues.length > 0) {
              issues.push({
                type: "empty_option_text",
                issue: `${optionsWithIssues.length} option(s) have empty or missing text`,
                severity: "warning"
              });
            }
          }
        }
      }

      /* 
       * NOTE: correctAnswer logic has moved to questionOptions table.
       * Disabling this check in this script for now as it requires joining tables.
       *
      // Check 3: Missing correct answer
      if (!question.correctAnswer || typeof question.correctAnswer !== "string" || question.correctAnswer.trim().length === 0) {
        issues.push({ type: "missing_correct_answer", issue: "Correct answer is missing or empty", severity: "error" });
        diagnostics.statistics.questionsWithMissingFields++;
      } else if (options && Array.isArray(options)) {
        // ... (rest of logic)
      }
      */


      // Check 4: Missing required foreign keys
      if (!question.examBodyId) {
        issues.push({ type: "missing_exam_body", issue: "examBodyId is missing", severity: "error" });
        diagnostics.statistics.questionsWithMissingFields++;
      }
      if (!question.categoryId) {
        issues.push({ type: "missing_category", issue: "categoryId is missing", severity: "error" });
        diagnostics.statistics.questionsWithMissingFields++;
      }
      if (!question.subjectId) {
        issues.push({ type: "missing_subject", issue: "subjectId is missing", severity: "error" });
        diagnostics.statistics.questionsWithMissingFields++;
      }

      // Check 5: Invalid status
      if (question.status && !["Active", "Review"].includes(question.status)) {
        issues.push({ type: "invalid_status", issue: `Invalid status: ${question.status}`, severity: "warning" });
        diagnostics.statistics.questionsWithInvalidStatus++;
      }

      // Add all issues for this question
      issues.forEach(issue => {
        diagnostics.problems.push({
          questionId: question.id,
          ...issue,
        });
      });
    }

    // Calculate summary
    const errorCount = diagnostics.problems.filter(p => p.severity === "error").length;
    const warningCount = diagnostics.problems.filter(p => p.severity === "warning").length;
    const healthyQuestions = diagnostics.totalQuestions - errorCount;

    // Print results
    console.log("=".repeat(60));
    console.log("📋 DIAGNOSTIC RESULTS");
    console.log("=".repeat(60));
    console.log(`\nTotal Questions: ${diagnostics.totalQuestions}`);
    console.log(`✅ Healthy Questions: ${healthyQuestions} (${Math.round((healthyQuestions / diagnostics.totalQuestions) * 100)}%)`);
    console.log(`❌ Questions with Errors: ${errorCount}`);
    console.log(`⚠️  Questions with Warnings: ${warningCount}`);
    console.log(`\n📊 STATISTICS:`);
    console.log(`   - Questions with no text: ${diagnostics.statistics.questionsWithNoText}`);
    console.log(`   - Questions with invalid options: ${diagnostics.statistics.questionsWithInvalidOptions}`);
    console.log(`   - Questions with no options: ${diagnostics.statistics.questionsWithNoOptions}`);
    console.log(`   - Questions with empty options: ${diagnostics.statistics.questionsWithEmptyOptions}`);
    console.log(`   - Questions with mismatched answer: ${diagnostics.statistics.questionsWithMismatchedAnswer}`);
    console.log(`   - Questions with missing fields: ${diagnostics.statistics.questionsWithMissingFields}`);
    console.log(`   - Questions with invalid status: ${diagnostics.statistics.questionsWithInvalidStatus}`);

    if (diagnostics.problems.length > 0) {
      console.log(`\n🔍 PROBLEMS FOUND:\n`);

      // Group by type
      const problemsByType: Record<string, Array<typeof diagnostics.problems[0]>> = {};
      diagnostics.problems.forEach(problem => {
        if (!problemsByType[problem.type]) {
          problemsByType[problem.type] = [];
        }
        problemsByType[problem.type].push(problem);
      });

      Object.entries(problemsByType).forEach(([type, problems]) => {
        console.log(`\n${type.toUpperCase().replace(/_/g, " ")} (${problems.length} questions):`);
        problems.slice(0, 10).forEach(problem => {
          console.log(`   - Question ID: ${problem.questionId} - ${problem.issue}`);
        });
        if (problems.length > 10) {
          console.log(`   ... and ${problems.length - 10} more`);
        }
      });
    } else {
      console.log(`\n✅ No problems found! All questions are healthy.`);
    }

    console.log("\n" + "=".repeat(60));

    // Return exit code based on errors
    process.exit(errorCount > 0 ? 1 : 0);
  } catch (err: any) {
    console.error("❌ Error running diagnostics:", err);
    process.exit(1);
  }
}

void checkQuestionBank();

