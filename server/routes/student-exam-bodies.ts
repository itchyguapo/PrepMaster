import { Router, type Request, type Response } from "express";
import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { users, subscriptions, examBodies, categories } from "@shared/schema";

const router = Router();

// Get exam bodies available for user's payment tier
router.get("/available", async (req: Request, res: Response) => {
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
      .limit(1);

    const plan = subscriptionRecords[0]?.plan || "basic";

    // Filter exam bodies by tier (all exam bodies are active for now)
    let availableExamBodies = await db
      .select()
      .from(examBodies);

    // Apply tier-based filtering
    if (plan === "basic") {
      // Basic users get limited exam bodies (e.g., only WAEC)
      availableExamBodies = availableExamBodies.filter(body => 
        body.name === "WAEC" || body.name === "NECO"
      );
    } else if (plan === "standard") {
      // Standard users get more exam bodies
      availableExamBodies = availableExamBodies.filter(body => 
        ["WAEC", "NECO", "JAMB", "POST-UTME"].includes(body.name || "")
      );
    }
    // Premium users get all exam bodies

    return res.json(availableExamBodies.map(body => ({
      id: body.id,
      name: body.name,
      tierRestriction: plan === "basic" ? "basic" : plan === "standard" ? "standard" : "none"
    })));

  } catch (err: any) {
    console.error("Error fetching available exam bodies:", err);
    return res.status(500).json({ 
      message: "Failed to fetch exam bodies", 
      error: err.message || String(err) 
    });
  }
});

// Get categories for a specific exam body
router.get("/categories", async (req: Request, res: Response) => {
  try {
    const { exam_body_id } = req.query;

    if (!exam_body_id) {
      return res.status(400).json({ message: "exam_body_id is required" });
    }

    // Fetch categories for the exam body
    const categoryRecords = await db
      .select()
      .from(categories)
      .where(eq(categories.examBodyId, exam_body_id as string));

    // If no categories found, return default Science/Arts/Commercial
    if (categoryRecords.length === 0) {
      return res.json([
        { id: "science", name: "Science" },
        { id: "arts", name: "Arts" },
        { id: "commercial", name: "Commercial" }
      ]);
    }

    return res.json(categoryRecords.map(cat => ({
      id: cat.id,
      name: cat.name
    })));

  } catch (err: any) {
    console.error("Error fetching categories:", err);
    return res.status(500).json({ 
      message: "Failed to fetch categories", 
      error: err.message || String(err) 
    });
  }
});

// Get tier limits for the current user
router.get("/tier-limits", async (req: Request, res: Response) => {
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
      .limit(1);

    const plan = subscriptionRecords[0]?.plan || "basic";

    // Tier limits as specified in struction.md
    const tierLimits = {
      basic: {
        max_questions_per_exam: 20,
        monthly_exam_limit: 10,
        questions_per_day: 100,
        quick_test_questions: 10,
        exam_bodies: ["WAEC", "NECO"]
      },
      standard: {
        max_questions_per_exam: 50,
        monthly_exam_limit: 50,
        questions_per_day: 500,
        quick_test_questions: 20,
        exam_bodies: ["WAEC", "NECO", "JAMB", "POST-UTME"]
      },
      premium: {
        max_questions_per_exam: 100,
        monthly_exam_limit: null, // unlimited
        questions_per_day: null, // unlimited
        quick_test_questions: 30,
        exam_bodies: "all"
      }
    };

    const limits = tierLimits[plan as keyof typeof tierLimits] || tierLimits.basic;

    return res.json({
      plan,
      limits,
      question_options: plan === "basic" 
        ? [10, 15, 20] 
        : plan === "standard" 
          ? [10, 25, 50] 
          : [10, 25, 50, 75, 100]
    });

  } catch (err: any) {
    console.error("Error fetching tier limits:", err);
    return res.status(500).json({ 
      message: "Failed to fetch tier limits", 
      error: err.message || String(err) 
    });
  }
});

export default router;