import { test, mock } from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";
import {
  explainRecipeSelection,
  inspectIngredientsToVerify,
} from "@better-life/shared";

test("Stage 5, Stage 6 & Stage 7: per-account reminders, OS notification scheduler, favorites, adaptive reminders, menu explanations, validated backup/restore, and payment readiness", async () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
    removeItem: (k: string) => {
      values.delete(k);
    },
  };

  const originalWindow = (globalThis as any).window;
  (globalThis as any).window = { localStorage: storage };

  const loader = Module as unknown as {
    _load: (name: string, ...args: unknown[]) => unknown;
  };
  const originalLoad = loader._load;
  const moduleMock = mock.method(
    loader,
    "_load",
    function (this: unknown, name: string, ...args: unknown[]) {
      if (name === "react-native") return { Platform: { OS: "web" } };
      if (name === "expo-constants") return { __esModule: true, default: {} };
      return originalLoad.apply(this, [name, ...args]);
    }
  );

  // Offline fetch mock unless testing subscription readiness
  let plansReadinessPayload: any = null;
  const fetchMock = mock.method(globalThis, "fetch", async (urlInput: any) => {
    const url = String(urlInput);
    if (url.endsWith("/subscription/plans") && plansReadinessPayload) {
      return {
        ok: true,
        status: 200,
        json: async () => plansReadinessPayload,
      } as Response;
    }
    throw new TypeError("Offline");
  });

  try {
    const {
      setNotificationAdapterForTests,
      buildNotificationSpecs,
    } = require("../notificationScheduler");
    const { useReminderStore } = require("../../stores/useReminderStore");
    const { useFavoritesStore } = require("../../stores/useFavoritesStore");
    const { useJournalStore } = require("../../stores/useJournalStore");
    const { useAuthStore } = require("../../stores/useAuthStore");
    const { sessionStorage } = require("../sessionStorage");
    const { activateAccount } = require("../accountLifecycle");
    const { computeAdaptiveReminderInsight } = require("../adaptiveReminderDomain");
    const {
      exportAccountBackupJson,
      restoreAccountBackupJson,
    } = require("../accountBackup");
    const { useSubscriptionStore } = require("../../stores/useSubscriptionStore");

    // 1. Stage 5: Test notificationScheduler cancel & reschedule behavior + per-account isolation
    let cancelCalls = 0;
    let lastScheduledSpecs: any[] = [];
    let mockPerm: "granted" | "denied" | "undetermined" = "granted";

    setNotificationAdapterForTests({
      getPlatformSupport: () => ({
        platform: "android",
        mode: "native_os",
        supportsBackgroundDelivery: true,
        headline: "Aplikasi Native (Android)",
        detail: "Penjadwal sistem operasi aktif.",
      }),
      getPermissionStatus: async () => mockPerm,
      requestPermission: async () => {
        mockPerm = "granted";
        return mockPerm;
      },
      cancelAll: async () => {
        cancelCalls++;
        lastScheduledSpecs = [];
      },
      scheduleSpecs: async (specs: any[]) => {
        cancelCalls++;
        lastScheduledSpecs = specs;
        return specs.length;
      },
    });

    await sessionStorage.saveSession({
      user: { id: "u-ayu", name: "Ayu", email: "ayu@example.com" },
      isAuthenticated: true,
      onboardingCompleted: true,
      token: "token-ayu",
    });
    useAuthStore.setState({
      user: { id: "u-ayu", name: "Ayu", email: "ayu@example.com", isAuthenticated: true },
      isAuthenticated: true,
      onboardingCompleted: true,
      isLoading: false,
    });
    await activateAccount("ayu@example.com");

    const initialScheduledCount = lastScheduledSpecs.length;
    assert.ok(initialScheduledCount > 0, "Granted permission should schedule daily/weekly specs");
    assert.ok(
      lastScheduledSpecs.some((s) => s.key === "weekly-weight-monday" && s.weekday === 2),
      "Weekly weight reminder must schedule on Monday (weekday=2)"
    );

    // Changing Ayu's breakfast time & water interval persists to Ayu's account and reschedules
    const prevCancelCalls = cancelCalls;
    useReminderStore.getState().setMealSlotTime("breakfast", "06:15");
    useReminderStore.getState().setWaterIntervalHours(3);
    await new Promise((r) => setTimeout(r, 30));

    assert.ok(cancelCalls > prevCancelCalls, "Updating time must cancel & reschedule notifications");
    assert.ok(
      lastScheduledSpecs.some(
        (s) => s.key === "meal-breakfast" && s.hour === 6 && s.minute === 15
      )
    );

    // Disabling master switch immediately cancels all scheduled notifications
    useReminderStore.getState().setMasterEnabled(false);
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(lastScheduledSpecs.length, 0);
    assert.equal(buildNotificationSpecs(useReminderStore.getState().getSnapshot()).length, 0);

    // Re-enable for Ayu before switching to Budi
    useReminderStore.getState().setMasterEnabled(true);
    await new Promise((r) => setTimeout(r, 30));

    // Add favorite & journal entry for Ayu
    await useFavoritesStore.getState().toggleFavorite({
      id: "fav-oat-1",
      title: "Overnight Oats Berry",
      category: "Breakfast",
      calories: 310,
      prepTimeMinutes: 5,
      difficulty: "Easy",
      description: "Oat sehat",
      svgIcon: "Breakfast",
      nutrition: { proteinGrams: 14, carbsGrams: 45, fatGrams: 7, fiberGrams: 6 },
      ingredients: [],
      instructions: [],
    });
    assert.equal(useFavoritesStore.getState().isFavorite("fav-oat-1"), true);

    await useJournalStore.getState().addEntry(
      {
        mealId: "fav-oat-1",
        title: "Overnight Oats Berry",
        category: "Breakfast",
        calories: 310,
        proteinGrams: 14,
      },
      "2026-11-18"
    );

    // Switch to Budi -> Budi must NOT see Ayu's 06:15 alarm or Ayu's favorites!
    await sessionStorage.saveSession({
      user: { id: "u-budi", name: "Budi", email: "budi@example.com" },
      isAuthenticated: true,
      onboardingCompleted: true,
      token: "token-budi",
    });
    useAuthStore.setState({
      user: { id: "u-budi", name: "Budi", email: "budi@example.com", isAuthenticated: true },
      isAuthenticated: true,
      onboardingCompleted: true,
      isLoading: false,
    });
    await activateAccount("budi@example.com");

    const budiBreakfast = useReminderStore
      .getState()
      .mealSlots.find((s: any) => s.id === "breakfast");
    assert.equal(budiBreakfast?.time, "07:00", "Account B must keep isolated default 07:00 alarm");
    assert.equal(useFavoritesStore.getState().favorites.length, 0, "Account B must have 0 favorites");

    // Switch back to Ayu -> 06:15 alarm & favorite are intact!
    await sessionStorage.saveSession({
      user: { id: "u-ayu", name: "Ayu", email: "ayu@example.com" },
      isAuthenticated: true,
      onboardingCompleted: true,
      token: "token-ayu",
    });
    useAuthStore.setState({
      user: { id: "u-ayu", name: "Ayu", email: "ayu@example.com", isAuthenticated: true },
      isAuthenticated: true,
      onboardingCompleted: true,
      isLoading: false,
    });
    await activateAccount("ayu@example.com");

    assert.equal(
      useReminderStore.getState().mealSlots.find((s: any) => s.id === "breakfast")?.time,
      "06:15"
    );
    assert.equal(useFavoritesStore.getState().isFavorite("fav-oat-1"), true);
    assert.equal(useJournalStore.getState().getRecentLoggedMeals(5)[0]?.title, "Overnight Oats Berry");

    // 2. Stage 6: Adaptive Reminder based on real logging activity
    const dueInsight = computeAdaptiveReminderInsight({
      journals: useJournalStore.getState().journals,
      mealSlots: useReminderStore.getState().mealSlots,
      masterEnabled: true,
      // 13:30 local -> Breakfast is logged, Lunch (12:30) is 60 min overdue & unlogged!
      now: new Date(2026, 10, 18, 13, 30, 0),
    });
    assert.equal(dueInsight?.kind, "due_slot");
    assert.equal(dueInsight?.slotId, "lunch");

    // Habit shift insight when historical dinner logs average 20:15 vs 19:00 reminder
    const habitInsight = computeAdaptiveReminderInsight({
      journals: {
        "2026-11-16": {
          date: "2026-11-16",
          targetCalories: 2000,
          entries: [
            {
              id: "d1",
              mealId: "m1",
              title: "Sup Ayam",
              category: "Dinner",
              calories: 400,
              baseCalories: 400,
              quantity: 1,
              proteinGrams: 30,
              carbsGrams: 35,
              fatGrams: 10,
              fiberGrams: 4,
              loggedAt: new Date(2026, 10, 16, 20, 15, 0).toISOString(),
            },
          ],
        },
        "2026-11-17": {
          date: "2026-11-17",
          targetCalories: 2000,
          entries: [
            {
              id: "d2",
              mealId: "m1",
              title: "Sup Ayam",
              category: "Dinner",
              calories: 400,
              baseCalories: 400,
              quantity: 1,
              proteinGrams: 30,
              carbsGrams: 35,
              fatGrams: 10,
              fiberGrams: 4,
              loggedAt: new Date(2026, 10, 17, 20, 20, 0).toISOString(),
            },
          ],
        },
      },
      mealSlots: useReminderStore.getState().mealSlots,
      masterEnabled: true,
      now: new Date(2026, 10, 18, 5, 30, 0),
    });
    assert.equal(habitInsight?.kind, "habit_shift");
    assert.equal(habitInsight?.slotId, "dinner");
    assert.equal(habitInsight?.suggestedTime, "20:15");

    // 3. Stage 6: Menu selection explanations & ingredient verification warnings
    const sampleRecipe = {
      id: "r-kecap",
      title: "Ayam Panggang Kecap",
      category: "Lunch",
      calories: 490,
      estimatedCostIdr: 18000,
      nutrition: { proteinGrams: 38, carbsGrams: 42, fatGrams: 14, fiberGrams: 6 },
      ingredients: [
        { name: "Dada ayam tanpa kulit", amount: "150 g" },
        { name: "Kecap manis", amount: "1 sdm" },
        { name: "Saus tiram", amount: "1 sdt" },
      ],
    };
    const reasons = explainRecipeSelection(sampleRecipe, {
      slotCalorieTarget: 500,
      dailyBudgetIdr: 60000,
      allergies: ["Peanut"],
    });
    assert.ok(reasons.length >= 2);
    const toVerify = inspectIngredientsToVerify(sampleRecipe, ["Soy"]);
    assert.ok(
      toVerify.some((item) => item.ingredient.toLowerCase().includes("kecap")),
      "Processed sauces like kecap manis must be flagged in ingredientsToVerify"
    );

    // 4. Stage 6: Export & Restore with format validation, strict account isolation, and duplicate prevention
    const exported = await exportAccountBackupJson();
    assert.ok(exported.json.includes('"schemaVersion": 1'));
    assert.ok(exported.json.includes("ayu@example.com"));

    // Reject malformed JSON
    await assert.rejects(() => restoreAccountBackupJson("{broken-json"), /JSON/i);

    // Reject invalid schema version
    await assert.rejects(
      () =>
        restoreAccountBackupJson(
          JSON.stringify({ schemaVersion: 99, exportedAt: new Date().toISOString() })
        ),
      /skema/i
    );

    // Reject backup belonging to another account!
    const foreignBackup = JSON.parse(exported.json);
    foreignBackup.account.email = "intruder@example.com";
    await assert.rejects(
      () => restoreAccountBackupJson(JSON.stringify(foreignBackup)),
      /akun lain|isolasi/i
    );

    // Restoring Ayu's valid backup into Ayu's account AFTER clearing local state restores entries, and restoring a SECOND time creates ZERO duplicates!
    await useJournalStore.getState().clearDay("2026-11-18");
    assert.equal(useJournalStore.getState().getJournal("2026-11-18").entries.length, 0);

    const firstRestore = await restoreAccountBackupJson(exported.json);
    assert.equal(firstRestore.addedMeals, 1);
    assert.equal(useJournalStore.getState().getJournal("2026-11-18").entries.length, 1);

    const secondRestore = await restoreAccountBackupJson(exported.json);
    assert.equal(secondRestore.addedMeals, 0);
    assert.equal(secondRestore.skippedDuplicateMeals, 1);
    assert.equal(
      useJournalStore.getState().getJournal("2026-11-18").entries.length,
      1,
      "Repeated restore of the same backup must never duplicate journal entries"
    );

    // 5. Stage 7: Payment readiness defaults to unconfigured (canCheckout=false) and never fakes Premium
    plansReadinessPayload = {
      plans: [],
      paymentReadiness: {
        configuredProviders: [],
        stripeConfigured: false,
        sandboxEnabled: false,
        canCheckout: false,
        missingRequirements: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
      },
    };
    await useSubscriptionStore.getState().fetchStatus();
    assert.equal(useSubscriptionStore.getState().isPremium, false);
    assert.equal(useSubscriptionStore.getState().paymentReadiness.canCheckout, false);
    assert.equal(useSubscriptionStore.getState().paymentReadiness.stripeConfigured, false);

    setNotificationAdapterForTests(null);
  } finally {
    setNotificationAdapterForTests_safe();
    moduleMock.mock.restore();
    fetchMock.mock.restore();
    (globalThis as any).window = originalWindow;
  }
});

function setNotificationAdapterForTests_safe() {
  try {
    require("../notificationScheduler").setNotificationAdapterForTests(null);
  } catch {
    // ignore cleanup error
  }
}
