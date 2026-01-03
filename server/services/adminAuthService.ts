/**
 * Admin Authentication Service
 * 
 * This service provides a single source of truth for admin authentication.
 * It handles:
 * - Admin status checking with caching
 * - User syncing from Supabase
 * - Role management
 * - Consistent admin verification
 */

import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail, normalizeEmail } from "../utils/adminEmails";

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Admin status cache (in-memory with TTL)
interface AdminStatusCache {
  [supabaseId: string]: {
    isAdmin: boolean;
    expiresAt: number;
    email: string | null;
  };
}

const adminCache: AdminStatusCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get supabaseId from request (checks multiple sources)
 * Returns the raw value (could be token or supabaseId)
 */
export function extractSupabaseId(req: any): string | null {
  // 1. Try Authorization Bearer token (preferred method)
  if (req.headers?.authorization) {
    const token = req.headers.authorization.replace(/^Bearer\s+/i, "");
    if (token && token.length > 0) {
      return token; // This will be verified later if it's a token
    }
  }
  
  // 2. Try query parameter
  if (req.query?.supabaseId) {
    return req.query.supabaseId as string;
  }
  
  // 3. Try body
  if (req.body?.supabaseId) {
    return req.body.supabaseId as string;
  }
  
  return null;
}

/**
 * Extract Bearer token from request (if present)
 */
export function extractBearerToken(req: any): string | null {
  if (req.headers?.authorization) {
    const token = req.headers.authorization.replace(/^Bearer\s+/i, "");
    if (token && token.length > 0) {
      return token;
    }
  }
  return null;
}

/**
 * Verify Supabase token and extract user ID
 */
export async function verifySupabaseToken(token: string): Promise<string | null> {
  if (!supabase) {
    console.error("[ADMIN AUTH] Supabase client not initialized");
    return null;
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user.id;
  } catch (error) {
    console.error("[ADMIN AUTH] Token verification error:", error);
    return null;
  }
}

/**
 * Sync user from Supabase to database
 */
