import { Router, type Request, type Response } from "express";
import { db } from "../db";
import { users, subscriptions, payments } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { initializeTransaction, verifyTransaction } from "../lib/paystack";
import { paymentLimiter } from "../middleware/rateLimiter";
import crypto from "crypto";

const router = Router();

// Initialize payment transaction
router.post("/initialize", paymentLimiter, async (req: Request, res: Response) => {
  try {
    const { userId, plan, billingPeriod } = req.body;

    if (!userId || !plan || !billingPeriod) {
      return res.status(400).json({ message: "Missing required fields: userId, plan, billingPeriod" });
    }

    // Validate plan
    if (!["basic", "standard", "premium"].includes(plan)) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    // Validate billing period (only monthly and annual supported)
    if (!["monthly", "annual"].includes(billingPeriod)) {
      return res.status(400).json({ message: "Invalid billing period. Only monthly and annual are supported." });
    }

    // Get user by supabaseId (userId from frontend is Supabase user ID)
    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.supabaseId, userId))
      .limit(1);

    if (userRecords.length === 0) {
      return res.status(404).json({ message: "User not found. Please ensure you're logged in." });
    }

    const user = userRecords[0];
    if (!user.email) {
      return res.status(400).json({ message: "User email is required" });
    }

    // Calculate amount (in NGN)
    // Pricing: basic=2000, standard=3500, premium=5000 (monthly)
    // Annual = 10 months price (2 months free)
    const planPricing: Record<string, { monthly: number; annual: number }> = {
      basic: { monthly: 2000, annual: 20000 },
      standard: { monthly: 3500, annual: 35000 },
      premium: { monthly: 5000, annual: 50000 },
    };

    let amount = 0;
    if (billingPeriod === "annual") {
      amount = planPricing[plan]?.annual || 0;
    } else {
      amount = planPricing[plan]?.monthly || 0;
    }

    if (amount === 0) {
      return res.status(400).json({ message: "Invalid plan" });
    }

    const amountInKobo = amount * 100; // Convert NGN to kobo

    // Initialize Paystack transaction
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
    const callbackUrl = `${frontendUrl}/payment/callback`;

    console.log(`[PAYMENT] Initializing for user ${user.email}`);
    console.log(`[PAYMENT] Callback URL: ${callbackUrl}`);

    const paystackResponse = await initializeTransaction({
      email: user.email,
      amount: amountInKobo,
      callback_url: callbackUrl,
      metadata: {
        userId,
        plan,
        billingPeriod,
        custom_fields: [
          {
            display_name: "Plan",
            variable_name: "plan",
            value: plan,
          },
          {
            display_name: "Billing Period",
            variable_name: "billing_period",
            value: billingPeriod,
          },
        ],
      },
    });

    if (!paystackResponse.status) {
      return res.status(500).json({
        message: "Failed to initialize payment",
        error: paystackResponse.message
      });
    }

    // Create payment record (use database user ID, not Supabase ID)
    await db.insert(payments).values({
      userId: user.id, // Use database user ID
      plan,
      billingPeriod,
      paymentType: "subscription",
      paystackReference: paystackResponse.data.reference,
      amount: amountInKobo,
      status: "pending",
      metadata: paystackResponse.data,
    });

    return res.json({
      authorization_url: paystackResponse.data.authorization_url,
      reference: paystackResponse.data.reference,
    });
  } catch (err: any) {
    console.error("Error initializing payment:", err);
    return res.status(500).json({
      message: "Failed to initialize payment",
      error: err.message || String(err)
    });
  }
});

