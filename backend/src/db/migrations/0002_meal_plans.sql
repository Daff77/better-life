-- Migration 0002: Personalized Meal Plans & Recipe Dietary Attributes

ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "dietary_tags" jsonb;
ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "allergens" jsonb;

CREATE TABLE IF NOT EXISTS "meal_plans" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "preferences" jsonb NOT NULL,
  "days" jsonb NOT NULL,
  "summary" jsonb NOT NULL,
  "shopping_list" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_meal_plans_user_id" ON "meal_plans"("user_id");
CREATE INDEX IF NOT EXISTS "idx_meal_plans_status" ON "meal_plans"("status");
