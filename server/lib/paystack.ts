import axios from "axios";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || "https://api.paystack.co";

export interface InitializeTransactionParams {
  email: string;
  amount: number; // in kobo
  plan?: string; // subscription plan code (for recurring)
  callback_url: string;
  metadata?: Record<string, any>;
}

export interface InitializeTransactionResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export async function initializeTransaction(
  params: InitializeTransactionParams
): Promise<InitializeTransactionResponse> {
  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      params,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Paystack initialize transaction error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to initialize transaction");
  }
}

export interface VerifyTransactionResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    customer: {
      email: string;
    };
    metadata?: Record<string, any>;
    authorization?: {
      authorization_code: string;
      customer_code: string;
    };
  };
}

export async function verifyTransaction(
  reference: string
): Promise<VerifyTransactionResponse> {
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Paystack verify transaction error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to verify transaction");
  }
}

// For recurring subscriptions (optional - can be added later)
export interface CreateSubscriptionParams {
  customer: string; // customer code
  plan: string; // plan code
  authorization: string; // authorization code
}

export async function createSubscription(
  params: CreateSubscriptionParams
): Promise<any> {
  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/subscription`,
      params,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Paystack create subscription error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to create subscription");
  }
}