// Verify payment (called after redirect from Paystack)
router.get("/verify/:reference", async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({ message: "Payment reference is required" });
    }

    // Verify with Paystack
    const verification = await verifyTransaction(reference);

    if (!verification.status || verification.data.status !== "success") {
      // Update payment status to failed
      await db
        .update(payments)
        .set({
          status: "failed",
          updatedAt: new Date(),
        })
        .where(eq(payments.paystackReference, reference));

      return res.status(400).json({
        message: "Payment verification failed",
        data: verification.data
      });
    }

    // Find payment record
    const paymentRecords = await db
      .select()
      .from(payments)
      .where(eq(payments.paystackReference, reference))
      .limit(1);

    if (paymentRecords.length === 0) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    const payment = paymentRecords[0];

    // Check if already processed
    if (payment.status === "success") {
      return res.json({
        success: true,
        message: "Payment already processed",
        subscription: {
          plan: payment.plan,
        },
      });
    }

    // Update payment status
    await db
      .update(payments)
      .set({
        status: "success",
        paystackTransactionId: verification.data.reference,
        metadata: verification.data,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    // Calculate expiry date (lifetime has no expiration)
    const now = new Date();
    let expiresAt: Date | null = null;
    if (payment.billingPeriod === "lifetime" || payment.paymentType === "lifetime") {
      expiresAt = null; // Lifetime never expires
    } else if (payment.billingPeriod === "annual") {
      expiresAt = new Date(now);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // Get or create subscription
    const existingSubs = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, payment.userId),
          eq(subscriptions.status, "active")
        )
      )
      .limit(1);

    let subscriptionId: string;

    if (existingSubs.length > 0) {
      // Update existing subscription
      const [updatedSub] = await db
        .update(subscriptions)
        .set({
          plan: payment.plan,
          status: "active",
          startsAt: new Date(),
          expiresAt,
          paymentType: payment.paymentType || "subscription",
          isLifetime: payment.paymentType === "lifetime" || payment.billingPeriod === "lifetime",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, existingSubs[0].id))
        .returning();
      subscriptionId = updatedSub.id;
    } else {
      // Create new subscription
      const [newSub] = await db.insert(subscriptions).values({
        userId: payment.userId,
        plan: payment.plan,
        status: "active",
        startsAt: new Date(),
        expiresAt,
        paymentType: payment.paymentType || "subscription",
        isLifetime: payment.paymentType === "lifetime" || payment.billingPeriod === "lifetime",
      }).returning();
      subscriptionId = newSub.id;
    }

    // Update user subscription status
    await db
      .update(users)
      .set({
        subscriptionStatus: payment.plan as any,
        subscriptionExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, payment.userId));

    // Update payment with subscription ID
    await db
      .update(payments)
      .set({ subscriptionId })
      .where(eq(payments.id, payment.id));

    return res.json({
      success: true,
      message: "Payment verified and subscription activated",
      subscription: {
        plan: payment.plan,
        expiresAt: expiresAt?.toISOString() || null,
      },
    });
  } catch (err: any) {
    console.error("Error verifying payment:", err);
    return res.status(500).json({
      message: "Failed to verify payment",
      error: err.message || String(err)
    });
  }
});

// Webhook handler (for Paystack events)
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    // Validate webhook secret is configured
    const webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("PAYSTACK_WEBHOOK_SECRET is not configured");
      return res.status(500).json({
        message: "Webhook secret not configured. Please set PAYSTACK_WEBHOOK_SECRET environment variable."
      });
    }

    // Verify webhook signature
    // Use rawBody for more reliable signature verification (captured in server/index.ts)
    const rawBody = (req as any).rawBody;
    const bodyToHash = rawBody ? rawBody : JSON.stringify(req.body);

    const hash = crypto
      .createHmac("sha512", webhookSecret)
      .update(bodyToHash)
      .digest("hex");

    const signature = req.headers["x-paystack-signature"] as string;

    if (!signature) {
      console.error("Missing Paystack signature header");
      return res.status(400).json({ message: "Missing signature header" });
    }

    if (hash !== signature) {
      console.error("Invalid webhook signature");
      return res.status(400).json({ message: "Invalid signature" });
    }

    const event = req.body;

    console.log(`[PAYSTACK WEBHOOK] Event: ${event.event}`);

    // Handle different event types
    switch (event.event) {
      case "charge.success":
        await handlePaymentSuccess(event.data);
        break;
      case "subscription.create":
        await handleSubscriptionCreate(event.data);
        break;
      case "subscription.disable":
        await handleSubscriptionDisable(event.data);
        break;
      default:
        console.log(`[PAYSTACK WEBHOOK] Unhandled event: ${event.event}`);
    }

    return res.json({ received: true });
  } catch (err: any) {
    console.error("Error processing webhook:", err);
    return res.status(500).json({
      message: "Webhook processing failed",
      error: err.message || String(err)
    });
  }
});

