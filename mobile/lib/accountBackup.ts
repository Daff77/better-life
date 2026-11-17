import { z } from "zod";
import { formatLocalDateKey } from "@better-life/shared";
import { PersonalizationSchema, DailyJournal, JournalEntry } from "@/lib/schemas";
import { sessionStorage } from "@/lib/sessionStorage";
import { journalStorage } from "@/lib/journalStorage";
import { API_BASE_URL } from "@/lib/api/config";
import { notifyUnauthorizedSession } from "@/lib/authToken";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import { useJournalStore } from "@/stores/useJournalStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useReminderStore } from "@/stores/useReminderStore";
import { useCustomRecipesStore } from "@/stores/useCustomRecipesStore";

const BackupReminderSlotSchema = z.object({
  id: z.enum(["breakfast", "lunch", "snack", "dinner"]),
  label: z.string().min(1).max(80),
  subtitle: z.string().max(160),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  enabled: z.boolean(),
});

const BackupReminderSchema = z.object({
  masterEnabled: z.boolean(),
  waterReminderEnabled: z.boolean(),
  morningWaterEnabled: z.boolean(),
  morningWaterTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  waterIntervalHours: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  waterStartHour: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  waterEndHour: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  mealSlots: z.array(BackupReminderSlotSchema).min(1).max(8),
  eveningJournalEnabled: z.boolean(),
  eveningJournalTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  weeklyWeightEnabled: z.boolean(),
  weeklyWeightTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  updatedAt: z.string().optional(),
});

const BackupFavoriteSchema = z.object({
  itemId: z.string().min(1).max(200),
  title: z.string().min(1).max(160),
  category: z.enum(["Breakfast", "Lunch", "Dinner", "Snack", "Drink"]),
  calories: z.number().nonnegative(),
  proteinGrams: z.number().nonnegative().default(0),
  carbsGrams: z.number().nonnegative().default(0),
  fatGrams: z.number().nonnegative().default(0),
  fiberGrams: z.number().nonnegative().default(0),
  estimatedCostIdr: z.number().nonnegative().optional().default(0),
  imageUrl: z.string().max(2000).optional().nullable(),
  savedAt: z.string().optional(),
});

const BackupMealRecordSchema = z.object({
  id: z.string().min(1).max(200),
  mealId: z.string().optional(),
  type: z.enum(["Breakfast", "Lunch", "Dinner", "Snack", "Drink"]),
  name: z.string().min(1).max(200),
  calories: z.number().nonnegative(),
  baseCalories: z.number().nonnegative().optional(),
  proteinGrams: z.number().nonnegative().default(0),
  carbsGrams: z.number().nonnegative().default(0),
  fatGrams: z.number().nonnegative().default(0),
  fiberGrams: z.number().nonnegative().default(0),
  estimatedCostIdr: z.number().nonnegative().default(0),
  quantity: z.number().positive().default(1),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().optional(),
  loggedAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const AccountBackupSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  account: z.object({
    email: z.string().email(),
    name: z.string().optional(),
  }),
  personalization: PersonalizationSchema.partial().optional().nullable(),
  reminders: BackupReminderSchema.optional().nullable(),
  favorites: z.array(BackupFavoriteSchema).optional().default([]),
  meals: z.array(BackupMealRecordSchema).optional().default([]),
  customRecipes: z.array(z.any()).optional().default([]),
  activities: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        steps: z.number().int().min(0).max(200000).default(0),
        sensorSteps: z.number().int().min(0).max(200000).optional(),
        manualSteps: z.number().int().min(0).max(200000).optional(),
        stepGoal: z.number().int().min(100).max(200000).default(6000),
        waterGlasses: z.number().int().min(0).max(32).default(0),
        waterGoal: z.number().int().min(1).max(32).default(8),
      })
    )
    .optional()
    .default([]),
});

export type AccountBackupPayload = z.infer<typeof AccountBackupSchema>;

