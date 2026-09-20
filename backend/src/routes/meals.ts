import { Router, Request, Response } from "express";
import { LogMealInputSchema } from "../schemas/validation.js";
import { inMemoryStore } from "../services/store.js";

export const mealsRouter = Router();

mealsRouter.get("/logged", (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || "user-1";
  const meals = inMemoryStore.loggedMeals.get(userId) || [];
  return res.json(meals);
});

mealsRouter.post("/log", (req: Request, res: Response) => {
  const parseResult = LogMealInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  const userId = (req.query.userId as string) || "user-1";
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const newMeal = {
    id: `meal-${Date.now()}`,
    userId,
    type: parseResult.data.type,
    name: parseResult.data.name,
    calories: parseResult.data.calories,
    time: timeStr,
    loggedAt: now,
  };

  const current = inMemoryStore.loggedMeals.get(userId) || [];
  inMemoryStore.loggedMeals.set(userId, [newMeal, ...current]);

  return res.status(201).json(newMeal);
});

mealsRouter.post("/reset", (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || "user-1";
  inMemoryStore.loggedMeals.set(userId, []);
  return res.json({ message: "Meals cleared successfully" });
});