async function syncUserFromSupabase(supabaseId: string, token?: string): Promise<any | null> {
  if (!supabase) {
    console.warn(`[ADMIN AUTH] Cannot sync: Supabase client not initialized`);
    return null;
  }
  
  try {
    // Get user info from Supabase
    let supabaseUser;
    if (token) {
      console.log(`[ADMIN AUTH] Attempting to sync user with token (length: ${token.length})`);
      const { data, error } = await supabase.auth.getUser(token);
      if (error) {
        console.error(`[ADMIN AUTH] Token verification error:`, error.message);
        return null;
      }
      if (!data.user) {
        console.warn(`[ADMIN AUTH] No user returned from token verification`);
        return null;
      }
      supabaseUser = data.user;
      console.log(`[ADMIN AUTH] ✅ Got user from token: ${supabaseUser.email || 'no email'} (${supabaseUser.id.slice(0, 8)}...)`);
    } else {
      // Try to get user by ID (requires service role key)
      console.log(`[ADMIN AUTH] Attempting to sync user by ID: ${supabaseId.slice(0, 8)}...`);
      const { data, error } = await supabase.auth.admin.getUserById(supabaseId);
      if (error) {
        console.error(`[ADMIN AUTH] getUserById error:`, error.message);
        return null;
      }
      if (!data.user) {
        console.warn(`[ADMIN AUTH] No user found with ID: ${supabaseId.slice(0, 8)}...`);
        return null;
      }
      supabaseUser = data.user;
      console.log(`[ADMIN AUTH] ✅ Got user by ID: ${supabaseUser.email || 'no email'}`);
    }
    
    if (!supabaseUser) {
      console.warn(`[ADMIN AUTH] supabaseUser is null after fetch attempt`);
      return null;
    }
    
    // Generate unique username
    let username = supabaseUser.email?.split("@")[0] || `user_${supabaseId.slice(0, 8)}`;
    let attempts = 0;
    
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
    
    // Check if admin before creating
    const userEmail = normalizeEmail(supabaseUser.email);
    const isAdmin = userEmail ? isAdminEmail(userEmail) : false;
    
    // Check if user already exists by email (in case supabaseId changed)
    if (supabaseUser.email) {
      const existingByEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, supabaseUser.email))
        .limit(1);
      
      if (existingByEmail.length > 0) {
        const existing = existingByEmail[0];
        // Update supabaseId if it's different
        if (existing.supabaseId !== supabaseUser.id) {
          console.log(`[ADMIN AUTH] Updating supabaseId for existing user: ${existing.email}`);
          await db
            .update(users)
            .set({ 
              supabaseId: supabaseUser.id,
              role: isAdmin ? "admin" : existing.role, // Update role if admin
              updatedAt: new Date()
            })
            .where(eq(users.id, existing.id));
          
          // Return updated user
          const updated = await db
            .select()
            .from(users)
            .where(eq(users.id, existing.id))
            .limit(1);
          
          if (updated.length > 0) {
            console.log(`[ADMIN AUTH] ✅ User updated: ${updated[0].id}${isAdmin ? " (admin)" : ""}`);
            return updated[0];
          }
        }
        // Role might need updating
        if (isAdmin && existing.role !== "admin") {
          await db
            .update(users)
            .set({ role: "admin", updatedAt: new Date() })
            .where(eq(users.id, existing.id));
          existing.role = "admin";
          console.log(`[ADMIN AUTH] ✅ Updated role to admin for: ${existing.email}`);
        }
        return existing;
      }
    }
    
    // Create new user
    try {
      console.log(`[ADMIN AUTH] Creating new user: ${supabaseUser.email || 'no email'}${isAdmin ? " (admin)" : ""}`);
      const [newUser] = await db.insert(users).values({
        supabaseId: supabaseUser.id,
        username,
        password: "",
        email: supabaseUser.email || null,
        phone: supabaseUser.phone || null,
        role: isAdmin ? "admin" : "student",
      }).returning();
      
      console.log(`[ADMIN AUTH] ✅ User created: ${newUser.id}${isAdmin ? " (admin)" : ""}`);
      return newUser;
    } catch (insertError: any) {
      // User might already exist (race condition or unique constraint)
      if (insertError.code === "23505" || insertError.message?.includes("unique")) {
        console.log(`[ADMIN AUTH] User already exists (race condition), fetching...`);
        // Try to fetch by supabaseId
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.supabaseId, supabaseUser.id))
          .limit(1);
        
        if (existing.length > 0) {
          return existing[0];
        }
        
        // Try by email as fallback
        if (supabaseUser.email) {
          const existingByEmail = await db
            .select()
            .from(users)
            .where(eq(users.email, supabaseUser.email))
            .limit(1);
          
          if (existingByEmail.length > 0) {
            return existingByEmail[0];
          }
        }
      }
      console.error(`[ADMIN AUTH] Insert error:`, insertError.message);
      throw insertError;
    }
  } catch (error: any) {
    console.error("[ADMIN AUTH] Error syncing user:", error.message || error);
    if (error.stack) {
      console.error("[ADMIN AUTH] Stack:", error.stack);
    }
    return null;
  }
}

/**
 * Get user from database (with auto-sync if needed)
 */
async function getUser(supabaseId: string, token?: string): Promise<any | null> {
  // Try database first by supabaseId
  const userRecords = await db
    .select()
    .from(users)
    .where(eq(users.supabaseId, supabaseId))
    .limit(1);
  
  if (userRecords.length > 0) {
    return userRecords[0];
  }
  
  // User not found by supabaseId - try to get email from token and find by email
  if (token && supabase) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user?.email) {
        const email = normalizeEmail(data.user.email);
        if (email) {
          const userByEmail = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
          
          if (userByEmail.length > 0) {
            const existing = userByEmail[0];
            // Update supabaseId if it's different
            if (existing.supabaseId !== supabaseId) {
              console.log(`[ADMIN AUTH] Found user by email, updating supabaseId: ${email}`);
              await db
                .update(users)
                .set({ supabaseId, updatedAt: new Date() })
                .where(eq(users.id, existing.id));
              existing.supabaseId = supabaseId;
            }
            return existing;
          }
        }
      }
    } catch (err) {
      console.warn(`[ADMIN AUTH] Error getting email from token:`, err);
    }
  }
  
  // User not found by supabaseId or email - try to sync from Supabase
  if (supabase) {
    console.log(`[ADMIN AUTH] User not found by supabaseId, attempting sync: ${supabaseId.slice(0, 8)}...`);
    const syncedUser = await syncUserFromSupabase(supabaseId, token);
    if (syncedUser) {
      console.log(`[ADMIN AUTH] ✅ User synced successfully: ${syncedUser.id}`);
      return syncedUser;
    } else {
      console.warn(`[ADMIN AUTH] ⚠️ User sync failed for: ${supabaseId.slice(0, 8)}...`);
    }
  } else {
    console.warn(`[ADMIN AUTH] ⚠️ Supabase client not initialized, cannot sync user`);
  }
  
  return null;
}

