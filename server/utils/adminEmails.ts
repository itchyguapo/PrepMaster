/**
 * Centralized utility for managing admin email whitelist
 * This ensures consistent email checking across the application
 */

// Ensure environment variables are loaded
import "dotenv/config";

/**
 * Normalizes an email address for comparison
 * - Converts to lowercase
 * - Trims whitespace
 * - Returns null if email is invalid/empty
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

/**
 * Gets admin emails from environment variable
 * - Reads from ADMIN_EMAILS env var (comma-separated)
 * - Normalizes all emails (lowercase, trimmed)
 * - Filters out empty values
 * - Caches the result for performance
 */
let cachedAdminEmails: string[] | null = null;
let lastEnvCheck: string | null = null;

export function getAdminEmails(): string[] {
  const adminEmailsEnv = process.env.ADMIN_EMAILS || "";
  
  // If env var hasn't changed, return cached result
  if (cachedAdminEmails !== null && lastEnvCheck === adminEmailsEnv) {
    return cachedAdminEmails;
  }
  
  // Update cache
  lastEnvCheck = adminEmailsEnv;
  
  if (!adminEmailsEnv || adminEmailsEnv.trim() === "") {
    console.warn("[ADMIN EMAILS] ADMIN_EMAILS environment variable not set. Admin access will be denied.");
    cachedAdminEmails = [];
    return cachedAdminEmails;
  }
  
  // Parse and normalize emails
  const emails = adminEmailsEnv
    .split(",")
    .map(email => normalizeEmail(email))
    .filter((email): email is string => email !== null);
  
  // Log for debugging
  if (emails.length > 0) {
    console.log(`[ADMIN EMAILS] Loaded ${emails.length} admin email(s): ${emails.join(", ")}`);
  } else {
    console.warn("[ADMIN EMAILS] No valid admin emails found after parsing. Check ADMIN_EMAILS format.");
  }
  
  cachedAdminEmails = emails;
  return cachedAdminEmails;
}

/**
 * Checks if an email is in the admin whitelist
 * @param email - The email to check (will be normalized)
 * @returns true if the email is in the admin whitelist
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;
  
  const adminEmails = getAdminEmails();
  const isAdmin = adminEmails.includes(normalizedEmail);
  
  // Log for debugging (only in development or when access is denied)
  if (process.env.NODE_ENV === "development") {
    console.log(`[ADMIN EMAILS] Checking ${normalizedEmail}: ${isAdmin ? "ADMIN" : "NOT ADMIN"}`);
  }
  
  return isAdmin;
}

/**
 * Clears the cached admin emails (useful for testing or when env vars change)
 */
export function clearAdminEmailsCache(): void {
  cachedAdminEmails = null;
  lastEnvCheck = null;
}

/**
 * Validates that ADMIN_EMAILS is properly configured
 * Logs warnings if not set or invalid
 */
export function validateAdminEmailsConfig(): void {
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) {
    console.warn("[ADMIN EMAILS] ⚠️  No admin emails configured. Set ADMIN_EMAILS in .env file.");
    console.warn("[ADMIN EMAILS] Example: ADMIN_EMAILS=admin@example.com,another@example.com");
  }
}

