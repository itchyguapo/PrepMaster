/**
 * Admin Authentication Middleware
 * 
 * This middleware uses the AdminAuthService for consistent admin checking.
 * It provides a clean, reliable way to protect admin routes.
 */

import type { Request, Response, NextFunction } from "express";
import { getAdminUserFromRequest, checkAdminStatus, extractSupabaseId, extractBearerToken, verifySupabaseToken } from "../services/adminAuthService";

/**
 * Middleware to require admin access
 * 
 * Usage:
 *   router.get("/admin/route", requireAdmin, handler);
 *   router.use(requireAdmin); // Apply to all routes
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract Bearer token first (preferred method)
    const bearerToken = extractBearerToken(req);
    
    // Extract supabaseId from request (could be in query/body)
    let supabaseId = req.query?.supabaseId as string || req.body?.supabaseId as string || null;
    
    // If we have a Bearer token, verify it to get supabaseId
    if (bearerToken) {
      if (bearerToken.length > 50) {
        // Looks like a JWT token, verify it
        const verifiedId = await verifySupabaseToken(bearerToken);
        if (verifiedId) {
          supabaseId = verifiedId;
        } else {
          res.status(401).json({ 
            message: "Invalid or expired token. Please log in again.",
            code: "INVALID_TOKEN"
          });
          return;
        }
      } else {
        // Short token, might be supabaseId directly
        if (!supabaseId) {
          supabaseId = bearerToken;
        }
      }
    }
    
    if (!supabaseId) {
      res.status(401).json({ 
        message: "Authentication required. Please provide supabaseId or valid Bearer token.",
        code: "AUTH_REQUIRED"
      });
      return;
    }
    
    // Check admin status (uses caching, pass token for user syncing)
    // Force refresh on first check to ensure sync happens
    const { isAdmin, user, email } = await checkAdminStatus(supabaseId, undefined, bearerToken || undefined, false);
    
    // If user not found but we have a token, try one more time with force refresh
    if (!user && bearerToken) {
      console.log(`[ADMIN MIDDLEWARE] User not found, retrying with force refresh...`);
      const retry = await checkAdminStatus(supabaseId, undefined, bearerToken, true);
      if (retry.user) {
        // Use retry result
        const finalCheck = await checkAdminStatus(supabaseId, retry.user, bearerToken, false);
        if (finalCheck.isAdmin && finalCheck.user && finalCheck.email) {
          (req as any).adminUser = finalCheck.user;
          (req as any).adminEmail = finalCheck.email;
          (req as any).supabaseId = supabaseId;
          if (process.env.NODE_ENV === "development") {
            console.log(`[ADMIN MIDDLEWARE] ✅ Admin access granted after retry: ${finalCheck.email}`);
          }
          return next();
        }
      }
    }
    
    if (!isAdmin || !user || !email) {
      // Provide helpful error message with detailed debug info
      const debugInfo = process.env.NODE_ENV === "development" ? {
        supabaseId: supabaseId.slice(0, 8) + "...",
        userEmail: email || "no email",
        userRole: user?.role || "no user",
        userExists: !!user,
        adminEmailsEnv: process.env.ADMIN_EMAILS || "NOT SET",
        parsedAdminEmails: process.env.ADMIN_EMAILS?.split(",").map(e => e.trim().toLowerCase()) || []
      } : undefined;
      
      // Log the denial for debugging
      console.warn(`[ADMIN MIDDLEWARE] ❌ Access denied for: ${email || "no email"} (${supabaseId.slice(0, 8)}...)`);
      if (user) {
        console.warn(`[ADMIN MIDDLEWARE]   User role: ${user.role}, Email in whitelist: ${email ? (await import("../utils/adminEmails")).isAdminEmail(email) : false}`);
      } else {
        console.warn(`[ADMIN MIDDLEWARE]   User not found in database`);
      }
      
      // Always return JSON, even if debugInfo is undefined
      const response: any = { 
        message: "Access denied. Admin privileges required.",
        code: "ADMIN_REQUIRED"
      };
      
      if (debugInfo) {
        response.debug = debugInfo;
      }
      
      // Add helpful message based on the issue
      if (!user) {
        response.help = "User not found in database. Try calling /api/auth/sync-user to sync your account.";
      } else if (!email) {
        response.help = "User has no email. Email is required for admin access.";
      } else if (user.role !== "admin") {
        const { isAdminEmail } = await import("../utils/adminEmails");
        const inWhitelist = isAdminEmail(email);
        if (!inWhitelist) {
          response.help = `Your email "${email}" is not in the ADMIN_EMAILS whitelist. Add it to your .env file: ADMIN_EMAILS=${email}`;
        } else {
          response.help = "Your email is in the whitelist but role wasn't updated. This should auto-fix on next request.";
        }
      }
      
      res.status(403).json(response);
      return;
    }
    
    // Attach admin info to request for use in route handlers
    (req as any).adminUser = user;
    (req as any).adminEmail = email;
    (req as any).supabaseId = supabaseId;
    
    // Log successful admin access (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log(`[ADMIN MIDDLEWARE] ✅ Admin access granted: ${email} (${supabaseId.slice(0, 8)}...)`);
    }
    
    next();
  } catch (error: any) {
    console.error("[ADMIN MIDDLEWARE] Error:", error);
    res.status(500).json({ 
      message: "Internal server error during authentication check.",
      code: "AUTH_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
}

/**
 * Optional admin check - doesn't fail if not admin, just attaches info
 * Useful for routes that show different content for admins
 */
export async function optionalAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const supabaseId = extractSupabaseId(req);
    if (supabaseId) {
      const token = req.headers?.authorization?.replace(/^Bearer\s+/i, "") || undefined;
      const { isAdmin, user, email } = await checkAdminStatus(supabaseId, undefined, token, false);
      if (isAdmin && user && email) {
        (req as any).adminUser = user;
        (req as any).adminEmail = email;
        (req as any).isAdmin = true;
      }
    }
    next();
  } catch (error) {
    // Don't fail on optional check
    next();
  }
}

/**
 * Re-export service functions for use in routes
 */
export { checkAdminStatus, getAdminUserFromRequest } from "../services/adminAuthService";
