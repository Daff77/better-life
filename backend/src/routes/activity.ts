import { Router, Request, Response } from "express";
import {
  AddStepsInputSchema,
  AddWaterInputSchema,
  SyncActivityInputSchema,
} from "../schemas/validation.js";
import { activityRepository } from "../repositories/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const activityRouter = Router();

activityRouter.use(authMiddleware);

function resolveLocalDateKey(explicit?: unknown): string {
  if (typeof explicit === "string" && /^\d{4}-\d{2}-\d{2}$/.test(explicit)) {
    return explicit;
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 1. GET /api/activity/stats (or GET /api/activity)
const getActivityHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const dateKey = resolveLocalDateKey(req.query.date);
  const stats = await activityRepository.getByUserAndDate(userId, dateKey);
  return res.json(stats);
});

activityRouter.get("/", getActivityHandler);
activityRouter.get("/stats", getActivityHandler);

// 2. POST /api/activity/steps — Increment steps for authenticated user
activityRouter.post(
  "/steps",
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = AddStepsInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: parseResult.error.flatten(),
      });
    }

    const userId = req.user!.userId;
    const dateKey = resolveLocalDateKey(parseResult.data.date);
    const current = await activityRepository.getByUserAndDate(userId, dateKey);
    const nextSteps = Math.min(200000, current.steps + Math.round(parseResult.data.steps));

    const updated = await activityRepository.upsert(userId, dateKey, {
      steps: nextSteps,
      manualSteps: Math.min(200000, current.manualSteps + Math.round(parseResult.data.steps)),
      exerciseCalories: Math.round(nextSteps * 0.04),
      exerciseDurationMinutes: Math.round(nextSteps / 100),
    });

    return res.json(updated);
  })
);

// 3. POST /api/activity/water — Increment or adjust water intake glasses
activityRouter.post(
  "/water",
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = AddWaterInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: parseResult.error.flatten(),
      });
    }

    const userId = req.user!.userId;
    const dateKey = resolveLocalDateKey(parseResult.data.date);
    const current = await activityRepository.getByUserAndDate(userId, dateKey);
    const nextWater = Math.max(0, Math.min(32, current.waterGlasses + parseResult.data.glasses));

    const updated = await activityRepository.upsert(userId, dateKey, {
      waterGlasses: nextWater,
    });

    return res.json(updated);
  })
);

// 4. PUT /api/activity — Synchronize full daily activity snapshot (sensor + manual + water)
activityRouter.put(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = SyncActivityInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: parseResult.error.flatten(),
      });
    }

    const userId = req.user!.userId;
    const dateKey = resolveLocalDateKey(parseResult.data.date);
    const updated = await activityRepository.upsert(userId, dateKey, parseResult.data);
    return res.json(updated);
  })
);