/**
 * Check if user is admin (with caching)
 * This is the SINGLE SOURCE OF TRUTH for admin status
 * 
 * @param supabaseId - User's Supabase ID
 * @param user - Optional user object (if already fetched)
 * @param token - Optional token for user syncing
 * @param forceRefresh - Force cache refresh
 */
export async function checkAdminStatus(
  supabaseId: string,
  user?: any,
  token?: string,
  forceRefresh: boolean = false
): Promise<{ isAdmin: boolean; user: any | null; email: string | null }> {
  // Check cache first (unless force refresh)
  if (!forceRefresh && adminCache[supabaseId]) {
    const cached = adminCache[supabaseId];
    if (Date.now() < cached.expiresAt) {
      return {
        isAdmin: cached.isAdmin,
        user: user || null,
        email: cached.email
      };
    }
    // Cache expired, remove it
    delete adminCache[supabaseId];
  }
  
  // Get user if not provided
  let userRecord = user;
  if (!userRecord) {
    userRecord = await getUser(supabaseId, token);
  }
  
  if (!userRecord) {
    // Cache negative result (shorter TTL)
    adminCache[supabaseId] = {
      isAdmin: false,
      expiresAt: Date.now() + (CACHE_TTL / 2),
      email: null
    };
    return { isAdmin: false, user: null, email: null };
  }
  
  // Get normalized email
  const userEmail = normalizeEmail(userRecord.email);
  
  if (!userEmail) {
    // No email - cannot be admin
    adminCache[supabaseId] = {
      isAdmin: false,
      expiresAt: Date.now() + CACHE_TTL,
      email: null
    };
    return { isAdmin: false, user: userRecord, email: null };
  }
  
  // Check admin status (whitelist OR role)
  const isInWhitelist = isAdminEmail(userEmail);
  const hasAdminRole = userRecord.role === "admin";
  const isAdmin = isInWhitelist || hasAdminRole;
  
  // Auto-update role if in whitelist but role not set
  if (isInWhitelist && !hasAdminRole) {
    try {
      await db
        .update(users)
        .set({ role: "admin", updatedAt: new Date() })
        .where(eq(users.id, userRecord.id));
      userRecord.role = "admin";
      console.log(`[ADMIN AUTH] Auto-updated role to admin for: ${userEmail}`);
    } catch (error) {
      console.error("[ADMIN AUTH] Error updating role:", error);
    }
  }
  
  // Cache result
  adminCache[supabaseId] = {
    isAdmin,
    expiresAt: Date.now() + CACHE_TTL,
    email: userEmail
  };
  
  return {
    isAdmin,
    user: userRecord,
    email: userEmail
  };
}

/**
 * Clear admin cache for a user (useful after role changes)
 */
export function clearAdminCache(supabaseId: string): void {
  delete adminCache[supabaseId];
}

/**
 * Clear all admin cache
 */
export function clearAllAdminCache(): void {
  Object.keys(adminCache).forEach(key => delete adminCache[key]);
}

/**
 * Get admin user from request (extracts supabaseId and verifies)
 */
export async function getAdminUserFromRequest(req: any): Promise<{
  user: any;
  email: string;
  supabaseId: string;
} | null> {
  // Extract supabaseId
  let supabaseId = extractSupabaseId(req);
  if (!supabaseId) {
    return null;
  }
  
  // If it looks like a token, verify it
  if (supabaseId.length > 50) {
    const verifiedId = await verifySupabaseToken(supabaseId);
    if (verifiedId) {
      supabaseId = verifiedId;
    }
  }
  
  // Get token for syncing if needed
  const token = req.headers?.authorization?.replace(/^Bearer\s+/i, "") || undefined;
  
  // Check admin status
  const { isAdmin, user, email } = await checkAdminStatus(supabaseId, undefined, token, false);
  
  if (!isAdmin || !user || !email) {
    return null;
  }
  
  return { user, email, supabaseId };
}

