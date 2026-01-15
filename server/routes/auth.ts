import { Router, type Request, type Response } from "express";
import { authLimiter, userSyncLimiter } from "../middleware/rateLimiter";
import { db } from "../db";
import { users, subscriptions, attempts, tutorProfiles } from "@shared/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { isAdminEmail, normalizeEmail } from "../utils/adminEmails";
import { ExamLimitService, TIER_LIMITS } from "../services/ExamLimitService";

const router = Router();

// Get subscription status for a user from subscriptions table
router.get("/subscription", async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Find user by supabaseId
    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, userId as string))
      .limit(1);

    if (userRecords.length === 0) {
      // User doesn't exist in our DB yet, return basic status
      // Note: For tutors, they should have been created via sync-user endpoint first
      return res.json({
        status: "basic",
        plan: "basic",
        isActive: false,
        canAccessExams: false, // Must pay to access exams
        canDownloadOffline: false,
        canAccessTutorMode: false
      });
    }

    const user = userRecords[0];

    // Get the most recent active subscription
    const subscriptionRecords = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, user.id),
          eq(subscriptions.status, "active")
        )
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    let plan = "basic";
    let isActive = false;
    let expiresAt: Date | null = null;

    if (subscriptionRecords.length > 0) {
      const subscription = subscriptionRecords[0];
      plan = subscription.plan || "basic";
      isActive = subscription.status === "active";
      expiresAt = subscription.expiresAt ? new Date(subscription.expiresAt) : null;

      // Check if subscription has expired (skip check for lifetime subscriptions)
      if (!subscription.isLifetime && expiresAt && expiresAt < new Date()) {
        // Update subscription status to expired
        await db
          .update(subscriptions)
          .set({ status: "expired" })
          .where(eq(subscriptions.id, subscription.id));
        isActive = false;
        plan = "basic";
      }
      isActive = false;
      plan = "basic";
    }

    // Determine access based on subscription
    // basic: exam access with daily limit (1/day), standard: unlimited exam access, premium: unlimited with advanced features
    // Note: Tutor mode is NOT included in student pricing - only available via custom quotes for tutors/schools
    const canAccessExams = isActive; // Must have an active paid subscription
    const canDownloadOffline = plan === "standard" || plan === "premium"; // Only Standard and Premium can download offline
    // Tutor mode is only for users with role="tutor" (set via custom quotes), NOT for premium students
    const canAccessTutorMode = user.role === "tutor";

    return res.json({
      status: isActive && (plan === "standard" || plan === "premium") ? "premium" : "basic",
      plan,
      isActive,
      canAccessExams,
      canDownloadOffline,
      canAccessTutorMode,
      expiresAt: expiresAt?.toISOString() || null
    });
  } catch (err: any) {
    console.error("Error fetching subscription:", err);
    return res.status(500).json({ message: "Failed to fetch subscription", error: err.message || String(err) });
  }
});

// Sync Supabase user to our database
router.post("/sync-user", userSyncLimiter, async (req: Request, res: Response) => {
  try {
    const { supabaseId, email, phone } = req.body;

    if (!supabaseId) {
      return res.status(400).json({ message: "supabaseId is required" });
    }

    // Check if email is in admin whitelist
    const userEmail = normalizeEmail(email);
    const isAdmin = isAdminEmail(userEmail);

    // Check if user exists
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, supabaseId))
      .limit(1);

    if (existingUsers.length > 0) {
      // Update existing user - set role if admin
      const updateData: any = {
        email: email || existingUsers[0].email,
        phone: phone || existingUsers[0].phone,
        updatedAt: new Date(),
      };

      // Set role to admin if email is in whitelist, or remove admin role if not
      if (isAdmin) {
        updateData.role = "admin";
      }

      const [updated] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.supabaseId, supabaseId))
        .returning();

      console.log(`[USER SYNC] ✅ User synced: ${updated.email}`);
      console.log(`[USER SYNC]   Role: ${updated.role || 'student'}, Plan: ${updated.subscriptionStatus || 'basic'}`);

      return res.json(updated);
    } else {
      // Create new user - ensure username is unique
      let username = email?.split("@")[0] || `user_${supabaseId.slice(0, 8)}`;
      let attempts = 0;

      // Check if username exists and make it unique if needed
      while (attempts < 10) {
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (existing.length === 0) break;
        username = `${username}_${Math.floor(Math.random() * 1000)}`;
        attempts++;
      }

      const [newUser] = await db
        .insert(users)
        .values({
          supabaseId,
          email: email || null,
          phone: phone || null,
          username,
          password: "", // No password needed for Supabase auth
          role: isAdmin ? "admin" : "student",
          subscriptionStatus: "basic",
        })
        .returning();

      // Note: No default subscription created. User must choose a plan.

      return res.json(newUser);
    }
  } catch (err: any) {
    console.error("Error syncing user:", err);
    return res.status(500).json({ message: "Failed to sync user", error: err.message || String(err) });
  }
});

