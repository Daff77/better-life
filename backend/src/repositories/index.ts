import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { formatLocalDateKey } from "@better-life/shared";
import { ensureDbReady } from "../db/index.js";
import * as schema from "../db/schema.js";
import { FoodItemData } from "../data/seedData.js";
import { MealPlanRecord } from "../types/mealPlan.js";
import {
  BillingProvider,
  MembershipTier,
  PaymentEventRecord,
  PlanId,
  SubscriptionRecord,
  SubscriptionStatus,
} from "../types/subscription.js";

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  googleSubject: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileEntity {
  id?: string;
  userId: string;
  goal: "Eat balanced" | "Lose weight" | "Gain muscle" | string;
  weight: number;
  targetWeight?: number | null;
  height: number;
  gender: "Female" | "Male" | string;
  birthDate: { day: number; month: string; year: number };
  cookingSkill: "Low" | "Middle" | "High" | string;
  dietType: string;
  allergies: string[];
  targetCalories: number;
  onboardingCompleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LoggedMealEntity {
  id: string;
  userId: string;
  type: string;
  name: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  estimatedCostIdr: number;
  quantity: number;
  dateKey: string;
  time: string;
  loggedAt: Date;
  updatedAt: Date;
}

export interface ActivityEntity {
  id: string;
  userId: string;
  date: string;
  steps: number;
  sensorSteps: number;
  manualSteps: number;
  stepGoal: number;
  waterGlasses: number;
  waterGoal: number;
  exerciseCalories: number;
  exerciseDurationMinutes: number;
  updatedAt: Date;
}

export interface FavoriteFoodEntity {
  id: string;
  userId: string;
  itemId: string;
  title: string;
  category: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  estimatedCostIdr: number;
  imageUrl?: string | null;
  createdAt: Date;
}

function toScopedMealPk(userId: string, mealId: string): string {
  const prefix = `${userId}::`;
  return mealId.startsWith(prefix) ? mealId : `${prefix}${mealId}`;
}

function fromScopedMealPk(userId: string, rowId: string): string {
  const prefix = `${userId}::`;
  return rowId.startsWith(prefix) ? rowId.slice(prefix.length) : rowId;
}

function mapMealRow(row: typeof schema.loggedMeals.$inferSelect): LoggedMealEntity {
  const loggedAt = row.loggedAt instanceof Date ? row.loggedAt : new Date(row.loggedAt);
  const updatedAt = row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt);
  const fallbackDateKey = formatLocalDateKey(loggedAt);
  return {
    id: fromScopedMealPk(row.userId, row.id),
    userId: row.userId,
    type: row.type,
    name: row.name,
    calories: row.calories,
    proteinGrams: Number(row.proteinGrams ?? 0),
    carbsGrams: Number(row.carbsGrams ?? 0),
    fatGrams: Number(row.fatGrams ?? 0),
    fiberGrams: Number(row.fiberGrams ?? 0),
    estimatedCostIdr: Number(row.estimatedCostIdr ?? 0),
    quantity: Number(row.quantity ?? 1),
    dateKey: row.dateKey || fallbackDateKey,
    time: row.time,
    loggedAt,
    updatedAt,
  };
}

function mapRecipeRow(row: typeof schema.recipes.$inferSelect): FoodItemData {
  return {
    id: row.id,
    title: row.title,
    category: row.category as FoodItemData["category"],
    calories: row.calories,
    prepTimeMinutes: row.prepTimeMinutes,
    difficulty: row.difficulty as FoodItemData["difficulty"],
    description: row.description,
    svgIcon: row.svgIcon as FoodItemData["svgIcon"],
    imageUrl: row.imageUrl ?? undefined,
    estimatedCostIdr: row.estimatedCostIdr ?? undefined,
    isPremium: row.isPremium,
    nutrition: row.nutrition as FoodItemData["nutrition"],
    ingredients: row.ingredients as FoodItemData["ingredients"],
    instructions: row.instructions as FoodItemData["instructions"],
    dietaryTags: (row.dietaryTags as string[] | null) ?? undefined,
    allergens: (row.allergens as string[] | null) ?? undefined,
  };
}

