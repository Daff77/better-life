import { Router, Request, Response } from "express";
import { LogMealInputSchema, UpdateMealInputSchema } from "../schemas/validation.js";
import { mealRepository } from "../repositories/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const mealsRouter = Router();

mealsRouter.use(authMiddleware);

// 1. GET /api/meals (and legacy /logged) — Retrieve authenticated user's logged meals
const getMealsHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const dateKey =
    typeof req.query.dateKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.dateKey)
      ? req.query.dateKey
      : undefined;
  const meals = await mealRepository.listByUser(userId, dateKey);
  return res.json(meals);
});

mealsRouter.get("/", getMealsHandler);
mealsRouter.get("/logged", getMealsHandler);

// 2. POST /api/meals (and legacy /log) — Idempotent upsert with Last-Write-Wins conflict resolution
const logMealHandler = asyncHandler(async (req: Request, res: Response) => {
  const parseResult = LogMealInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Validation Error",
      details: parseResult.error.flatten(),
    });
  }

  const userId = req.user!.userId;
  const now = new Date();
  const data = parseResult.data;

  const loggedAt = data.loggedAt ? new Date(data.loggedAt) : now;
  const incomingUpdatedAt = data.updatedAt ? new Date(data.updatedAt) : now;
  const localYear = loggedAt.getFullYear();
  const localMonth = String(loggedAt.getMonth() + 1).padStart(2, "0");
  const localDay = String(loggedAt.getDate()).padStart(2, "0");
  const dateKey = data.dateKey || `${localYear}-${localMonth}-${localDay}`;
  const timeStr =
    data.time || now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Multi-device conflict rule: Last-Write-Wins per entry ID based on updatedAt
  if (data.id && data.updatedAt) {
    const existing = await mealRepository.findById(userId, data.id);
    if (existing && existing.updatedAt.getTime() > incomingUpdatedAt.getTime()) {
      return res.status(200).json({
        ...existing,
        conflictResolution: "kept_newer_server_version",
      });
    }
  }

  const savedMeal = await mealRepository.upsert(userId, {
    id: data.id,
    type: data.type,
    name: data.name,
    calories: data.calories,
    proteinGrams: data.proteinGrams ?? 0,
    carbsGrams: data.carbsGrams ?? 0,
    fatGrams: data.fatGrams ?? 0,
    fiberGrams: data.fiberGrams ?? 0,
    estimatedCostIdr: data.estimatedCostIdr ?? 0,
    quantity: data.quantity ?? 1,
    dateKey,
    time: timeStr,
    loggedAt,
    updatedAt: incomingUpdatedAt,
  });

  return res.status(201).json(savedMeal);
});

mealsRouter.post("/", logMealHandler);
mealsRouter.post("/log", logMealHandler);

// 2b. PUT /api/meals/:id — Update an existing meal entry owned by the authenticated user
mealsRouter.put(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = UpdateMealInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: parseResult.error.flatten(),
      });
    }

    const userId = req.user!.userId;
    const mealId = req.params.id;
    const existing = await mealRepository.findById(userId, mealId);

    if (!existing) {
      return res.status(404).json({
        error: "Not Found",
        message: "Meal entry could not be found or does not belong to you.",
      });
    }

    const patch = parseResult.data;
    const incomingUpdatedAt = patch.updatedAt ? new Date(patch.updatedAt) : new Date();
    if (patch.updatedAt && existing.updatedAt.getTime() > incomingUpdatedAt.getTime()) {
      return res.json({
        ...existing,
        conflictResolution: "kept_newer_server_version",
      });
    }

    const updated = await mealRepository.upsert(userId, {
      id: existing.id,
      type: patch.type ?? existing.type,
      name: patch.name ?? existing.name,
      calories: patch.calories ?? existing.calories,
      proteinGrams: patch.proteinGrams ?? existing.proteinGrams,
      carbsGrams: patch.carbsGrams ?? existing.carbsGrams,
      fatGrams: patch.fatGrams ?? existing.fatGrams,
      fiberGrams: patch.fiberGrams ?? existing.fiberGrams,
      estimatedCostIdr: patch.estimatedCostIdr ?? existing.estimatedCostIdr,
      quantity: patch.quantity ?? existing.quantity,
      dateKey: patch.dateKey ?? existing.dateKey,
      time: existing.time,
      loggedAt: existing.loggedAt,
      updatedAt: incomingUpdatedAt,
    });

    return res.json(updated);
  })
);

// 3. DELETE /api/meals/:id — Delete a specific meal entry with strict ownership check
mealsRouter.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const mealId = req.params.id;

    const removed = await mealRepository.deleteById(userId, mealId);
    if (!removed) {
      return res.status(404).json({
        error: "Not Found",
        message: "Meal entry could not be found or does not belong to you.",
      });
    }

    return res.json({
      message: "Meal deleted successfully",
      deletedMeal: removed,
    });
  })
);

// 4. POST /api/meals/reset — Clear logged meals for a specific dateKey owned by user
mealsRouter.post(
  "/reset",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const dateKey = req.body?.dateKey;
    if (typeof dateKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return res.status(400).json({ error: "dateKey is required" });
    }
    const deletedCount = await mealRepository.deleteByDateKey(userId, dateKey);
    return res.json({
      message: "Meals cleared successfully",
      dateKey,
      deletedCount,
    });
  })
);

// 5. POST /api/meals/reset-all — Permanently clear all logged meals owned by the authenticated user
mealsRouter.post(
  "/reset-all",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    await mealRepository.clearAllByUser(userId);
    return res.json({
      message: "All logged meals cleared successfully",
    });
  })
);
