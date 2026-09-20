import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  PORT: z.string().default("4000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().default("postgresql://betterlife:betterlife_secret@localhost:5432/betterlife_db"),
  JWT_SECRET: z.string().default("super_secret_better_life_jwt_key_development_only"),
  CORS_ORIGIN: z.string().default("http://localhost:8085,http://localhost:8081"),
});

export const env = EnvSchema.parse(process.env);
