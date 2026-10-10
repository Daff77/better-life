import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { profileRouter } from "./routes/profile.js";
import { mealsRouter } from "./routes/meals.js";
import { recipesRouter } from "./routes/recipes.js";
import { activityRouter } from "./routes/activity.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app: Express = express();

// 1. Security HTTP Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// 2. CORS Handling
const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow mobile simulator and same-origin / local dev requests
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost")) {
        callback(null, true);
      } else {
        callback(null, true); // Dev-friendly fallback
      }
    },
    credentials: true,
  })
);

// 3. Body Parser with Payload Size Limit
app.use(express.json({ limit: "1mb" }));

// 4. Rate Limiting for Sensitive Auth Endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too Many Requests",
    message: "Too many authentication attempts. Please try again after 15 minutes.",
  },
  skip: () => env.NODE_ENV === "test",
});

// 5. Health Check Endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "better-life-backend",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// 6. Modular Route Registrations
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/meals", mealsRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/activity", activityRouter);

// 7. Centralized Error Handler Middleware
app.use(errorHandler);

// 8. Server Startup
const PORT = parseInt(env.PORT, 10) || 4000;

const isRunningTest =
  env.NODE_ENV === "test" ||
  process.env.NODE_ENV === "test" ||
  process.argv.some((arg) => arg.includes("test")) ||
  Boolean(process.env.NODE_TEST_CONTEXT);

if (!isRunningTest) {
  app.listen(PORT, () => {
    console.log(`🚀 Better Life Backend running on http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
  });
}

