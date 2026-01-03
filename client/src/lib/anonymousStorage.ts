/**
 * Anonymous Storage Utilities
 * Handles localStorage for anonymous users who haven't signed up yet
 */

const ANONYMOUS_STORAGE_PREFIX = "prepmaster_anonymous_";
const STORAGE_KEYS = {
  PRACTICE_ATTEMPTS: `${ANONYMOUS_STORAGE_PREFIX}practice_attempts`,
  QUESTION_HISTORY: `${ANONYMOUS_STORAGE_PREFIX}question_history`,
  STREAK_DATA: `${ANONYMOUS_STORAGE_PREFIX}streak_data`,
  LAST_PRACTICE_DATE: `${ANONYMOUS_STORAGE_PREFIX}last_practice_date`,
} as const;

export type AnonymousPracticeAttempt = {
  id: string;
  examBodyId: string;
  examBodyName: string;
  questions: Array<{
    id: string;
    userAnswer: string;
    isCorrect: boolean;
    correctAnswer: string;
  }>;
  score: { correct: number; total: number };
  completedAt: number;
};

export type AnonymousStreakData = {
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
};

/**
 * Save an anonymous practice attempt
 */
export function saveAnonymousAttempt(attempt: AnonymousPracticeAttempt): void {
  try {
    const attempts = getAnonymousAttempts();
    attempts.push(attempt);
    localStorage.setItem(STORAGE_KEYS.PRACTICE_ATTEMPTS, JSON.stringify(attempts));
    
    // Update last practice date
    localStorage.setItem(STORAGE_KEYS.LAST_PRACTICE_DATE, new Date().toISOString());
    
    // Update streak data
    updateAnonymousStreak();
  } catch (error) {
    console.error("Error saving anonymous attempt:", error);
  }
}

/**
 * Get all anonymous practice attempts
 */
export function getAnonymousAttempts(): AnonymousPracticeAttempt[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PRACTICE_ATTEMPTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading anonymous attempts:", error);
    return [];
  }
}

/**
 * Get anonymous streak data
 */
export function getAnonymousStreak(): AnonymousStreakData {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STREAK_DATA);
    if (data) {
      return JSON.parse(data);
    }
    
    // Initialize streak data
    const initialData: AnonymousStreakData = {
      currentStreak: 0,
      longestStreak: 0,
      lastPracticeDate: null,
    };
    localStorage.setItem(STORAGE_KEYS.STREAK_DATA, JSON.stringify(initialData));
    return initialData;
  } catch (error) {
    console.error("Error loading anonymous streak:", error);
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastPracticeDate: null,
    };
  }
}

/**
 * Update anonymous streak based on last practice date
 */
function updateAnonymousStreak(): void {
  try {
    const streakData = getAnonymousStreak();
    const lastPracticeDate = localStorage.getItem(STORAGE_KEYS.LAST_PRACTICE_DATE);
    const today = new Date().toISOString().split("T")[0];
    
    if (!lastPracticeDate) {
      // First practice
      const newStreak: AnonymousStreakData = {
        currentStreak: 1,
        longestStreak: 1,
        lastPracticeDate: today,
      };
      localStorage.setItem(STORAGE_KEYS.STREAK_DATA, JSON.stringify(newStreak));
      return;
    }
    
    const lastDate = new Date(lastPracticeDate).toISOString().split("T")[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    
    if (lastDate === today) {
      // Already practiced today, don't increment
      return;
    } else if (lastDate === yesterdayStr) {
      // Practiced yesterday, increment streak
      const newStreak = streakData.currentStreak + 1;
      const newStreakData: AnonymousStreakData = {
        currentStreak: newStreak,
        longestStreak: Math.max(streakData.longestStreak, newStreak),
        lastPracticeDate: today,
      };
      localStorage.setItem(STORAGE_KEYS.STREAK_DATA, JSON.stringify(newStreakData));
    } else {
      // Gap in practice, reset streak
      const newStreakData: AnonymousStreakData = {
        currentStreak: 1,
        longestStreak: streakData.longestStreak,
        lastPracticeDate: today,
      };
      localStorage.setItem(STORAGE_KEYS.STREAK_DATA, JSON.stringify(newStreakData));
    }
  } catch (error) {
    console.error("Error updating anonymous streak:", error);
  }
}

/**
 * Get total questions answered anonymously
 */
export function getAnonymousTotalQuestions(): number {
  const attempts = getAnonymousAttempts();
  return attempts.reduce((total, attempt) => total + attempt.score.total, 0);
}

/**
 * Get anonymous accuracy percentage
 */
export function getAnonymousAccuracy(): number {
  const attempts = getAnonymousAttempts();
  if (attempts.length === 0) return 0;
  
  const totalCorrect = attempts.reduce((sum, attempt) => sum + attempt.score.correct, 0);
  const totalQuestions = attempts.reduce((sum, attempt) => sum + attempt.score.total, 0);
  
  return totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
}

/**
 * Clear all anonymous data (useful when user signs up)
 */
export function clearAnonymousData(): void {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error("Error clearing anonymous data:", error);
  }
}

/**
 * Check if user has anonymous practice history
 */
export function hasAnonymousHistory(): boolean {
  const attempts = getAnonymousAttempts();
  return attempts.length > 0;
}