// Get current user data from database
router.get("/me", async (req: Request, res: Response) => {
  try {
    const { supabaseId } = req.query;

    if (!supabaseId) {
      return res.status(400).json({ message: "supabaseId is required" });
    }

    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, supabaseId as string))
      .limit(1);

    if (userRecords.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRecords[0];

    // Check if user email is in admin whitelist and update role if needed
    const userEmail = normalizeEmail(user.email);
    const isInWhitelist = isAdminEmail(userEmail);

    // If user is in whitelist but role is not set to admin, update it
    if (isInWhitelist && user.role !== "admin") {
      await db
        .update(users)
        .set({ role: "admin", updatedAt: new Date() })
        .where(eq(users.id, user.id));
      // Update user object for response
      user.role = "admin";
    }

    // Get subscription from subscriptions table
    const subscriptionRecords = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, user.id),
          eq(subscriptions.status, "active")
        )
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    let plan = "basic";
    let isActive = false;
    let expiresAt: Date | null = null;

    if (subscriptionRecords.length > 0) {
      const subscription = subscriptionRecords[0];
      plan = subscription.plan || "basic";
      isActive = subscription.status === "active";
      expiresAt = subscription.expiresAt ? new Date(subscription.expiresAt) : null;

      // Check if subscription has expired (skip check for lifetime subscriptions)
      if (!subscription.isLifetime && expiresAt && expiresAt < new Date()) {
        await db
          .update(subscriptions)
          .set({ status: "expired" })
          .where(eq(subscriptions.id, subscription.id));
        isActive = false;
        plan = "basic";
      }
      isActive = false;
      plan = "basic";
    }

    // Determine access: basic = exam access with daily limit, standard = unlimited exam access, premium = unlimited with advanced features
    // Note: Tutor mode is NOT available through student pricing - only for users with role="tutor" via custom quotes
    const subscriptionStatus = isActive && (plan === "standard" || plan === "premium") ? "premium" : (isActive ? "basic" : "unpaid");
    const canAccessTutorMode = user.role === "tutor"; // Only tutors (via custom quotes) get tutor mode, not premium students
    const canAccessExams = isActive; // Must have an active paid subscription
    const canDownloadOffline = plan === "standard" || plan === "premium";

    let tutorPlan = null;
    let studentQuota = null;

    if (user.role === "tutor") {
      const profile = await db
        .select()
        .from(tutorProfiles)
        .where(eq(tutorProfiles.userId, user.id))
        .limit(1);

      if (profile.length > 0) {
        studentQuota = profile[0].studentQuota;
        // Logic for tutor plan display
        if (studentQuota <= 50) tutorPlan = "Basic Tutor";
        else if (studentQuota <= 500) tutorPlan = "Professional Tutor";
        else tutorPlan = "Institutional Tutor";
      } else {
        tutorPlan = "Standard Tutor";
      }
    }

    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role || "student",
      emailConfirmed: user.emailConfirmed || false,
      subscriptionStatus,
      subscriptionPlan: plan,
      subscriptionExpiresAt: expiresAt?.toISOString() || null,
      preferredExamBody: user.preferredExamBody || null,
      canAccessExams,
      canDownloadOffline,
      canAccessTutorMode,
      tutorPlan,
      studentQuota,
      createdAt: user.createdAt,
    });
  } catch (err: any) {
    console.error("Error fetching user:", err);
    return res.status(500).json({ message: "Failed to fetch user", error: err.message || String(err) });
  }
});

// Confirm email
router.post("/confirm-email", authLimiter, async (req: Request, res: Response) => {
  try {
    const { supabaseId } = req.body;

    if (!supabaseId) {
      return res.status(400).json({ message: "supabaseId is required" });
    }

    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, supabaseId as string))
      .limit(1);

    if (userRecords.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const [updated] = await db
      .update(users)
      .set({ emailConfirmed: true, updatedAt: new Date() })
      .where(eq(users.supabaseId, supabaseId as string))
      .returning();

    return res.json({ message: "Email confirmed", user: updated });
  } catch (err: any) {
    console.error("Error confirming email:", err);
    return res.status(500).json({ message: "Failed to confirm email", error: err.message || String(err) });
  }
});

// Get daily usage stats for a user
router.get("/usage", async (req: Request, res: Response) => {
  try {
    const { supabaseId } = req.query;

    if (!supabaseId) {
      return res.status(400).json({ message: "supabaseId is required" });
    }

    // Find user
    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, supabaseId as string))
      .limit(1);

    if (userRecords.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRecords[0];

    // Get subscription to determine plan
    const subscriptionRecords = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, user.id),
          eq(subscriptions.status, "active")
        )
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    const usage = await ExamLimitService.getUsage(user.id);
    return res.json(usage);
  } catch (err: any) {
    console.error("Error fetching usage:", err);
    return res.status(500).json({ message: "Failed to fetch usage", error: err.message || String(err) });
  }
});

// Update preferred exam body for Basic plan users
router.put("/preferred-exam-body", async (req: Request, res: Response) => {
  try {
    const { supabaseId, examBody } = req.body;

    if (!supabaseId || !examBody) {
      return res.status(400).json({ message: "supabaseId and examBody are required" });
    }

    // Find user
    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, supabaseId as string))
      .limit(1);

    if (userRecords.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRecords[0];

    // Get subscription to check if Basic plan
    const subscriptionRecords = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, user.id),
          eq(subscriptions.status, "active")
        )
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    const plan = subscriptionRecords[0]?.plan || "basic";

    // Only allow setting for Basic plan users
    if (plan !== "basic") {
      return res.status(400).json({ message: "Preferred exam body can only be set for Basic plan users" });
    }

    // Validate exam body
    if (examBody !== "WAEC" && examBody !== "JAMB") {
      return res.status(400).json({ message: "examBody must be either 'WAEC' or 'JAMB'" });
    }

    // Update user
    await db
      .update(users)
      .set({ preferredExamBody: examBody, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return res.json({ message: "Preferred exam body updated", examBody });
  } catch (err: any) {
    console.error("Error updating preferred exam body:", err);
    return res.status(500).json({ message: "Failed to update preferred exam body", error: err.message || String(err) });
  }
});

export default router;

