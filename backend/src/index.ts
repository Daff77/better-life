import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.js";
import { profileRouter } from "./routes/profile.js";
import { mealsRouter } from "./routes/meals.js";
import { recipesRouter } from "./routes/recipes.js";
import { activityRouter } from "./routes/activity.js";

const app: Express = express();

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Allow standard local dev and mobile simulator origins
    callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "better-life-backend",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Modular route groups
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/meals", mealsRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/activity", activityRouter);

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Backend Error]", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: env.NODE_ENV === "development" ? err.message : undefined,
  });
});

const PORT = parseInt(env.PORT, 10) || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Better Life Backend running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});
