import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const INSECURE_JWT_SECRETS = new Set([
  "super_secret_better_life_jwt_key_development_only",
  "your_super_secret_jwt_key_at_least_32_characters_long",
  "replace_with_random_secret_at_least_32_characters_long",
  "secret",
  "changeme",
  "development",
]);

const RawEnvSchema = z.object({
  PORT: z.string().default("4000"),
  GOOGLE_CLIENT_IDS: z
    .string()
    .default("340702974194-mqp84cjopen5b8rh4jaqt06g8o2t1c0g.apps.googleusercontent.com"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().default("pglite://./data/postgres"),
  JWT_SECRET: z.string().default("super_secret_better_life_jwt_key_development_only"),
  CORS_ORIGIN: z.string().default("http://localhost:8085,http://localhost:8081"),
  ENABLE_PAYMENT_SANDBOX: z.string().optional().default("false"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_MONTHLY: z.string().optional(),
  STRIPE_PRICE_ANNUAL: z.string().optional(),
  STRIPE_PRICE_LIFETIME: z.string().optional(),
});

export type AppEnv = z.infer<typeof RawEnvSchema>;

export function parseEnvironment(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = RawEnvSchema.parse(source);

  if (parsed.NODE_ENV === "production") {
    const trimmedSecret = parsed.JWT_SECRET.trim();
    if (
      !trimmedSecret ||
      trimmedSecret.length < 32 ||
      INSECURE_JWT_SECRETS.has(trimmedSecret)
    ) {
      throw new Error(
        "Refusing to start in production: JWT_SECRET must be a unique secret of at least 32 characters and must not use a default placeholder."
      );
    }

    const origins = parsed.CORS_ORIGIN.split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    if (origins.length === 0 || origins.includes("*")) {
      throw new Error(
        "Refusing to start in production: CORS_ORIGIN must specify explicit allowed origins and cannot be empty or wildcard (*)."
      );
    }
  }

  return parsed;
}

export function resolveAllowedCorsOrigins(envConfig: Pick<AppEnv, "CORS_ORIGIN">): string[] {
  return envConfig.CORS_ORIGIN.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export function isOriginAllowed(
  origin: string | undefined,
  envConfig: Pick<AppEnv, "NODE_ENV" | "CORS_ORIGIN">
): boolean {
  // Requests without Origin header come from native mobile apps or server-to-server health probes
  if (!origin) return true;

  const normalizedOrigin = origin.trim().replace(/\/+$/, "");
  const allowed = resolveAllowedCorsOrigins(envConfig).map((o) => o.replace(/\/+$/, ""));

  if (allowed.includes(normalizedOrigin)) {
    return true;
  }

  if (envConfig.NODE_ENV !== "production") {
    if (
      normalizedOrigin.startsWith("http://localhost:") ||
      normalizedOrigin === "http://localhost" ||
      normalizedOrigin.startsWith("http://127.0.0.1:") ||
      normalizedOrigin === "http://127.0.0.1" ||
      /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(
        normalizedOrigin
      ) ||
      /^https?:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.(exp\.direct|ngrok-free\.app|ngrok-free\.dev|ngrok\.io)$/i.test(
        normalizedOrigin
      )
    ) {
      return true;
    }
  }

  return false;
}

export const env = parseEnvironment(process.env);
