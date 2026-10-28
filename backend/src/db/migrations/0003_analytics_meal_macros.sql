-- Migration 0003: Advanced Nutrition Analytics & Meal Macros Persistence

ALTER TABLE "logged_meals" ADD COLUMN IF NOT EXISTS "protein_grams" integer DEFAULT 0 NOT NULL;
ALTER TABLE "logged_meals" ADD COLUMN IF NOT EXISTS "carbs_grams" integer DEFAULT 0 NOT NULL;
ALTER TABLE "logged_meals" ADD COLUMN IF NOT EXISTS "fat_grams" integer DEFAULT 0 NOT NULL;
ALTER TABLE "logged_meals" ADD COLUMN IF NOT EXISTS "fiber_grams" integer DEFAULT 0 NOT NULL;
ALTER TABLE "logged_meals" ADD COLUMN IF NOT EXISTS "estimated_cost_idr" integer DEFAULT 0;
ALTER TABLE "logged_meals" ADD COLUMN IF NOT EXISTS "quantity" double precision DEFAULT 1 NOT NULL;
ALTER TABLE "logged_meals" ADD COLUMN IF NOT EXISTS "date_key" text;

CREATE INDEX IF NOT EXISTS "idx_logged_meals_user_date" ON "logged_meals"("user_id", "date_key");
CREATE INDEX IF NOT EXISTS "idx_logged_meals_logged_at" ON "logged_meals"("logged_at");