// Helper functions for webhook handlers
async function handlePaymentSuccess(data: any) {
  try {
    const reference = data.reference;
    if (!reference) return;

    // Find payment record
    const paymentRecords = await db
      .select()
      .from(payments)
      .where(eq(payments.paystackReference, reference))
      .limit(1);

    if (paymentRecords.length === 0) {
      console.error(`[WEBHOOK] Payment record not found for reference: ${reference}`);
      return;
    }

    const payment = paymentRecords[0];

    // If already processed, skip
    if (payment.status === "success") {
      return;
    }

    // Update payment status
    await db
      .update(payments)
      .set({
        status: "success",
        paystackTransactionId: data.id?.toString() || reference,
        metadata: data,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    // Calculate expiry date (lifetime has no expiration)
    const now = new Date();
    let expiresAt: Date | null = null;
    if (payment.billingPeriod === "lifetime" || payment.paymentType === "lifetime") {
      expiresAt = null; // Lifetime never expires
    } else if (payment.billingPeriod === "annual") {
      expiresAt = new Date(now);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // Update or create subscription
    const existingSubs = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, payment.userId),
          eq(subscriptions.status, "active")
        )
      )
      .limit(1);

    let subscriptionId: string;

    if (existingSubs.length > 0) {
      const [updatedSub] = await db
        .update(subscriptions)
        .set({
          plan: payment.plan,
          status: "active",
          startsAt: new Date(),
          expiresAt,
          paymentType: payment.paymentType || "subscription",
          isLifetime: payment.paymentType === "lifetime" || payment.billingPeriod === "lifetime",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, existingSubs[0].id))
        .returning();
      subscriptionId = updatedSub.id;
    } else {
      const [newSub] = await db.insert(subscriptions).values({
        userId: payment.userId,
        plan: payment.plan,
        status: "active",
        startsAt: new Date(),
        expiresAt,
        paymentType: payment.paymentType || "subscription",
        isLifetime: payment.paymentType === "lifetime" || payment.billingPeriod === "lifetime",
      }).returning();
      subscriptionId = newSub.id;
    }

    // Update user subscription status
    const subscriptionStatus = (payment.plan === "standard" || payment.plan === "premium") ? "premium" : "basic";
    await db
      .update(users)
      .set({
        subscriptionStatus,
        subscriptionExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, payment.userId));

    // Update payment with subscription ID
    await db
      .update(payments)
      .set({ subscriptionId })
      .where(eq(payments.id, payment.id));

    console.log(`[WEBHOOK] Payment ${reference} processed successfully`);
  } catch (err: any) {
    console.error("[WEBHOOK] Error handling payment success:", err);
  }
}

async function handleSubscriptionCreate(data: any) {
  // Handle recurring subscription creation
  // This can be implemented later for auto-renewal
  console.log("[WEBHOOK] Subscription created:", data);
}

async function handleSubscriptionDisable(data: any) {
  try {
    // Find subscription by Paystack subscription code
    const subscriptionRecords = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.paystackSubscriptionCode, data.subscription_code || ""))
      .limit(1);

    if (subscriptionRecords.length > 0) {
      await db
        .update(subscriptions)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(subscriptions.id, subscriptionRecords[0].id));

      console.log(`[WEBHOOK] Subscription ${data.subscription_code} cancelled`);
    }
  } catch (err: any) {
    console.error("[WEBHOOK] Error handling subscription disable:", err);
  }
}

export default router;

