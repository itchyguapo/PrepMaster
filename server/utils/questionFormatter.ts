/**
 * Shared utility functions for formatting questions
 * Eliminates code duplication across multiple endpoints
 */

export type QuestionOption = {
  id: string;
  text: string;
};

export type FormattedQuestion = {
  id: string;
  text: string;
  options: QuestionOption[];
  correctAnswer: string;
  explanation?: string | null;
  briefExplanation?: string | null;
  detailedExplanation?: string | null;
  subject: string;
  topic?: string | null;
  year?: string | null;
  difficulty?: string | null;
};

/**
 * Formats question options from various input formats to consistent structure
 */
export function formatQuestionOptions(options: any): QuestionOption[] {
  if (!options) {
    return [];
  }

  // If options is a string, try to parse it
  if (typeof options === "string") {
    try {
      options = JSON.parse(options);
    } catch {
      return [];
    }
  }

  // Ensure options is an array
  if (!Array.isArray(options)) {
    return [];
  }

  // Format each option
  return options.map((opt: any, index: number) => {
    // If option is just a string, format it
    if (typeof opt === "string") {
      return {
        id: String.fromCharCode(65 + index), // A, B, C, D
        text: opt,
      };
    }

    // If option is an object, extract id and text
    if (opt && typeof opt === "object") {
      // Check if text property exists (even if empty string)
      if ('text' in opt) {
        return {
          id: opt.id || String.fromCharCode(65 + index),
          text: opt.text !== undefined && opt.text !== null ? String(opt.text) : `Option ${opt.id || String.fromCharCode(65 + index)}`,
        };
      }
      
      // If text doesn't exist, try content
      if ('content' in opt && opt.content !== undefined && opt.content !== null) {
        return {
          id: opt.id || String.fromCharCode(65 + index),
          text: String(opt.content),
        };
      }
      
      // Try other possible properties
      const textValue = opt.text || opt.content || opt.label || opt.value;
      if (textValue !== undefined && textValue !== null) {
        return {
          id: opt.id || String.fromCharCode(65 + index),
          text: String(textValue),
        };
      }
      
      // If we can't find text, log warning and use fallback
      console.warn("Option missing text property:", opt);
      return {
        id: opt.id || String.fromCharCode(65 + index),
        text: String(opt) || `Option ${String.fromCharCode(65 + index)}`,
      };
    }

    // Fallback
    return {
      id: String.fromCharCode(65 + index),
      text: String(opt) || `Option ${String.fromCharCode(65 + index)}`,
    };
  });
}

/**
 * Question input type (from database or API)
 */
export interface QuestionInput {
  id: string;
  text: string;
  options: unknown; // Can be array, string, or object - will be formatted
  correctAnswer: string;
  explanation?: string | null;
  briefExplanation?: string | null;
  detailedExplanation?: string | null;
  subject: string;
  topic?: string | null;
  year?: string | null;
  difficulty?: "easy" | "medium" | "hard" | null;
}

/**
 * Formats a question with subscription-based explanation access
 */
export function formatQuestion(
  question: QuestionInput,
  userPlan: "basic" | "standard" | "premium" = "basic"
): FormattedQuestion {
  const formattedOptions = formatQuestionOptions(question.options);

  // Determine which explanations to include based on subscription tier
  const includeBriefExplanation = userPlan === "standard" || userPlan === "premium";
  const includeDetailedExplanation = userPlan === "premium";

  return {
    id: question.id,
    text: question.text,
    options: formattedOptions,
    correctAnswer: question.correctAnswer,
    // For backward compatibility, use explanation if briefExplanation doesn't exist
    explanation: includeBriefExplanation 
      ? (question.briefExplanation || question.explanation || null)
      : null,
    briefExplanation: includeBriefExplanation 
      ? (question.briefExplanation || question.explanation || null)
      : null,
    detailedExplanation: includeDetailedExplanation 
      ? (question.detailedExplanation || null)
      : null,
    subject: question.subject,
    topic: question.topic || null,
    year: question.year || null,
    difficulty: question.difficulty || null,
  };
}

/**
 * Validates question structure
 */
export function validateQuestion(question: Partial<QuestionInput>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!question.text || typeof question.text !== "string" || question.text.trim().length === 0) {
    errors.push("Question text is required");
  }

  if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
    errors.push("At least 2 options are required");
  }

  if (!question.correctAnswer || typeof question.correctAnswer !== "string") {
    errors.push("Correct answer is required");
  }

  // Validate that correctAnswer exists in options
  if (question.options && question.correctAnswer) {
    const formattedOptions = formatQuestionOptions(question.options);
    const optionIds = formattedOptions.map(opt => opt.id);
    const optionTexts = formattedOptions.map(opt => opt.text.toLowerCase().trim());
    const correctAnswerLower = question.correctAnswer.toLowerCase().trim();

    const answerExists = 
      optionIds.includes(question.correctAnswer) ||
      optionTexts.includes(correctAnswerLower) ||
      formattedOptions.some(opt => 
        opt.id.toLowerCase() === correctAnswerLower ||
        opt.text.toLowerCase() === correctAnswerLower
      );

    if (!answerExists) {
      errors.push(`Correct answer "${question.correctAnswer}" does not match any option`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