function mapSubscriptionRow(row: typeof schema.subscriptions.$inferSelect): SubscriptionRecord {
  return {
    id: row.id,
    userId: row.userId,
    tier: row.tier as MembershipTier,
    status: row.status as SubscriptionStatus,
    planId: (row.planId as PlanId | null) ?? null,
    billingProvider: row.billingProvider as BillingProvider,
    externalSubscriptionId: row.externalSubscriptionId ?? null,
    externalCustomerId: row.externalCustomerId ?? null,
    currentPeriodStart: row.currentPeriodStart ? new Date(row.currentPeriodStart) : null,
    currentPeriodEnd: row.currentPeriodEnd ? new Date(row.currentPeriodEnd) : null,
    cancelAtPeriodEnd: Boolean(row.cancelAtPeriodEnd),
    canceledAt: row.canceledAt ? new Date(row.canceledAt) : null,
    metadata: (row.metadata as Record<string, any> | null) ?? {},
    createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
  };
}

// ============================================================================
// 1. USER REPOSITORY
// ============================================================================
export const userRepository = {
  async findById(id: string): Promise<UserEntity | null> {
    const db = (await ensureDbReady()) as any;
    const rows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return rows[0] ?? null;
  },

  async findByEmail(email: string): Promise<UserEntity | null> {
    const normalized = email.trim().toLowerCase();
    const db = (await ensureDbReady()) as any;
    const rows = await db
      .select()
      .from(schema.users)
      .where(sql`lower(${schema.users.email}) = ${normalized}`)
      .limit(1);
    return rows[0] ?? null;
  },

  async findByIdentifier(identifier: string): Promise<UserEntity | null> {
    const normalized = identifier.trim().toLowerCase();
    if (!normalized) return null;
    if (normalized.includes("@")) {
      return this.findByEmail(normalized);
    }
    const db = (await ensureDbReady()) as any;
    const exactNameOrPrefix = await db
      .select()
      .from(schema.users)
      .where(
        sql`lower(${schema.users.name}) = ${normalized} OR split_part(lower(${schema.users.email}), '@', 1) = ${normalized}`
      )
      .limit(2);
    // Only resolve non-email username when unambiguous (exactly 1 account matches)
    if (exactNameOrPrefix.length === 1) {
      return exactNameOrPrefix[0];
    }
    return null;
  },

  async findByGoogleSubject(googleSubject: string): Promise<UserEntity | null> {
    const db = (await ensureDbReady()) as any;
    const rows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.googleSubject, googleSubject))
      .limit(1);
    return rows[0] ?? null;
  },

  async create(input: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    passwordHash: string;
    googleSubject?: string | null;
  }): Promise<UserEntity> {
    const db = (await ensureDbReady()) as any;
    const now = new Date();
    const [created] = await db
      .insert(schema.users)
      .values({
        id: input.id,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone?.trim() ?? "",
        passwordHash: input.passwordHash,
        googleSubject: input.googleSubject ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return created;
  },

  async upsert(input: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    passwordHash: string;
    googleSubject?: string | null;
  }): Promise<UserEntity> {
    const db = (await ensureDbReady()) as any;
    const now = new Date();
    const normalizedEmail = input.email.trim().toLowerCase();
    const existingByEmail = await this.findByEmail(normalizedEmail);
    if (existingByEmail && existingByEmail.id !== input.id) {
      await db.delete(schema.users).where(eq(schema.users.id, existingByEmail.id));
    }
    const [saved] = await db
      .insert(schema.users)
      .values({
        id: input.id,
        name: input.name.trim(),
        email: normalizedEmail,
        phone: input.phone?.trim() ?? "",
        passwordHash: input.passwordHash,
        googleSubject: input.googleSubject ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.users.id,
        set: {
          name: input.name.trim(),
          email: normalizedEmail,
          phone: input.phone?.trim() ?? "",
          passwordHash: input.passwordHash,
          googleSubject: input.googleSubject ?? null,
          updatedAt: now,
        },
      })
      .returning();
    return saved;
  },

  async update(
    userId: string,
    patch: Partial<{
      name: string;
      phone: string;
      passwordHash: string;
      googleSubject: string | null;
    }>
  ): Promise<UserEntity | null> {
    const db = (await ensureDbReady()) as any;
    const updateValues: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.name !== undefined) updateValues.name = patch.name.trim();
    if (patch.phone !== undefined) updateValues.phone = patch.phone.trim();
    if (patch.passwordHash !== undefined) updateValues.passwordHash = patch.passwordHash;
    if (patch.googleSubject !== undefined) updateValues.googleSubject = patch.googleSubject;

    const rows = await db
      .update(schema.users)
      .set(updateValues)
      .where(eq(schema.users.id, userId))
      .returning();
    return rows[0] ?? null;
  },
};

