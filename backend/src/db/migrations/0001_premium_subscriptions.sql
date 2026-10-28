-- Migration: 0001_premium_subscriptions
-- Description: Adds subscriptions, idempotent payment_events, and is_premium flag to recipes

-- 1. Add is_premium flag to recipes table
ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "is_premium" boolean DEFAULT false NOT NULL;

-- 2. Create subscriptions table
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "tier" text DEFAULT 'free' NOT NULL,
  "status" text DEFAULT 'free' NOT NULL,
  "plan_id" text,
  "billing_provider" text DEFAULT 'mock_sandbox' NOT NULL,
  "external_subscription_id" text,
  "external_customer_id" text,
  "current_period_start" timestamp,
  "current_period_end" timestamp,
  "cancel_at_period_end" boolean DEFAULT false NOT NULL,
  "canceled_at" timestamp,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Index for quick lookup of a user's subscription
CREATE INDEX IF NOT EXISTS "idx_subscriptions_user_id" ON "subscriptions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_status" ON "subscriptions" ("status");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_external_id" ON "subscriptions" ("external_subscription_id");

-- 3. Create payment_events table for idempotent webhook handling & audit trail
CREATE TABLE IF NOT EXISTS "payment_events" (
  "id" text PRIMARY KEY NOT NULL,
  "event_id" text NOT NULL UNIQUE,
  "provider" text NOT NULL,
  "event_type" text NOT NULL,
  "user_id" text REFERENCES "users"("id") ON DELETE SET NULL,
  "subscription_id" text,
  "payload" jsonb NOT NULL,
  "processed_at" timestamp DEFAULT now() NOT NULL
);

-- Index on event_id for fast idempotency checks
CREATE INDEX IF NOT EXISTS "idx_payment_events_event_id" ON "payment_events" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_payment_events_user_id" ON "payment_events" ("user_id");
