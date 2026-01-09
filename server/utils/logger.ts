import { db } from "../db";
import { activityLogs } from "@shared/schema";

export type ActivityType = 'user' | 'subscription' | 'exam_content' | 'system' | 'payment';

/**
 * Log an activity to the system audit trail
 */
export async function logActivity({
    type,
    action,
    user,
    details,
    actorId
}: {
    type: ActivityType;
    action: string;
    user: string;
    details?: string;
    actorId?: string;
}) {
    try {
        const [log] = await db.insert(activityLogs).values({
            type,
            action,
            user,
            details: details || null,
            actorId,
            timestamp: new Date()
        }).returning();

        console.log(`[ACTIVITY LOG] ${type.toUpperCase()}: ${action} for ${user}`);
        return log;
    } catch (err) {
        console.error("[ACTIVITY LOG] Error recording log:", err);
        // Don't throw - we don't want logging failures to crash the main request
        return null;
    }
}
