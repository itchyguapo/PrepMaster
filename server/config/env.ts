/**
 * Environment Variable Validation and Configuration
 * Validates required environment variables on startup
 */

interface EnvConfig {
  // Required
  DATABASE_URL: string;
  
  // Optional but recommended
  NODE_ENV: string;
  PORT: string;
  ALLOWED_ORIGINS?: string;
  
  // Supabase (optional for some features)
  VITE_SUPABASE_URL?: string;
  SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  
  // Paystack (optional if not using payments)
  PAYSTACK_SECRET_KEY?: string;
  PAYSTACK_WEBHOOK_SECRET?: string;
  PAYSTACK_BASE_URL?: string;
  FRONTEND_URL?: string;
  
  // Admin
  ADMIN_EMAILS?: string;
}

/**
 * Validates required environment variables
 * Throws error if any required variables are missing
 */
export function validateEnv(): void {
  const required: (keyof EnvConfig)[] = ['DATABASE_URL'];
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env file or environment configuration.`
    );
  }
}

/**
 * Gets environment variable with validation
 * Throws error if variable is required but missing
 */
export function getEnv(key: keyof EnvConfig, required = false): string {
  const value = process.env[key];
  
  if (required && !value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  
  return value || '';
}

/**
 * Gets environment variable with default value
 */
export function getEnvWithDefault(key: keyof EnvConfig, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Validates Paystack configuration if payments are enabled
 */
export function validatePaystackConfig(): void {
  // Only validate if we're trying to use Paystack
  // Check if any Paystack routes might be called
  if (process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_WEBHOOK_SECRET) {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      console.warn('⚠️  PAYSTACK_SECRET_KEY is not set but Paystack is being used');
    }
    if (!process.env.PAYSTACK_WEBHOOK_SECRET) {
      console.warn('⚠️  PAYSTACK_WEBHOOK_SECRET is not set - webhook verification will fail');
    }
  }
}

/**
 * Gets allowed CORS origins from environment
 */
export function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  
  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim()).filter(Boolean);
  }
  
  // Default origins for development
  if (process.env.NODE_ENV === 'development') {
    return ['http://localhost:5000', 'http://localhost:5001', 'http://localhost:5173', 'http://127.0.0.1:5000', 'http://127.0.0.1:5001', 'http://127.0.0.1:5173'];
  }
  
  // Production: require explicit configuration
  return [];
}

