import { test, mock } from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";
import {
  formatLocalDateKey,
  buildLocalDateWindow,
  checkRecipeAllergies,
  checkRecipeDietaryRestrictions,
  filterEligibleRecipes,
} from "@better-life/shared";

test("Stage 4: offline custom analytics range, midnight calendar boundary, shared allergy/diet strictness, fractional portions, and over-target calories", async () => {
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

  // Force offline mode so analyticsApi uses local offline engine
  const fetchMock = mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Offline network");
  });

  try {
    const { activateAccount } = require("../accountLifecycle");
    const { useJournalStore, computeJournalAggregates } = require("../../stores/useJournalStore");
    const { analyticsApi } = require("../api/analyticsApi");
    const { mealPlannerApi } = require("../api/mealPlannerApi");
    const { MOCK_RECIPES } = require("../../data/mockRecipes");

    await activateAccount("dina@example.com");

    // 1. Midnight boundary check: 2026-11-18 00:15:00 local time (when UTC may still be 2026-11-17)
    const justAfterMidnightLocal = new Date(2026, 10, 18, 0, 15, 0);
    assert.equal(
      formatLocalDateKey(justAfterMidnightLocal),
      "2026-11-18",
      "Local calendar date key after midnight must never regress to previous UTC date"
    );
    const window7d = buildLocalDateWindow("7d", undefined, undefined, justAfterMidnightLocal);
    assert.equal(window7d.length, 7);
    assert.equal(window7d[0], "2026-11-12");
    assert.equal(window7d[6], "2026-11-18");

    // 2. Seed offline journal entries across specific dates and verify custom range filtering
    await useJournalStore.getState().addEntry(
      {
        title: "Bubur Ayam",
        category: "Breakfast",
        calories: 350,
        proteinGrams: 20,
        carbsGrams: 42,
        fatGrams: 9,
      },
      "2026-11-05"
    );
    await useJournalStore.getState().addEntry(
      {
        title: "Nasi Merah Ikan Bakar",
        category: "Lunch",
        calories: 540,
        proteinGrams: 42,
        carbsGrams: 55,
        fatGrams: 14,
      },
      "2026-11-11"
    );
    await useJournalStore.getState().addEntry(
      {
        title: "Capcay Tahu",
        category: "Dinner",
        calories: 410,
        proteinGrams: 22,
        carbsGrams: 38,
        fatGrams: 12,
      },
      "2026-11-13"
    );

    const customReport = await analyticsApi.getAdvancedAnalytics(
      "custom",
      "2026-11-10",
      "2026-11-14",
      justAfterMidnightLocal
    );
    assert.equal(customReport.startDate, "2026-11-10");
    assert.equal(customReport.endDate, "2026-11-14");
    assert.equal(customReport.dailyTrends.length, 5);
    assert.equal(
      customReport.consistency.loggedDaysCount,
      2,
      "Offline custom range must include 2026-11-11 and 2026-11-13 while excluding out-of-range 2026-11-05"
    );
    assert.equal(customReport.summary.totalCalories, 950);

    // Inverted custom range must be rejected explicitly
    await assert.rejects(
      () =>
        analyticsApi.getAdvancedAnalytics(
          "custom",
          "2026-11-18",
          "2026-11-10",
          justAfterMidnightLocal
        ),
      /Tanggal mulai|melebihi/i
    );

    // 3. Shared allergy & dietary restriction rules (bilingual & strict non-relaxation)
    const eggShrimpRecipe = {
      id: "r-test-1",
      title: "Nasi Goreng Udang Telur",
      category: "Dinner",
      calories: 520,
      ingredients: [
        { name: "Udang kupas segar", amount: "80 g" },
        { name: "Telur ayam", amount: "1 butir" },
        { name: "Nasi putih", amount: "150 g" },
      ],
    };
    assert.equal(checkRecipeAllergies(eggShrimpRecipe, ["Shellfish"]).safe, false);
    assert.equal(checkRecipeAllergies(eggShrimpRecipe, ["Udang"]).safe, false);
    assert.equal(checkRecipeAllergies(eggShrimpRecipe, ["Egg"]).safe, false);
    assert.equal(checkRecipeDietaryRestrictions(eggShrimpRecipe, ["Vegan"]).compliant, false);
    assert.equal(checkRecipeDietaryRestrictions(eggShrimpRecipe, ["Vegetarian"]).compliant, false);

    // Non-relaxation: when user allergies exclude all recipes, filterEligibleRecipes returns [] and mealPlannerApi rejects instead of serving unsafe meals
    const allIngredientNames = MOCK_RECIPES.flatMap((r: any) =>
      r.ingredients.map((i: any) => i.name)
    );
    const filtered = filterEligibleRecipes(MOCK_RECIPES, {
      allergies: allIngredientNames,
      dietaryRestrictions: ["Vegan"],
    });
    assert.equal(filtered.length, 0);
    await assert.rejects(
      () =>
        mealPlannerApi.generatePlan({
          preferredMealSlots: ["Breakfast", "Lunch", "Dinner"],
          allergies: allIngredientNames,
          dietaryRestrictions: ["Vegan"],
        }),
      /No recipes/i
    );

    // 4. Fractional portions, title-only rename without calorie drift, and over-target negative remainingCalories
    const fracDate = "2026-11-18";
    await useJournalStore.getState().setTargetCalories(1000, fracDate);
    const entry = await useJournalStore.getState().addEntry(
      {
        title: "Tempe Panggang",
        category: "Lunch",
        baseCalories: 333,
        calories: Math.round(333 * 0.5),
        quantity: 0.5,
        proteinGrams: 11.5,
        carbsGrams: 14,
        fatGrams: 6.5,
      },
      fracDate
    );

    // Title-only edit must NOT drift calories or macros
    await useJournalStore
      .getState()
      .updateEntry(entry.id, { title: "Tempe Panggang Kecap" }, fracDate);
    let updated = useJournalStore
      .getState()
      .getJournal(fracDate)
      .entries.find((e: any) => e.id === entry.id);
    assert.equal(updated.title, "Tempe Panggang Kecap");
    assert.equal(updated.calories, 167);
    assert.equal(updated.proteinGrams, 11.5);

    // Fractional portion scaling to 1.5x (3x of 0.5x) must scale from base without rounding drift
    await useJournalStore.getState().updateEntry(entry.id, { quantity: 1.5 }, fracDate);
    updated = useJournalStore
      .getState()
      .getJournal(fracDate)
      .entries.find((e: any) => e.id === entry.id);
    assert.equal(updated.calories, Math.round(333 * 1.5)); // 500
    assert.equal(updated.proteinGrams, 34.5);

    // Add second meal to exceed 1000 kcal target -> remainingCalories must be signed negative (-150)
    await useJournalStore.getState().addEntry(
      {
        title: "Steak Sapi",
        category: "Dinner",
        calories: 650,
        proteinGrams: 48,
      },
      fracDate
    );
    const agg = computeJournalAggregates(useJournalStore.getState().getJournal(fracDate), 1000);
    assert.equal(agg.totalConsumed, 1150);
    assert.equal(
      agg.remainingCalories,
      -150,
      "Over-target intake must produce negative remainingCalories (-150)"
    );
  } finally {
    moduleMock.mock.restore();
    fetchMock.mock.restore();
    (globalThis as any).window = originalWindow;
  }
});