export interface RestoreResultSummary {
  addedMeals: number;
  updatedMeals: number;
  skippedDuplicateMeals: number;
  addedFavorites: number;
  addedCustomRecipes: number;
  updatedPersonalization: boolean;
  updatedReminders: boolean;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function semanticMealFingerprint(entry: {
  title: string;
  category: string;
  calories: number;
  loggedAt?: string;
}): string {
  const minuteBucket = entry.loggedAt ? entry.loggedAt.slice(0, 16) : "";
  return `${entry.category.toLowerCase()}::${entry.title.trim().toLowerCase()}::${Math.round(
    entry.calories
  )}::${minuteBucket}`;
}

export async function buildAccountBackupPayload(): Promise<AccountBackupPayload> {
  const authUser = useAuthStore.getState().user;
  const session = await sessionStorage.getSession();
  const activeEmail = authUser?.email || session?.user?.email;

  if (!activeEmail) {
    throw new Error("Silakan masuk ke akun terlebih dahulu sebelum mengekspor data.");
  }

  const personalization = useOnboardingStore.getState().personalization;
  const reminders = useReminderStore.getState().getSnapshot();
  const favorites = useFavoritesStore.getState().favorites;
  const journals = useJournalStore.getState().journals;
  const customRecipes = useCustomRecipesStore.getState().customRecipes;

  const meals: AccountBackupPayload["meals"] = [];
  for (const [dateKey, day] of Object.entries(journals)) {
    for (const entry of day.entries || []) {
      meals.push({
        id: entry.id,
        mealId: entry.mealId,
        type: entry.category,
        name: entry.title,
        calories: entry.calories,
        baseCalories: entry.baseCalories,
        proteinGrams: entry.proteinGrams ?? 0,
        carbsGrams: entry.carbsGrams ?? 0,
        fatGrams: entry.fatGrams ?? 0,
        fiberGrams: entry.fiberGrams ?? 0,
        estimatedCostIdr: 0,
        quantity: entry.quantity ?? 1,
        dateKey,
        loggedAt: entry.loggedAt,
        updatedAt: entry.updatedAt ?? entry.loggedAt,
      });
    }
  }

  let activities: AccountBackupPayload["activities"] = [];
  if (session?.token) {
    try {
      const res = await fetch(`${API_BASE_URL}/profile/backup`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.status === 401) {
        await notifyUnauthorizedSession("Sesi berakhir. Silakan masuk kembali.");
      } else if (res.ok) {
        const remote = await res.json();
        if (Array.isArray(remote?.activities)) {
          activities = remote.activities;
        }
      }
    } catch {
      // Offline export still works from local account stores
    }
  }

  const payload: AccountBackupPayload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    account: {
      email: normalizeEmail(activeEmail),
      name: authUser?.name || session?.user?.name,
    },
    personalization,
    reminders,
    favorites: favorites.map((f) => ({
      itemId: f.itemId,
      title: f.title,
      category: f.category,
      calories: f.calories,
      proteinGrams: f.proteinGrams,
      carbsGrams: f.carbsGrams,
      fatGrams: f.fatGrams,
      fiberGrams: f.fiberGrams,
      estimatedCostIdr: f.estimatedCostIdr ?? 0,
      imageUrl: f.imageUrl ?? null,
      savedAt: f.savedAt,
    })),
    meals,
    customRecipes,
    activities,
  };

  return AccountBackupSchema.parse(payload);
}

export async function exportAccountBackupJson(): Promise<{
  json: string;
  filename: string;
  downloadedOnWeb: boolean;
}> {
  const payload = await buildAccountBackupPayload();
  const json = JSON.stringify(payload, null, 2);
  const dateTag = formatLocalDateKey();
  const filename = `better-life-backup-${dateTag}.json`;

  let downloadedOnWeb = false;
  let isWeb = false;
  try {
    isWeb = require("react-native")?.Platform?.OS === "web";
  } catch {
    isWeb = typeof document !== "undefined";
  }
  if (isWeb && typeof document !== "undefined" && typeof Blob !== "undefined") {
    try {
      const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.setAttribute("download", filename);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      downloadedOnWeb = true;
    } catch {
      downloadedOnWeb = false;
    }
  }

  return { json, filename, downloadedOnWeb };
}

