# Paystack Payment Integration Guide

The PrepMaster system comes fully pre-configured with Paystack integration for subscription payments. The code for handling transactions, verification, and webhooks is already implemented.

To "connect" the system and start accepting payments, you simply need to configure your Paystack API keys.

## Step 1: Get Paystack API Keys
1.  Log in to your [Paystack Dashboard](https://dashboard.paystack.com/).
2.  Go to **Settings** > **API Keys & Webhooks**.
3.  Copy your **Secret Key** and **Public Key**.
    *   For testing, use the **Test Keys** (start with `sk_test_...`).
    *   For production, use the **Live Keys** (start with `sk_live_...`).

## Step 2: Configure Environment Variables
1.  Open your [.env](file:///Users/frankitchy/Documents/SCRUBA%20SERVICES/CODING/CBT-BIG%20MACHINE/PrepMaster-by-BIG-MACHINE-ENT/.env) file (or create one using [.env.example](file:///Users/frankitchy/Documents/SCRUBA%20SERVICES/CODING/CBT-BIG%20MACHINE/PrepMaster-by-BIG-MACHINE-ENT/.env.example) as a template).
2.  Add or update the following variables:

```env
# Paystack Configuration
PAYSTACK_SECRET_KEY=your_secret_key_here
PAYSTACK_PUBLIC_KEY=your_public_key_here # (If used on frontend, currently not required)
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_here
PAYSTACK_BASE_URL=https://api.paystack.co
```

*   **PAYSTACK_SECRET_KEY**: This is the critical key for the backend to talk to Paystack.
*   **PAYSTACK_WEBHOOK_SECRET**: This (optional but recommended) secret is used to verify that webhook events are actually from Paystack. You specifically set this in your Paystack Dashboard (see Step 3).

## Step 3: Setup Webhooks (Recommended)
Webhooks allow Paystack to notify your system when a payment is successful, ensuring subscriptions are activated even if the user closes their browser before being redirected back to the site.

1.  In Paystack Dashboard > **Settings** > **API Keys & Webhooks**.
2.  Locate the **Webhook URL** field.
3.  Enter your live domain webhook URL:
    *   Format: `https://your-domain.com/api/payments/webhook`
    *   *Note: Webhooks do not work on `localhost` unless you use a tunneling service like ngrok.*
4.  Copy the **Webhook Secret** from the Paystack dashboard and paste it into your [.env](file:///Users/frankitchy/Documents/SCRUBA%20SERVICES/CODING/CBT-BIG%20MACHINE/PrepMaster-by-BIG-MACHINE-ENT/.env) file as `PAYSTACK_WEBHOOK_SECRET`. The system will reject any webhook events that are not signed with this secret.

## Architecture Overview
The integration is built with the following components:

1.  **Backend Routes** ([server/routes/payments.ts](file:///Users/frankitchy/Documents/SCRUBA%20SERVICES/CODING/CBT-BIG%20MACHINE/PrepMaster-by-BIG-MACHINE-ENT/server/routes/payments.ts)):
    *   `POST /api/payments/initialize`: Creates a transaction and returns a payment URL.
    *   `GET /api/payments/verify/:reference`: Verifies payment status and activates subscription.
    *   `POST /api/payments/webhook`: Asynchronous handler for payment events.
2.  **Frontend Components**:
    *   [Pricing.tsx](file:///Users/frankitchy/Documents/SCRUBA%20SERVICES/CODING/CBT-BIG%20MACHINE/PrepMaster-by-BIG-MACHINE-ENT/client/src/pages/Pricing.tsx): Initiates the payment flow.
    *   [PaymentCallback.tsx](file:///Users/frankitchy/Documents/SCRUBA%20SERVICES/CODING/CBT-BIG%20MACHINE/PrepMaster-by-BIG-MACHINE-ENT/client/src/pages/PaymentCallback.tsx): Handles the redirect from Paystack and calls the verify endpoint.
3.  **Database**:
    *   `payments` table: Tracks transaction history.
    *   `subscriptions` table: Manages active plans.
    *   `users` table: Updates `subscriptionStatus` and `expiresAt`.

## Testing
1.  Set `PAYSTACK_SECRET_KEY` to your **Test Secret Key**.
2.  Run the app locally (`npm run dev`).
3.  Go to the Pricing page and select a plan.
4.  Complete the payment using Paystack's test cards.
5.  You should be redirected to the dashboard with an updated Premium status.
