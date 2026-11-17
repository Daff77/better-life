-- Migration 0000: Base Better Life Schema (Safe & Non-destructive)
-- Creates core tables if they do not exist yet without dropping existing records.

CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "phone" text DEFAULT '' NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "profiles" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "goal" text NOT NULL,
  "weight" double precision NOT NULL,
  "height" double precision NOT NULL,
  "gender" text NOT NULL,
  "birth_date" jsonb NOT NULL,
  "cooking_skill" text NOT NULL,
  "diet_type" text NOT NULL,
  "allergies" jsonb NOT NULL,
  "target_calories" integer NOT NULL,
  "onboarding_completed" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "recipes" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "category" text NOT NULL,
  "calories" integer NOT NULL,
  "prep_time_minutes" integer NOT NULL,
  "difficulty" text NOT NULL,
  "description" text NOT NULL,
  "svg_icon" text NOT NULL,
  "image_url" text,
  "estimated_cost_idr" integer,
  "is_premium" boolean DEFAULT false NOT NULL,
  "nutrition" jsonb NOT NULL,
  "ingredients" jsonb NOT NULL,
  "instructions" jsonb NOT NULL,
  "dietary_tags" jsonb,
  "allergens" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "logged_meals" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "name" text NOT NULL,
  "calories" integer NOT NULL,
  "protein_grams" integer DEFAULT 0 NOT NULL,
  "carbs_grams" integer DEFAULT 0 NOT NULL,
  "fat_grams" integer DEFAULT 0 NOT NULL,
  "fiber_grams" integer DEFAULT 0 NOT NULL,
  "estimated_cost_idr" integer DEFAULT 0,
  "quantity" double precision DEFAULT 1 NOT NULL,
  "date_key" text,
  "time" text NOT NULL,
  "logged_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "activity_stats" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" text NOT NULL,
  "steps" integer DEFAULT 0 NOT NULL,
  "step_goal" integer DEFAULT 6000 NOT NULL,
  "exercise_calories" integer DEFAULT 0 NOT NULL,
  "exercise_duration_minutes" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
