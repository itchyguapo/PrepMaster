/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse and DDoS attacks
 */

import rateLimit from "express-rate-limit";
import { Request } from "express";

/**
 * General API rate limiter
 * 1000 requests per 15 minutes per IP (generous for normal usage)
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Strict rate limiter for authentication endpoints
 * 20 requests per minute per IP
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 requests per minute
  message: {
    error: "Too many authentication attempts, please try again later.",
    retryAfter: "1 minute"
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Practice test generation rate limiting
 * 50 tests per 5 minutes per user/IP
 */
export const practiceTestLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit each IP to 50 practice tests per 5 minutes
  keyGenerator: (req: Request) => {
    // Use supabaseId if available, otherwise fall back to IP
    return req.body?.supabaseId || req.ip;
  },
  message: {
    error: "Too many practice tests generated, please try again later.",
    retryAfter: "5 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * User sync rate limiting
 * 60 requests per minute per user/IP
 */
export const userSyncLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 sync requests per minute
  keyGenerator: (req: Request) => {
    // Use supabaseId if available, otherwise fall back to IP
    return req.body?.supabaseId || req.ip;
  },
  message: {
    error: "Too many sync requests, please try again later.",
    retryAfter: "1 minute"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Moderate rate limiter for payment endpoints
 * 30 requests per 15 minutes per IP
 */
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  message: {
    error: "Too many payment requests, please try again later.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Admin endpoints rate limiting
 * 200 requests per 15 minutes per IP
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 admin requests per 15 minutes
  message: {
    error: "Too many admin requests, please try again later.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for exam generation
 * 100 exams per hour per user
 */
export const examGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each user to 100 exams per hour
  keyGenerator: (req: Request) => {
    // Use supabaseId if available, otherwise fall back to IP
    return req.body?.supabaseId || req.ip;
  },
  message: {
    error: "Too many exams generated, please try again later.",
    retryAfter: "1 hour"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

