import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env, isOriginAllowed } from "./config/env.js";
import { ensureDbReady, getDatabaseMetadata } from "./db/index.js";
import { authRouter } from "./routes/auth.js";
import { profileRouter } from "./routes/profile.js";
import { mealsRouter } from "./routes/meals.js";
import { recipesRouter } from "./routes/recipes.js";
import { activityRouter } from "./routes/activity.js";
import { subscriptionRouter } from "./routes/subscription.js";
import { analyticsRouter } from "./routes/analytics.js";
import { mealPlansRouter } from "./routes/mealPlans.js";
import { errorHandler } from "./middleware/errorHandler.js";

import { assistantRouter } from "./routes/assistant.js";

export const app: Express = express();

// Hosted reverse proxies forward the original client IP for rate limiting.
if (process.env.TRUST_PROXY_HOPS === "1") app.set("trust proxy", 1);

// 1. Security HTTP Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// 2. Strict CORS Handling (rejects unlisted origins in production)
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin, env)) {
        callback(null, true);
      } else {
        const corsErr = new Error("Origin not allowed by CORS policy") as Error & {
          status?: number;
        };
        corsErr.status = 403;
        callback(corsErr);
      }
    },
    credentials: true,
  })
);

app.use("/api/assistant", assistantRouter);

// 3. Body Parser with Raw Buffer Capture for Webhook Signature Verification
app.use(
  express.json({
    limit: "1mb",
    verify: (req: Request, _res, buf) => {
      if (req.originalUrl?.startsWith("/api/subscription/webhook")) {
        req.rawBody = buf.toString("utf8");
      }
    },
  })
);

// 4. Ensure Database Migrations & Connection Are Ready Before Business Routes
app.use(async (_req, _res, next) => {
  try {
    await ensureDbReady();
    next();
  } catch (err) {
    next(err);
  }
});

// 5. Rate Limiting for API and Sensitive Auth Endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too Many Requests",
    message: "Too many API requests from this client. Please try again shortly.",
  },
  skip: () => env.NODE_ENV === "test",
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too Many Requests",
    message: "Too many authentication attempts. Please try again after 15 minutes.",
  },
  skip: (req) => env.NODE_ENV === "test" || (req.method === "GET" && req.path === "/me"),
});

// 6. Health Check Endpoint
app.get("/health", (_req: Request, res: Response) => {
  const dbMeta = getDatabaseMetadata();
  res.json({
    status: "ok",
    service: "better-life-backend",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    database: dbMeta,
  });
});

// 7. Modular Route Registrations
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/meals", mealsRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/activity", activityRouter);
app.use("/api/subscription", subscriptionRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/meal-plans", mealPlansRouter);

// 8. Centralized Error Handler Middleware
app.use(errorHandler);

// 9. Server Startup
const PORT = parseInt(env.PORT, 10) || 4000;

const isRunningTest =
  env.NODE_ENV === "test" ||
  process.env.NODE_ENV === "test" ||
  process.argv.some((arg) => arg.includes("test")) ||
  Boolean(process.env.NODE_TEST_CONTEXT);

if (!isRunningTest) {
  ensureDbReady()
    .then(() => {
      const dbMeta = getDatabaseMetadata();
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Better Life Backend running on http://0.0.0.0:${PORT} (db=${dbMeta.kind})`);
        console.log(`Health check: http://localhost:${PORT}/health`);
      });
    })
    .catch((err) => {
      console.error("Failed to initialize database before server startup:", err);
      process.exit(1);
    });
}