// ============================================================================
// 2. PROFILE REPOSITORY
// ============================================================================
export const profileRepository = {
  async findByUserId(userId: string): Promise<ProfileEntity | null> {
    const db = (await ensureDbReady()) as any;
    const rows = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, userId))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      userId: r.userId,
      goal: r.goal,
      weight: Number(r.weight),
      targetWeight: r.targetWeight !== null && r.targetWeight !== undefined ? Number(r.targetWeight) : null,
      height: Number(r.height),
      gender: r.gender,
      birthDate: r.birthDate as { day: number; month: string; year: number },
      cookingSkill: r.cookingSkill,
      dietType: r.dietType,
      allergies: Array.isArray(r.allergies) ? (r.allergies as string[]) : [],
      targetCalories: Number(r.targetCalories),
      onboardingCompleted: Boolean(r.onboardingCompleted),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  },

  async upsert(
    userId: string,
    data: Omit<ProfileEntity, "id" | "userId" | "createdAt" | "updatedAt">
  ): Promise<ProfileEntity> {
    const db = (await ensureDbReady()) as any;
    const now = new Date();
    const profileId = `profile-${userId}`;

    await db
      .insert(schema.profiles)
      .values({
        id: profileId,
        userId,
        goal: data.goal,
        weight: data.weight,
        targetWeight: data.targetWeight ?? null,
        height: data.height,
        gender: data.gender,
        birthDate: data.birthDate,
        cookingSkill: data.cookingSkill,
        dietType: data.dietType,
        allergies: data.allergies ?? [],
        targetCalories: Math.round(data.targetCalories),
        onboardingCompleted: Boolean(data.onboardingCompleted),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.profiles.userId,
        set: {
          goal: data.goal,
          weight: data.weight,
          targetWeight: data.targetWeight ?? null,
          height: data.height,
          gender: data.gender,
          birthDate: data.birthDate,
          cookingSkill: data.cookingSkill,
          dietType: data.dietType,
          allergies: data.allergies ?? [],
          targetCalories: Math.round(data.targetCalories),
          onboardingCompleted: Boolean(data.onboardingCompleted),
          updatedAt: now,
        },
      });

    return (await this.findByUserId(userId))!;
  },
};

// ============================================================================
// 3. RECIPE REPOSITORY
// ============================================================================
export const recipeRepository = {
  async findAll(): Promise<FoodItemData[]> {
    const db = (await ensureDbReady()) as any;
    const rows = await db.select().from(schema.recipes);
    return rows.map(mapRecipeRow);
  },

  async findById(id: string): Promise<FoodItemData | null> {
    const db = (await ensureDbReady()) as any;
    const rows = await db
      .select()
      .from(schema.recipes)
      .where(eq(schema.recipes.id, id))
      .limit(1);
    return rows[0] ? mapRecipeRow(rows[0]) : null;
  },
};

