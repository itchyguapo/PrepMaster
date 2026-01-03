-- Migration: Add payment_type and is_lifetime columns to subscriptions and payments tables
-- Date: 2025-12-21

-- Add payment_type and is_lifetime to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'subscription' CHECK (payment_type IN ('subscription', 'lifetime')),
ADD COLUMN IF NOT EXISTS is_lifetime BOOLEAN DEFAULT false;

-- Add payment_type to payments table (already has billing_period which can be 'lifetime')
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'subscription' CHECK (payment_type IN ('subscription', 'lifetime'));

-- Update existing subscriptions: if expires_at is null or very far in future, mark as lifetime
-- (This is a safety check - you may want to review this logic)
UPDATE subscriptions 
SET is_lifetime = true, payment_type = 'lifetime' 
WHERE expires_at IS NULL OR expires_at > '2099-12-31'::timestamp;

-- Create index on payment_type for faster queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_type ON subscriptions(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);

