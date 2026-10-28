import { Router, Request, Response } from "express";
import { LogMealInputSchema } from "../schemas/validation.js";
import { inMemoryStore } from "../services/store.js";
import { authMiddleware } from "../middleware/auth.js";

export const mealsRouter = Router();

// Apply authentication middleware to all meal operations
mealsRouter.use(authMiddleware);

// 1. GET /api/meals (and legacy /logged) — Retrieve authenticated user's logged meals
function getMealsHandler(req: Request, res: Response) {
  const userId = req.user!.userId;
  const meals = inMemoryStore.loggedMeals.get(userId) || [];
  return res.json(meals);
}

mealsRouter.get("/", getMealsHandler);
mealsRouter.get("/logged", getMealsHandler);

// 2. POST /api/meals (and legacy /log) — Log a new meal for authenticated user
function logMealHandler(req: Request, res: Response) {
  const parseResult = LogMealInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Validation Error",
      details: parseResult.error.flatten(),
    });
  }

  const userId = req.user!.userId;
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const {
    type,
    name,
    calories,
    proteinGrams,
    carbsGrams,
    fatGrams,
    fiberGrams,
    estimatedCostIdr,
    quantity,
    dateKey: inputDateKey,
    loggedAt: inputLoggedAt,
  } = parseResult.data;

  const loggedAt = inputLoggedAt ? new Date(inputLoggedAt) : now;
  const dateKey = inputDateKey || loggedAt.toISOString().split("T")[0];

  const newMeal = {
    id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId,
    type,
    name,
    calories,
    proteinGrams: proteinGrams || 0,
    carbsGrams: carbsGrams || 0,
    fatGrams: fatGrams || 0,
    fiberGrams: fiberGrams || 0,
    estimatedCostIdr: estimatedCostIdr || 0,
    quantity: quantity || 1,
    dateKey,
    time: timeStr,
    loggedAt,
  };

  const current = inMemoryStore.loggedMeals.get(userId) || [];
  inMemoryStore.loggedMeals.set(userId, [newMeal, ...current]);

  return res.status(201).json(newMeal);
}

mealsRouter.post("/", logMealHandler);
mealsRouter.post("/log", logMealHandler);

// 3. DELETE /api/meals/:id — Delete a specific meal entry with strict ownership check
mealsRouter.delete("/:id", (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const mealId = req.params.id;

  const current = inMemoryStore.loggedMeals.get(userId) || [];
  const mealIndex = current.findIndex((m) => m.id === mealId);

  if (mealIndex === -1) {
    return res.status(404).json({
      error: "Not Found",
      message: "Meal entry could not be found or does not belong to you.",
    });
  }

  const [removed] = current.splice(mealIndex, 1);
  inMemoryStore.loggedMeals.set(userId, current);

  return res.json({
    message: "Meal deleted successfully",
    deletedMeal: removed,
  });
});

// 4. POST /api/meals/reset — Clear today's logged meals for authenticated user
mealsRouter.post("/reset", (req: Request, res: Response) => {
  const userId = req.user!.userId;
  inMemoryStore.loggedMeals.set(userId, []);
  return res.json({ message: "Meals cleared successfully" });
});