// ============================================================================
// 4. MEAL JOURNAL REPOSITORY
// ============================================================================
export const mealRepository = {
  async listByUser(userId: string, dateKey?: string): Promise<LoggedMealEntity[]> {
    const db = (await ensureDbReady()) as any;
    const condition = dateKey
      ? and(eq(schema.loggedMeals.userId, userId), eq(schema.loggedMeals.dateKey, dateKey))
      : eq(schema.loggedMeals.userId, userId);
    const rows = await db
      .select()
      .from(schema.loggedMeals)
      .where(condition)
      .orderBy(desc(schema.loggedMeals.loggedAt));
    return rows.map(mapMealRow);
  },

  async findById(userId: string, mealId: string): Promise<LoggedMealEntity | null> {
    const db = (await ensureDbReady()) as any;
    const scopedId = toScopedMealPk(userId, mealId);
    const rows = await db
      .select()
      .from(schema.loggedMeals)
      .where(
        and(
          eq(schema.loggedMeals.userId, userId),
          inArray(schema.loggedMeals.id, [scopedId, mealId])
        )
      )
      .limit(1);
    return rows[0] ? mapMealRow(rows[0]) : null;
  },

  async upsert(
    userId: string,
    input: {
      id?: string;
      type: string;
      name: string;
      calories: number;
      proteinGrams?: number;
      carbsGrams?: number;
      fatGrams?: number;
      fiberGrams?: number;
      estimatedCostIdr?: number;
      quantity?: number;
      dateKey?: string;
      time?: string;
      loggedAt?: Date;
      updatedAt?: Date;
    }
  ): Promise<LoggedMealEntity> {
    const db = (await ensureDbReady()) as any;
    const now = new Date();
    const rawId = input.id || `meal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const pk = toScopedMealPk(userId, rawId);
    const loggedAt = input.loggedAt ?? now;
    const updatedAt = input.updatedAt ?? now;
    const dateKey = input.dateKey || formatLocalDateKey(loggedAt);
    const timeStr =
      input.time ||
      loggedAt.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

    const [saved] = await db
      .insert(schema.loggedMeals)
      .values({
        id: pk,
        userId,
        type: input.type,
        name: input.name,
        calories: Math.round(input.calories),
        proteinGrams: Number(input.proteinGrams ?? 0),
        carbsGrams: Number(input.carbsGrams ?? 0),
        fatGrams: Number(input.fatGrams ?? 0),
        fiberGrams: Number(input.fiberGrams ?? 0),
        estimatedCostIdr: Math.round(input.estimatedCostIdr ?? 0),
        quantity: Number(input.quantity ?? 1),
        dateKey,
        time: timeStr,
        loggedAt,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: schema.loggedMeals.id,
        set: {
          type: input.type,
          name: input.name,
          calories: Math.round(input.calories),
          proteinGrams: Number(input.proteinGrams ?? 0),
          carbsGrams: Number(input.carbsGrams ?? 0),
          fatGrams: Number(input.fatGrams ?? 0),
          fiberGrams: Number(input.fiberGrams ?? 0),
          estimatedCostIdr: Math.round(input.estimatedCostIdr ?? 0),
          quantity: Number(input.quantity ?? 1),
          dateKey,
          time: timeStr,
          updatedAt,
        },
      })
      .returning();

    return mapMealRow(saved);
  },

  async deleteById(userId: string, mealId: string): Promise<LoggedMealEntity | null> {
    const db = (await ensureDbReady()) as any;
    const scopedId = toScopedMealPk(userId, mealId);
    const deleted = await db
      .delete(schema.loggedMeals)
      .where(
        and(
          eq(schema.loggedMeals.userId, userId),
          inArray(schema.loggedMeals.id, [scopedId, mealId])
        )
      )
      .returning();
    return deleted[0] ? mapMealRow(deleted[0]) : null;
  },

  async deleteByDateKey(userId: string, dateKey: string): Promise<number> {
    const db = (await ensureDbReady()) as any;
    const deleted = await db
      .delete(schema.loggedMeals)
      .where(and(eq(schema.loggedMeals.userId, userId), eq(schema.loggedMeals.dateKey, dateKey)))
      .returning();
    return deleted.length;
  },

  async clearAllByUser(userId: string): Promise<void> {
    const db = (await ensureDbReady()) as any;
    await db.delete(schema.loggedMeals).where(eq(schema.loggedMeals.userId, userId));
  },
};

// ============================================================================
// 5. ACTIVITY REPOSITORY (STEPS + WATER HYDRATION)
// ============================================================================
export const activityRepository = {
  async getByUserAndDate(userId: string, dateKey: string): Promise<ActivityEntity> {
    const db = (await ensureDbReady()) as any;
    const rows = await db
      .select()
      .from(schema.activityStats)
      .where(and(eq(schema.activityStats.userId, userId), eq(schema.activityStats.date, dateKey)))
      .limit(1);

    if (rows[0]) {
      return {
        id: rows[0].id,
        userId: rows[0].userId,
        date: rows[0].date,
        steps: Number(rows[0].steps ?? 0),
        sensorSteps: Number(rows[0].sensorSteps ?? 0),
        manualSteps: Number(rows[0].manualSteps ?? 0),
        stepGoal: Number(rows[0].stepGoal ?? 6000),
        waterGlasses: Number(rows[0].waterGlasses ?? 0),
        waterGoal: Number(rows[0].waterGoal ?? 8),
        exerciseCalories: Number(rows[0].exerciseCalories ?? 0),
        exerciseDurationMinutes: Number(rows[0].exerciseDurationMinutes ?? 0),
        updatedAt: rows[0].updatedAt,
      };
    }

    return {
      id: `${userId}::${dateKey}`,
      userId,
      date: dateKey,
      steps: 0,
      sensorSteps: 0,
      manualSteps: 0,
      stepGoal: 6000,
      waterGlasses: 0,
      waterGoal: 8,
      exerciseCalories: 0,
      exerciseDurationMinutes: 0,
      updatedAt: new Date(),
    };
  },

  async upsert(
    userId: string,
    dateKey: string,
    patch: Partial<{
      steps: number;
      sensorSteps: number;
      manualSteps: number;
      stepGoal: number;
      waterGlasses: number;
      waterGoal: number;
      exerciseCalories: number;
      exerciseDurationMinutes: number;
    }>
  ): Promise<ActivityEntity> {
    const db = (await ensureDbReady()) as any;
    const current = await this.getByUserAndDate(userId, dateKey);
    const nextSteps =
      patch.steps !== undefined ? Math.max(0, Math.min(200000, Math.round(patch.steps))) : current.steps;
    const nextSensorSteps =
      patch.sensorSteps !== undefined
        ? Math.max(0, Math.min(200000, Math.round(patch.sensorSteps)))
        : current.sensorSteps;
    const nextManualSteps =
      patch.manualSteps !== undefined
        ? Math.max(0, Math.min(200000, Math.round(patch.manualSteps)))
        : current.manualSteps;
    const nextStepGoal =
      patch.stepGoal !== undefined ? Math.max(100, Math.round(patch.stepGoal)) : current.stepGoal;
    const nextWaterGlasses =
      patch.waterGlasses !== undefined
        ? Math.max(0, Math.min(32, Math.round(patch.waterGlasses)))
        : current.waterGlasses;
    const nextWaterGoal =
      patch.waterGoal !== undefined ? Math.max(1, Math.round(patch.waterGoal)) : current.waterGoal;
    const nextExerciseCalories =
      patch.exerciseCalories !== undefined
        ? Math.max(0, Math.round(patch.exerciseCalories))
        : Math.round(nextSteps * 0.04);
    const nextExerciseDuration =
      patch.exerciseDurationMinutes !== undefined
        ? Math.max(0, Math.round(patch.exerciseDurationMinutes))
        : Math.round(nextSteps / 100);

    const now = new Date();
    const rowId = `${userId}::${dateKey}`;

    await db
      .insert(schema.activityStats)
      .values({
        id: rowId,
        userId,
        date: dateKey,
        steps: nextSteps,
        sensorSteps: nextSensorSteps,
        manualSteps: nextManualSteps,
        stepGoal: nextStepGoal,
        waterGlasses: nextWaterGlasses,
        waterGoal: nextWaterGoal,
        exerciseCalories: nextExerciseCalories,
        exerciseDurationMinutes: nextExerciseDuration,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [schema.activityStats.userId, schema.activityStats.date],
        set: {
          steps: nextSteps,
          sensorSteps: nextSensorSteps,
          manualSteps: nextManualSteps,
          stepGoal: nextStepGoal,
          waterGlasses: nextWaterGlasses,
          waterGoal: nextWaterGoal,
          exerciseCalories: nextExerciseCalories,
          exerciseDurationMinutes: nextExerciseDuration,
          updatedAt: now,
        },
      });

    return this.getByUserAndDate(userId, dateKey);
  },

  async listByUser(userId: string): Promise<ActivityEntity[]> {
    const db = (await ensureDbReady()) as any;
    const rows = await db
      .select()
      .from(schema.activityStats)
      .where(eq(schema.activityStats.userId, userId))
      .orderBy(desc(schema.activityStats.date));
    return rows.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      date: r.date,
      steps: Number(r.steps ?? 0),
      sensorSteps: Number(r.sensorSteps ?? 0),
      manualSteps: Number(r.manualSteps ?? 0),
      stepGoal: Number(r.stepGoal ?? 6000),
      waterGlasses: Number(r.waterGlasses ?? 0),
      waterGoal: Number(r.waterGoal ?? 8),
      exerciseCalories: Number(r.exerciseCalories ?? 0),
      exerciseDurationMinutes: Number(r.exerciseDurationMinutes ?? 0),
      updatedAt: r.updatedAt,
    }));
  },
};

// ============================================================================
// 6. SUBSCRIPTION & IDEMPOTENT PAYMENT EVENTS REPOSITORY
// ============================================================================
export const subscriptionRepository = {
  async findByUserId(userId: string): Promise<SubscriptionRecord | null> {
    const db = (await ensureDbReady()) as any;
    const rows = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, userId))
      .limit(1);
    return rows[0] ? mapSubscriptionRow(rows[0]) : null;
  },

  async upsert(record: SubscriptionRecord): Promise<SubscriptionRecord> {
    const db = (await ensureDbReady()) as any;
    const now = record.updatedAt ?? new Date();
    await db
      .insert(schema.subscriptions)
      .values({
        id: record.id || `sub-${record.userId}`,
        userId: record.userId,
        tier: record.tier,
        status: record.status,
        planId: record.planId ?? null,
        billingProvider: record.billingProvider,
        externalSubscriptionId: record.externalSubscriptionId ?? null,
        externalCustomerId: record.externalCustomerId ?? null,
        currentPeriodStart: record.currentPeriodStart ?? now,
        currentPeriodEnd: record.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: Boolean(record.cancelAtPeriodEnd),
        canceledAt: record.canceledAt ?? null,
        metadata: record.metadata ?? {},
        createdAt: record.createdAt ?? now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.subscriptions.userId,
        set: {
          tier: record.tier,
          status: record.status,
          planId: record.planId ?? null,
          billingProvider: record.billingProvider,
          externalSubscriptionId: record.externalSubscriptionId ?? null,
          externalCustomerId: record.externalCustomerId ?? null,
          currentPeriodStart: record.currentPeriodStart ?? now,
          currentPeriodEnd: record.currentPeriodEnd ?? null,
          cancelAtPeriodEnd: Boolean(record.cancelAtPeriodEnd),
          canceledAt: record.canceledAt ?? null,
          metadata: record.metadata ?? {},
          updatedAt: now,
        },
      });
    return (await this.findByUserId(record.userId))!;
  },

  async findPaymentEvent(eventId: string): Promise<PaymentEventRecord | null> {
    const db = (await ensureDbReady()) as any;
    const rows = await db
      .select()
      .from(schema.paymentEvents)
      .where(eq(schema.paymentEvents.eventId, eventId))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      eventId: r.eventId,
      provider: r.provider as BillingProvider,
      eventType: r.eventType,
      userId: r.userId ?? null,
      subscriptionId: r.subscriptionId ?? null,
      payload: (r.payload as Record<string, any>) ?? {},
      processedAt: r.processedAt ? new Date(r.processedAt) : new Date(),
    };
  },

  async recordPaymentEventIdempotent(
    record: PaymentEventRecord
  ): Promise<{ inserted: boolean; existing: PaymentEventRecord }> {
    const db = (await ensureDbReady()) as any;
    const insertedRows = await db
      .insert(schema.paymentEvents)
      .values({
        id: record.id,
        eventId: record.eventId,
        provider: record.provider,
        eventType: record.eventType,
        userId: record.userId ?? null,
        subscriptionId: record.subscriptionId ?? null,
        payload: record.payload ?? {},
        processedAt: record.processedAt ?? new Date(),
      })
      .onConflictDoNothing({ target: schema.paymentEvents.eventId })
      .returning();

    if (insertedRows.length > 0) {
      return { inserted: true, existing: record };
    }
    const existing = await this.findPaymentEvent(record.eventId);
    return { inserted: false, existing: existing ?? record };
  },

  async clearPaymentEvents(): Promise<void> {
    const db = (await ensureDbReady()) as any;
    await db.delete(schema.paymentEvents);
  },
};

// ============================================================================
// 7. MEAL PLAN REPOSITORY
// ============================================================================
export const mealPlanRepository = {
  async getActiveByUserId(userId: string): Promise<MealPlanRecord | null> {
    const db = (await ensureDbReady()) as any;
    const rows = await db
      .select()
      .from(schema.mealPlans)
      .where(and(eq(schema.mealPlans.userId, userId), eq(schema.mealPlans.status, "active")))
      .orderBy(desc(schema.mealPlans.updatedAt))
      .limit(1);

    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      userId: r.userId,
      title: r.title,
      status: r.status as "active" | "archived",
      preferences: r.preferences as MealPlanRecord["preferences"],
      days: r.days as MealPlanRecord["days"],
      summary: r.summary as MealPlanRecord["summary"],
      shoppingList: r.shoppingList as MealPlanRecord["shoppingList"],
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
    };
  },

  async saveActiveForUser(userId: string, plan: MealPlanRecord): Promise<MealPlanRecord> {
    const db = (await ensureDbReady()) as any;
    const now = new Date();
    const planId = `${userId}::active-plan`;

    // Archive any older plans with different IDs for this user
    await db
      .update(schema.mealPlans)
      .set({ status: "archived", updatedAt: now })
      .where(and(eq(schema.mealPlans.userId, userId), eq(schema.mealPlans.status, "active")));

    await db
      .insert(schema.mealPlans)
      .values({
        id: planId,
        userId,
        title: plan.title,
        status: "active",
        preferences: plan.preferences,
        days: plan.days,
        summary: plan.summary,
        shoppingList: plan.shoppingList,
        createdAt: plan.createdAt ? new Date(plan.createdAt) : now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.mealPlans.id,
        set: {
          title: plan.title,
          status: "active",
          preferences: plan.preferences,
          days: plan.days,
          summary: plan.summary,
          shoppingList: plan.shoppingList,
          updatedAt: now,
        },
      });

    const saved = await this.getActiveByUserId(userId);
    return {
      ...saved!,
      id: plan.id || saved!.id,
    };
  },
};

// ============================================================================
// 8. REMINDER SETTINGS REPOSITORY
// ============================================================================
export const reminderRepository = {
  async getByUserId(userId: string): Promise<Record<string, unknown> | null> {
    const db = (await ensureDbReady()) as any;
    const rows = await db
      .select()
      .from(schema.reminderSettings)
      .where(eq(schema.reminderSettings.userId, userId))
      .limit(1);
    return rows[0] ? (rows[0].settings as Record<string, unknown>) : null;
  },

  async saveForUser(userId: string, settings: Record<string, unknown>): Promise<Record<string, unknown>> {
    const db = (await ensureDbReady()) as any;
    const now = new Date();
    await db
      .insert(schema.reminderSettings)
      .values({
        userId,
        settings,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.reminderSettings.userId,
        set: {
          settings,
          updatedAt: now,
        },
      });
    return (await this.getByUserId(userId))!;
  },
};

// ============================================================================
// 9. FAVORITE FOODS REPOSITORY
// ============================================================================
export const favoriteRepository = {
  async listByUser(userId: string): Promise<FavoriteFoodEntity[]> {
    const db = (await ensureDbReady()) as any;
    const rows = await db
      .select()
      .from(schema.userFavorites)
      .where(eq(schema.userFavorites.userId, userId))
      .orderBy(desc(schema.userFavorites.createdAt));
    return rows.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      itemId: r.itemId,
      title: r.title,
      category: r.category,
      calories: Number(r.calories),
      proteinGrams: Number(r.proteinGrams ?? 0),
      carbsGrams: Number(r.carbsGrams ?? 0),
      fatGrams: Number(r.fatGrams ?? 0),
      fiberGrams: Number(r.fiberGrams ?? 0),
      estimatedCostIdr: Number(r.estimatedCostIdr ?? 0),
      imageUrl: r.imageUrl ?? null,
      createdAt: r.createdAt,
    }));
  },

  async upsert(
    userId: string,
    item: {
      itemId: string;
      title: string;
      category: string;
      calories: number;
      proteinGrams?: number;
      carbsGrams?: number;
      fatGrams?: number;
      fiberGrams?: number;
      estimatedCostIdr?: number;
      imageUrl?: string | null;
    }
  ): Promise<FavoriteFoodEntity> {
    const db = (await ensureDbReady()) as any;
    const pk = `${userId}::${item.itemId}`;
    const [saved] = await db
      .insert(schema.userFavorites)
      .values({
        id: pk,
        userId,
        itemId: item.itemId,
        title: item.title,
        category: item.category,
        calories: Math.round(item.calories),
        proteinGrams: Number(item.proteinGrams ?? 0),
        carbsGrams: Number(item.carbsGrams ?? 0),
        fatGrams: Number(item.fatGrams ?? 0),
        fiberGrams: Number(item.fiberGrams ?? 0),
        estimatedCostIdr: Math.round(item.estimatedCostIdr ?? 0),
        imageUrl: item.imageUrl ?? null,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.userFavorites.id,
        set: {
          title: item.title,
          category: item.category,
          calories: Math.round(item.calories),
          proteinGrams: Number(item.proteinGrams ?? 0),
          carbsGrams: Number(item.carbsGrams ?? 0),
          fatGrams: Number(item.fatGrams ?? 0),
          fiberGrams: Number(item.fiberGrams ?? 0),
          estimatedCostIdr: Math.round(item.estimatedCostIdr ?? 0),
          imageUrl: item.imageUrl ?? null,
        },
      })
      .returning();

    return {
      id: saved.id,
      userId: saved.userId,
      itemId: saved.itemId,
      title: saved.title,
      category: saved.category,
      calories: Number(saved.calories),
      proteinGrams: Number(saved.proteinGrams ?? 0),
      carbsGrams: Number(saved.carbsGrams ?? 0),
      fatGrams: Number(saved.fatGrams ?? 0),
      fiberGrams: Number(saved.fiberGrams ?? 0),
      estimatedCostIdr: Number(saved.estimatedCostIdr ?? 0),
      imageUrl: saved.imageUrl ?? null,
      createdAt: saved.createdAt,
    };
  },

  async remove(userId: string, itemId: string): Promise<boolean> {
    const db = (await ensureDbReady()) as any;
    const deleted = await db
      .delete(schema.userFavorites)
      .where(
        and(eq(schema.userFavorites.userId, userId), eq(schema.userFavorites.itemId, itemId))
      )
      .returning();
    return deleted.length > 0;
  },
};
