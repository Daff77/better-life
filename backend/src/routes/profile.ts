import { Router, Request, Response } from "express";
import {
  UpdateProfileInputSchema,
  PersonalizationInputSchema,
  ReminderSettingsInputSchema,
  FavoriteFoodInputSchema,
  AccountBackupPayloadSchema,
} from "../schemas/validation.js";
import {
  userRepository,
  profileRepository,
  reminderRepository,
  favoriteRepository,
  mealRepository,
  activityRepository,
} from "../repositories/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const profileRouter = Router();

profileRouter.use(authMiddleware);

// 1. GET /api/profile/me (or GET /api/profile)
const getProfileHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const user = await userRepository.findById(userId);
  const profile = await profileRepository.findByUserId(userId);

  if (!user) {
    return res.status(404).json({
      error: "Not Found",
      message: "User profile could not be found.",
    });
  }

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    },
    profile,
  });
});

profileRouter.get("/", getProfileHandler);
profileRouter.get("/me", getProfileHandler);

// 2. PUT /api/profile/personalization — Update target calories & preferences
profileRouter.put(
  "/personalization",
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = PersonalizationInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: parseResult.error.flatten(),
      });
    }

    const userId = req.user!.userId;
    const data = parseResult.data;
    const currentYear = new Date().getFullYear();
    const resolvedBirthDate = data.birthDate ?? {
      day: 15,
      month: "June",
      year: currentYear - (data.age ?? 25),
    };

    const updatedProfile = await profileRepository.upsert(userId, {
      goal: data.goal,
      weight: data.weight,
      targetWeight: data.targetWeight ?? null,
      height: data.height,
      gender: data.gender,
      birthDate: resolvedBirthDate,
      cookingSkill: data.cookingSkill,
      dietType: data.dietType,
      allergies: data.allergies,
      targetCalories: data.targetCalories,
      onboardingCompleted: data.onboardingCompleted ?? true,
    });

    return res.json({
      message: "Personalization saved",
      profile: updatedProfile,
    });
  })
);

// 3. PATCH /api/profile/me — Update basic account profile fields
profileRouter.patch(
  "/me",
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = UpdateProfileInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: parseResult.error.flatten(),
      });
    }

    const userId = req.user!.userId;
    const updated = await userRepository.update(userId, parseResult.data);

    if (!updated) {
      return res.status(404).json({
        error: "Not Found",
        message: "User account could not be found.",
      });
    }

    return res.json({
      message: "Profile updated",
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
      },
    });
  })
);

// 4. GET & PUT /api/profile/reminders — Per-account reminder settings persistence
profileRouter.get(
  "/reminders",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const settings = await reminderRepository.getByUserId(userId);
    return res.json({ settings });
  })
);

profileRouter.put(
  "/reminders",
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = ReminderSettingsInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: parseResult.error.flatten(),
      });
    }

    const userId = req.user!.userId;
    const saved = await reminderRepository.saveForUser(userId, parseResult.data);
    return res.json({
      message: "Reminder settings saved",
      settings: saved,
    });
  })
);

// 5. GET, POST & DELETE /api/profile/favorites — Per-account favorite foods
profileRouter.get(
  "/favorites",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const favorites = await favoriteRepository.listByUser(userId);
    return res.json({ favorites });
  })
);

profileRouter.post(
  "/favorites",
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = FavoriteFoodInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        details: parseResult.error.flatten(),
      });
    }

    const userId = req.user!.userId;
    const saved = await favoriteRepository.upsert(userId, parseResult.data);
    return res.status(201).json({ favorite: saved });
  })
);

profileRouter.delete(
  "/favorites/:itemId",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    await favoriteRepository.remove(userId, req.params.itemId);
    return res.json({ message: "Favorite removed" });
  })
);

