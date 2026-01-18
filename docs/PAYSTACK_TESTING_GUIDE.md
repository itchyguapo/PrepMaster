# Guide: Testing Paystack in Test Mode

This guide provides step-by-step instructions to verify your payment integration using Paystack's sandbox environment.

## Step 1: Configure Your Environment
Ensure your [.env](file:///Users/frankitchy/Documents/SCRUBA%20SERVICES/CODING/CBT-BIG%20MACHINE/PrepMaster-by-BIG-MACHINE-ENT/.env) file is using your **Test Secret Key**.

```env
# Use keys starting with sk_test_
PAYSTACK_SECRET_KEY=sk_test_your_test_key_here
FRONTEND_URL=http://localhost:5173
```

> [!NOTE]
> When using test keys, Paystack automatically uses the sandbox environment. No real money will be charged.

## Step 2: Set Up Webhooks (Optional for Local Testing)
Webhooks require a public URL. For local testing, you can use a tool like **ngrok**:
1. Run `ngrok http 5000`.
2. Copy the `https` URL provided by ngrok.
3. Add it to your Paystack Dashboard > Settings > API Keys & Webhooks:
   `https://<ngrok-id>.ngrok-free.app/api/payments/webhook`

## Step 3: Initiate a Payment
1. Start your application: `npm run dev`.
2. Log in to PrepMaster.
3. Navigate to the **Pricing** page.
4. Click **Choose Plan** on any paid tier (Standard or Premium).
5. You will be redirected to the Paystack Checkout page.

## Step 4: Use Test Card Details
Use the following details on the Paystack checkout page to simulate different outcomes:

### ✅ Successful Transaction (No Validation)
| Field | Value |
| :--- | :--- |
| **Card Number** | `4084 0840 8408 4081` |
| **Expiry Date** | Any future date (e.g., `12/26`) |
| **CVV** | `408` |

### ✅ Successful Transaction (PIN Required)
- **Card Number**: `5078 5078 5078 5078 12`
- **PIN**: `1111`

### ❌ Declined Transaction
- **Card Number**: `4084 0800 0000 5408`
- **CVV**: `001`

### ⚠️ Insufficient Funds
- **Card Number**: `4084 0800 0067 0037`
- **CVV**: `787`

## Step 5: Verify the Result
After completing the payment on the Paystack page:
1. You should be redirected back to the **Payment Callback** page in PrepMaster.
2. The page should show "Payment Successful!".
3. After 3 seconds, you'll be moved to the Dashboard.
4. **Dashboard Check**: Your profile should now show "Premium" status.
5. **Database Check**: You can verify the payment record in the `payments` table and the active subscription in the `subscriptions` table.

## Troubleshooting
- **403 Forbidden**: Ensure your `ALLOWED_ORIGINS` in `.env` includes `http://localhost:5173`.
- **Reference Not Found**: This happens if the backend failed to save the initial payment record before the redirect. Check server logs.
- **Webhook Not firing**: Remember that webhooks won't work on `localhost` without a tunnel like ngrok.