export async function restoreAccountBackupJson(rawJson: string): Promise<RestoreResultSummary> {
  const authUser = useAuthStore.getState().user;
  const session = await sessionStorage.getSession();
  const activeEmail = authUser?.email || session?.user?.email;

  if (!activeEmail) {
    throw new Error("Silakan masuk ke akun terlebih dahulu sebelum memulihkan cadangan.");
  }

  if (!rawJson || !rawJson.trim()) {
    throw new Error("Data cadangan kosong. Tempel atau pilih file JSON cadangan Better Life.");
  }

  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(rawJson);
  } catch {
    throw new Error("Format file tidak valid: bukan dokumen JSON yang utuh.");
  }

  const validation = AccountBackupSchema.safeParse(parsedRaw);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0];
    const field = firstIssue?.path?.join(".") || "dokumen";
    throw new Error(
      `Format cadangan tidak sesuai skema Better Life v1 (bagian: ${field}).`
    );
  }

  const payload = validation.data;
  if (normalizeEmail(payload.account.email) !== normalizeEmail(activeEmail)) {
    throw new Error(
      `Cadangan ini milik akun lain (${payload.account.email}) dan ditolak demi isolasi data akun Anda.`
    );
  }

  let updatedPersonalization = false;
  if (payload.personalization && payload.personalization.weight && payload.personalization.height) {
    const saveRes = await useOnboardingStore.getState().savePersonalization(payload.personalization);
    updatedPersonalization = saveRes.success;
  }

  let updatedReminders = false;
  if (payload.reminders) {
    await useReminderStore.getState().applySnapshot(payload.reminders, false);
    updatedReminders = true;
  }

  const addedFavorites = await useFavoritesStore
    .getState()
    .mergeFromBackup(payload.favorites || [], false);

  // Merge custom recipes without duplicates
  let addedCustomRecipes = 0;
  if (Array.isArray(payload.customRecipes) && payload.customRecipes.length > 0) {
    const currentRecipes = useCustomRecipesStore.getState().customRecipes;
    const existingRecipeIds = new Set(currentRecipes.map((r) => r.id));
    for (const r of payload.customRecipes) {
      if (r && typeof r.id === "string" && typeof r.title === "string" && !existingRecipeIds.has(r.id)) {
        existingRecipeIds.add(r.id);
        await useCustomRecipesStore.getState().addCustomRecipe({
          id: r.id,
          title: r.title,
          category: r.category || "Lunch",
          calories: Number(r.calories) || 250,
          prepTimeMinutes: Number(r.prepTimeMinutes) || 15,
          difficulty: r.difficulty || "Easy",
          description: r.description || "",
          svgIcon: r.svgIcon || "Lunch",
          estimatedCostIdr: r.estimatedCostIdr,
          imageUrl: r.imageUrl,
          nutrition: r.nutrition || {
            proteinGrams: 10,
            carbsGrams: 25,
            fatGrams: 8,
            fiberGrams: 3,
          },
          ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
          instructions: Array.isArray(r.instructions) ? r.instructions : [],
        });
        addedCustomRecipes++;
      }
    }
  }

  // Merge journals idempotently without creating duplicates
  const currentJournals = { ...useJournalStore.getState().journals };
  const targetKcal = useOnboardingStore.getState().personalization.targetCalories || 2000;
  let addedMeals = 0;
  let updatedMeals = 0;
  let skippedDuplicateMeals = 0;

  const touchedDates = new Set<string>();

  for (const m of payload.meals || []) {
    const normalizedCategory =
      m.type === "Drink" ? "Snack" : m.type;
    const day: DailyJournal = currentJournals[m.dateKey]
      ? {
          ...currentJournals[m.dateKey],
          entries: [...currentJournals[m.dateKey].entries],
        }
      : {
          date: m.dateKey,
          targetCalories: targetKcal,
          entries: [],
        };

    const incomingEntry: JournalEntry = {
      id: m.id,
      mealId: m.mealId || m.id,
      title: m.name,
      category: normalizedCategory,
      calories: Math.round(m.calories),
      baseCalories:
        m.baseCalories !== undefined
          ? m.baseCalories
          : m.quantity > 0
          ? Math.round((m.calories / m.quantity) * 100) / 100
          : Math.round(m.calories),
      quantity: m.quantity,
      proteinGrams: m.proteinGrams,
      carbsGrams: m.carbsGrams,
      fatGrams: m.fatGrams,
      fiberGrams: m.fiberGrams,
      loggedAt: m.loggedAt || new Date().toISOString(),
      updatedAt: m.updatedAt || m.loggedAt || new Date().toISOString(),
    };

    const existingIdIdx = day.entries.findIndex((e) => e.id === incomingEntry.id);
    if (existingIdIdx >= 0) {
      const existing = day.entries[existingIdIdx];
      const existingTs = Date.parse(existing.updatedAt || existing.loggedAt || "") || 0;
      const incomingTs = Date.parse(incomingEntry.updatedAt || incomingEntry.loggedAt || "") || 0;
      if (incomingTs > existingTs) {
        day.entries[existingIdIdx] = incomingEntry;
        updatedMeals++;
        touchedDates.add(m.dateKey);
      } else {
        skippedDuplicateMeals++;
      }
      currentJournals[m.dateKey] = day;
      continue;
    }

    const incomingFp = semanticMealFingerprint(incomingEntry);
    const hasSemanticDuplicate = day.entries.some(
      (e) => semanticMealFingerprint(e) === incomingFp
    );
    if (hasSemanticDuplicate) {
      skippedDuplicateMeals++;
      continue;
    }

    day.entries.push(incomingEntry);
    currentJournals[m.dateKey] = day;
    addedMeals++;
    touchedDates.add(m.dateKey);
  }

  for (const dateKey of touchedDates) {
    await journalStorage.saveDailyJournal(currentJournals[dateKey]);
  }
  useJournalStore.setState({ journals: currentJournals });

  // Also restore to server if authenticated
  if (session?.token) {
    try {
      const currentYear = new Date().getFullYear();
      const serverPayload = {
        schemaVersion: 1 as const,
        exportedAt: payload.exportedAt,
        account: payload.account,
        personalization: payload.personalization?.weight
          ? {
              goal: payload.personalization.goal ?? "Eat balanced",
              weight: payload.personalization.weight,
              targetWeight: payload.personalization.targetWeight,
              height: payload.personalization.height ?? 170,
              gender: payload.personalization.gender ?? "Male",
              birthDate: payload.personalization.birthDate,
              age: payload.personalization.birthDate?.year
                ? currentYear - payload.personalization.birthDate.year
                : 25,
              targetCalories: payload.personalization.targetCalories ?? targetKcal,
              dietType: payload.personalization.dietType ?? "Omnivore",
              cookingSkill: payload.personalization.cookingSkill ?? "Middle",
              allergies: payload.personalization.allergies ?? [],
              onboardingCompleted: true,
            }
          : null,
        reminders: payload.reminders ?? null,
        favorites: payload.favorites ?? [],
        meals: payload.meals ?? [],
        activities: payload.activities ?? [],
      };

      const res = await fetch(`${API_BASE_URL}/profile/restore`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serverPayload),
      });
      if (res.status === 401) {
        await notifyUnauthorizedSession("Sesi berakhir. Silakan masuk kembali.");
      }
    } catch {
      // Offline restore succeeded locally; journal sync handles future online reconciliation
    }
  }

  return {
    addedMeals,
    updatedMeals,
    skippedDuplicateMeals,
    addedFavorites,
    addedCustomRecipes,
    updatedPersonalization,
    updatedReminders,
  };
}
