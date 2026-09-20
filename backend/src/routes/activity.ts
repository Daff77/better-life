import { Router, Request, Response } from "express";
import { AddStepsInputSchema } from "../schemas/validation.js";
import { inMemoryStore } from "../services/store.js";

export const activityRouter = Router();

activityRouter.get("/stats", (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || "user-1";
  const stats = inMemoryStore.activity.get(userId) || {
    steps: 3420,
    stepGoal: 6000,
    exerciseCalories: 240,
    exerciseDurationMinutes: 35,
  };
  return res.json(stats);
});

activityRouter.post("/steps", (req: Request, res: Response) => {
  const parseResult = AddStepsInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  const userId = (req.query.userId as string) || "user-1";
  const current = inMemoryStore.activity.get(userId) || {
    steps: 3420,
    stepGoal: 6000,
    exerciseCalories: 240,
    exerciseDurationMinutes: 35,
  };

  current.steps = Math.min(current.stepGoal + 2000, current.steps + parseResult.data.steps);
  inMemoryStore.activity.set(userId, current);

  return res.json(current);
});
