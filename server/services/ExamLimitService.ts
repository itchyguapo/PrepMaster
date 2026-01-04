import { db } from "../db";
import { users, exams, downloads } from "@shared/schema";
import { eq, and, sql, count, not } from "drizzle-orm";

// Tier Definitions
export const TIER_LIMITS = {
    basic: {
        maxActiveExams: 1,
        maxDownloads: 0,
        dailyGenerationQuota: 1,
        canDownload: false,
    },
    standard: {
        maxActiveExams: 3,
        maxDownloads: 1,
        dailyGenerationQuota: 100, // Effectively unlimited (or high enough)
        canDownload: true,
    },
    premium: {
        maxActiveExams: 10,
        maxDownloads: 5,
        dailyGenerationQuota: 1000, // Unlimited
        canDownload: true,
    }
};

type LimitCheckResult = {
    allowed: boolean;
    reason?: string;
    currentUsage?: number;
    limit?: number;
    resetTime?: number; // Time until reset in ms (for daily quota)
};

export class ExamLimitService {

    /**
     * Check if user can generate a new exam based on tier limits
     */
    static async checkGenerationLimit(userId: string): Promise<LimitCheckResult> {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (!user) return { allowed: false, reason: "User not found" };

        const tier = (user.subscriptionStatus as keyof typeof TIER_LIMITS) || "basic";
        const limits = TIER_LIMITS[tier] || TIER_LIMITS.basic;

        console.log(`[TIER CHECK] User: ${user.email || user.id}`);
        console.log(`[TIER CHECK]   Role: ${user.role || 'student'}, Plan: ${tier}`);
        console.log(`[TIER CHECK]   Limits: maxActive=${limits.maxActiveExams}, dailyQuota=${limits.dailyGenerationQuota}, canDownload=${limits.canDownload}`);

        // 1. Check Active Exams Limit
        // Count active exams (not archived)
        const activeExamsCount = await db
            .select({ count: count() })
            .from(exams)
            .where(and(
                eq(exams.createdBy, userId),
                not(eq(exams.status, "archived"))
            ));

        // Note: The exams table status enum is ["draft", "published", "archived"]. 
        // We should clarify "Active". 
        // For now, let's assume "Active" means non-archived exams created by the user.
        // Or better, we should rely on the `activeGeneratedExams` cached field if we maintained it, 
        // but for accuracy, a count query is better.
        // Let's count exams that are NOT archived for now. The requirement said "active generated exams".

        const currentActive = activeExamsCount[0].count;

        if (currentActive >= limits.maxActiveExams) {
            return {
                allowed: false,
                reason: `You have reached your limit of ${limits.maxActiveExams} active exams for the ${tier} plan. Please complete or delete existing exams.`,
                currentUsage: currentActive,
                limit: limits.maxActiveExams
            };
        }

        // 2. Check Daily Quota
        // First, check if we need to reset
        const now = new Date();
        const lastReset = user.lastQuotaReset ? new Date(user.lastQuotaReset) : new Date(0);
        const msSinceReset = now.getTime() - lastReset.getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (msSinceReset >= oneDayMs) {
            // Quota has expired, effectively 0 used. We will verify and reset in the increment step or here.
            // For check logic, it's allowed.
        } else {
            if ((user.dailyQuotaUsed || 0) >= limits.dailyGenerationQuota) {
                const timeRemaining = oneDayMs - msSinceReset;
                return {
                    allowed: false,
                    reason: `You have reached your daily generation limit of ${limits.dailyGenerationQuota} exams.`,
                    currentUsage: user.dailyQuotaUsed || 0,
                    limit: limits.dailyGenerationQuota,
                    resetTime: timeRemaining
                };
            }
        }

        return { allowed: true };
    }

