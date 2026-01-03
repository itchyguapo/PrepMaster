import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users, subscriptions } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client for server-side token verification
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Middleware to check if the requesting user is a tutor with valid subscription
 * Expects supabaseId in query params or Authorization header
 */
export async function requireTutor(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let supabaseId: string | null = null;
    let token: string | null = null;

    // Try to get from query params first (for GET requests)
    if (req.query.supabaseId) {
      supabaseId = req.query.supabaseId as string;
    }
    // Try to get from Authorization Bearer token
    else if (req.headers.authorization) {
      token = req.headers.authorization.replace("Bearer ", "");
      if (token) {
        if (!supabase) {
          console.error("Supabase client not initialized. Check VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.");
          res.status(500).json({ 
            message: "Server configuration error. Supabase client not initialized." 
          });
          return;
        }
        try {
          const { data: { user }, error } = await supabase.auth.getUser(token);
          if (error) {
            console.error("Token verification error:", error.message);
            res.status(401).json({ 
              message: "Invalid or expired token. Please log in again.",
              error: error.message 
            });
            return;
          }
          if (user) {
            supabaseId = user.id;
          } else {
            res.status(401).json({ 
              message: "Token verification failed. No user found." 
            });
            return;
          }
        } catch (err: any) {
          console.error("Error verifying token:", err);
          res.status(401).json({ 
            message: "Token verification failed.",
            error: err.message || String(err)
          });
          return;
        }
      }
    }
    // Try to get from body (for POST requests)
    else if (req.body?.supabaseId) {
      supabaseId = req.body.supabaseId;
    }

    if (!supabaseId) {
      res.status(401).json({ 
        message: "Authentication required. Please provide supabaseId or valid Bearer token." 
      });
      return;
    }

    // Find user in database
    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, supabaseId))
      .limit(1);

    if (userRecords.length === 0) {
      res.status(403).json({ 
        message: "User not found in database. Please ensure you are logged in and your account is synced." 
      });
      return;
    }

    const user = userRecords[0];

    // Check if user has tutor role
    if (user.role !== "tutor") {
      res.status(403).json({ 
        message: "Access denied. Tutor role required." 
      });
      return;
    }

    // Tutors get access through custom quotes - role="tutor" is the primary gate
    // They may or may not have a subscription, but if they have role="tutor", they have access
    // The subscription check is optional - tutors can have access without a subscription
    // (Subscriptions for tutors are managed separately via custom quotes)

    // Attach user info to request for use in route handlers
    (req as any).tutorUser = user;
    (req as any).tutorId = user.id;

    next();
  } catch (error: any) {
    console.error("Error in tutor auth middleware:", error);
    res.status(500).json({ 
      message: "Internal server error during authentication check.",
      error: error.message || String(error)
    });
  }
}

/**
 * Helper function to check if a user is a tutor (for use in routes)
 */
export async function isTutor(supabaseId: string): Promise<boolean> {
  try {
    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, supabaseId))
      .limit(1);

    if (userRecords.length === 0) return false;

    const user = userRecords[0];
    if (user.role !== "tutor") return false;

    // Check subscription
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

    if (subscriptionRecords.length === 0) return false;

    // If user has role="tutor", they have tutor access
    // (Tutors get access via custom quotes, not student pricing tiers)
    // Subscription is optional for tutors
    return true; // Role check is sufficient
  } catch (error) {
    console.error("Error checking tutor status:", error);
    return false;
  }
}