// 6. GET /api/profile/backup & POST /api/profile/restore — Validated Export & Restore
profileRouter.get(
  "/backup",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Not Found", message: "Account not found." });
    }

    const [profile, reminders, favorites, meals, activities] = await Promise.all([
      profileRepository.findByUserId(userId),
      reminderRepository.getByUserId(userId),
      favoriteRepository.listByUser(userId),
      mealRepository.listByUser(userId),
      activityRepository.listByUser(userId),
    ]);

    return res.json({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      account: {
        email: user.email,
        name: user.name,
      },
      personalization: profile
        ? {
            goal: profile.goal,
            weight: profile.weight,
            targetWeight: profile.targetWeight ?? undefined,
            height: profile.height,
            gender: profile.gender,
            birthDate: profile.birthDate,
            cookingSkill: profile.cookingSkill,
            dietType: profile.dietType,
            allergies: profile.allergies,
            targetCalories: profile.targetCalories,
            onboardingCompleted: profile.onboardingCompleted,
          }
        : null,
      reminders: reminders || null,
      favorites: favorites.map((f) => ({
        itemId: f.itemId,
        title: f.title,
        category: f.category,
        calories: f.calories,
        proteinGrams: f.proteinGrams,
        carbsGrams: f.carbsGrams,
        fatGrams: f.fatGrams,
        fiberGrams: f.fiberGrams,
        estimatedCostIdr: f.estimatedCostIdr,
        imageUrl: f.imageUrl,
      })),
      meals: meals.map((m) => ({
        id: m.id,
        type: m.type,
        name: m.name,
        calories: m.calories,
        proteinGrams: m.proteinGrams,
        carbsGrams: m.carbsGrams,
        fatGrams: m.fatGrams,
        fiberGrams: m.fiberGrams,
        estimatedCostIdr: m.estimatedCostIdr,
        quantity: m.quantity,
        dateKey: m.dateKey,
        time: m.time,
        loggedAt: m.loggedAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
      activities: activities.map((a) => ({
        date: a.date,
        steps: a.steps,
        sensorSteps: a.sensorSteps,
        manualSteps: a.manualSteps,
        stepGoal: a.stepGoal,
        waterGlasses: a.waterGlasses,
        waterGoal: a.waterGoal,
      })),
    });
  })
);

profileRouter.post(
  "/restore",
  asyncHandler(async (req: Request, res: Response) => {
    const parseResult = AccountBackupPayloadSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Invalid backup format.",
        details: parseResult.error.flatten(),
      });
    }

    const userId = req.user!.userId;
    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Not Found", message: "Account not found." });
    }

    const payload = parseResult.data;
    if (payload.account.email.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
      return res.status(403).json({
        error: "Forbidden",
        code: "ACCOUNT_MISMATCH",
        message: "Backup file belongs to a different account and cannot be imported here.",
      });
    }

    if (payload.personalization) {
      const p = payload.personalization;
      const currentYear = new Date().getFullYear();
      await profileRepository.upsert(userId, {
        goal: p.goal,
        weight: p.weight,
        targetWeight: p.targetWeight ?? null,
        height: p.height,
        gender: p.gender,
        birthDate: p.birthDate ?? { day: 15, month: "June", year: currentYear - (p.age ?? 25) },
        cookingSkill: p.cookingSkill,
        dietType: p.dietType,
        allergies: p.allergies,
        targetCalories: p.targetCalories,
        onboardingCompleted: p.onboardingCompleted ?? true,
      });
    }

    if (payload.reminders) {
      await reminderRepository.saveForUser(userId, payload.reminders);
    }

    let restoredFavorites = 0;
    for (const fav of payload.favorites) {
      await favoriteRepository.upsert(userId, fav);
      restoredFavorites++;
    }

    let restoredMeals = 0;
    for (const meal of payload.meals) {
      await mealRepository.upsert(userId, {
        id: meal.id,
        type: meal.type,
        name: meal.name,
        calories: meal.calories,
        proteinGrams: meal.proteinGrams,
        carbsGrams: meal.carbsGrams,
        fatGrams: meal.fatGrams,
        fiberGrams: meal.fiberGrams,
        estimatedCostIdr: meal.estimatedCostIdr,
        quantity: meal.quantity,
        dateKey: meal.dateKey,
        time: meal.time,
        loggedAt: meal.loggedAt ? new Date(meal.loggedAt) : new Date(),
        updatedAt: meal.updatedAt ? new Date(meal.updatedAt) : new Date(),
      });
      restoredMeals++;
    }

    let restoredActivities = 0;
    for (const act of payload.activities) {
      await activityRepository.upsert(userId, act.date, act);
      restoredActivities++;
    }

    return res.json({
      message: "Backup restored safely without duplicates.",
      summary: {
        restoredMeals,
        restoredFavorites,
        restoredActivities,
      },
    });
  })
);