    /**
     * Check if user can download an exam
     */
    static async checkDownloadLimit(userId: string): Promise<LimitCheckResult> {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (!user) return { allowed: false, reason: "User not found" };

        const tier = (user.subscriptionStatus as keyof typeof TIER_LIMITS) || "basic";
        const limits = TIER_LIMITS[tier] || TIER_LIMITS.basic;

        if (!limits.canDownload) {
            return {
                allowed: false,
                reason: "Downloads are not available on the Basic plan. Please upgrade to Standard or Premium.",
                limit: 0
            };
        }

        const downloadCount = await db
            .select({ count: count() })
            .from(downloads)
            .where(eq(downloads.userId, userId));

        const currentDownloads = downloadCount[0].count;

        if (currentDownloads >= limits.maxDownloads) {
            return {
                allowed: false,
                reason: `You have reached your limit of ${limits.maxDownloads} downloaded exams. Delete an existing download to make space.`,
                currentUsage: currentDownloads,
                limit: limits.maxDownloads
            };
        }

        return { allowed: true };
    }


    /**
     * Get full usage stats for dashboard
     */
    static async getUsage(userId: string) {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (!user) throw new Error("User not found");

        const tier = (user.subscriptionStatus as keyof typeof TIER_LIMITS) || "basic";
        const limits = TIER_LIMITS[tier] || TIER_LIMITS.basic;

        // 1. Daily Quota
        const now = new Date();
        const lastReset = user.lastQuotaReset ? new Date(user.lastQuotaReset) : new Date(0);
        const msSinceReset = now.getTime() - lastReset.getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;

        // Calculate actual used today (reset if > 24h)
        let dailyUsed = user.dailyQuotaUsed || 0;
        if (msSinceReset >= oneDayMs) {
            dailyUsed = 0;
        }

        // 2. Active Exams
        const activeExamsCount = await db
            .select({ count: count() })
            .from(exams)
            .where(and(
                eq(exams.createdBy, userId),
                not(eq(exams.status, "archived"))
            ));
        const activeCount = activeExamsCount[0].count;

        // 3. Downloads
        const downloadCount = await db
            .select({ count: count() })
            .from(downloads)
            .where(eq(downloads.userId, userId));
        const dlCount = downloadCount[0].count;

        return {
            plan: tier,
            daily: {
                count: dailyUsed,
                limit: limits.dailyGenerationQuota,
                remaining: Math.max(0, limits.dailyGenerationQuota - dailyUsed),
                resetIn: Math.max(0, oneDayMs - msSinceReset)
            },
            activeExams: {
                count: activeCount,
                limit: limits.maxActiveExams,
                remaining: Math.max(0, limits.maxActiveExams - activeCount)
            },
            downloads: {
                count: dlCount,
                limit: limits.maxDownloads,
                remaining: Math.max(0, limits.maxDownloads - dlCount)
            }
        };
    }

    /**
     * Increment users daily quota usage. Resets if 24h passed.
     */

    static async incrementDailyQuota(userId: string): Promise<void> {
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (!user) return;

        const now = new Date();
        const lastReset = user.lastQuotaReset ? new Date(user.lastQuotaReset) : new Date(0);
        const msSinceReset = now.getTime() - lastReset.getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (msSinceReset >= oneDayMs) {
            // Reset
            await db.update(users)
                .set({
                    dailyQuotaUsed: 1,
                    lastQuotaReset: now
                })
                .where(eq(users.id, userId));
        } else {
            // Increment
            await db.update(users)
                .set({
                    dailyQuotaUsed: (user.dailyQuotaUsed || 0) + 1
                })
                .where(eq(users.id, userId));
        }
    }

    /**
     * Record a download
     */
    static async recordDownload(userId: string, examId: string): Promise<void> {
        await db.insert(downloads)
            .values({
                userId,
                examId,
                downloadedAt: new Date()
            })
            .onConflictDoNothing(); // Prevent duplicate counting for same exam
    }

    /**
     * Remove a download (to free up slots)
     */
    static async removeDownload(userId: string, examId: string): Promise<void> {
        await db.delete(downloads)
            .where(and(
                eq(downloads.userId, userId),
                eq(downloads.examId, examId)
            ));
    }
}
