-- Migration 0004: Complete Account Persistence, Fractional Macros, Water, Reminders & Favorites
-- Strictly additive and non-destructive.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_subject" text;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_google_subject" ON "users" ("google_subject") WHERE "google_subject" IS NOT NULL;

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "target_weight" double precision;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_profiles_user_unique" ON "profiles" ("user_id");

-- Allow fractional gram precision for half/custom portions without rounding drift
ALTER TABLE "logged_meals" ALTER COLUMN "protein_grams" TYPE double precision USING "protein_grams"::double precision;
ALTER TABLE "logged_meals" ALTER COLUMN "carbs_grams" TYPE double precision USING "carbs_grams"::double precision;
ALTER TABLE "logged_meals" ALTER COLUMN "fat_grams" TYPE double precision USING "fat_grams"::double precision;
ALTER TABLE "logged_meals" ALTER COLUMN "fiber_grams" TYPE double precision USING "fiber_grams"::double precision;
ALTER TABLE "logged_meals" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;

ALTER TABLE "activity_stats" ADD COLUMN IF NOT EXISTS "sensor_steps" integer DEFAULT 0 NOT NULL;
ALTER TABLE "activity_stats" ADD COLUMN IF NOT EXISTS "manual_steps" integer DEFAULT 0 NOT NULL;
ALTER TABLE "activity_stats" ADD COLUMN IF NOT EXISTS "water_glasses" integer DEFAULT 0 NOT NULL;
ALTER TABLE "activity_stats" ADD COLUMN IF NOT EXISTS "water_goal" integer DEFAULT 8 NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_activity_stats_user_date_unique" ON "activity_stats" ("user_id", "date");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_subscriptions_user_unique" ON "subscriptions" ("user_id");

CREATE TABLE IF NOT EXISTS "reminder_settings" (
  "user_id" text PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "settings" jsonb NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_favorites" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "item_id" text NOT NULL,
  "title" text NOT NULL,
  "category" text NOT NULL,
  "calories" integer NOT NULL,
  "protein_grams" double precision DEFAULT 0 NOT NULL,
  "carbs_grams" double precision DEFAULT 0 NOT NULL,
  "fat_grams" double precision DEFAULT 0 NOT NULL,
  "fiber_grams" double precision DEFAULT 0 NOT NULL,
  "estimated_cost_idr" integer DEFAULT 0,
  "image_url" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_favorites_user_item" ON "user_favorites" ("user_id", "item_id");
CREATE INDEX IF NOT EXISTS "idx_user_favorites_user_id" ON "user_favorites" ("user_id");
