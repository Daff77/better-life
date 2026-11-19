import { test, mock } from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

test("Audit Regressions: recipe Bearer auth & offline gating, meal planner profile allergy hydration, blank phone signup, cost scaling, CSV sanitization, and server reset-all", async () => {
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
      if (name === "react-native") {
        return {
          Platform: { OS: "web" },
          Alert: { alert: () => {} },
        };
      }
      if (name === "expo-constants") return { __esModule: true, default: {} };
      return originalLoad.apply(this, [name, ...args]);
    }
  );

  const capturedRequests: Array<{ url: string; init?: RequestInit }> = [];
  let onlineMode = true;

  const fetchMock = mock.method(
    globalThis,
    "fetch",
    async (urlInput: any, init?: RequestInit) => {
      const url = String(urlInput);
      capturedRequests.push({ url, init });

      if (!onlineMode) {
        throw new TypeError("Offline network");
      }

      if (url.endsWith("/auth/register")) {
        const body = JSON.parse(String(init?.body || "{}"));
        return {
          ok: true,
          status: 201,
          json: async () => ({
            token: "jwt-audit-token-123",
            onboardingCompleted: false,
            user: {
              id: "user-audit-1",
              name: body.name,
              email: body.email,
              phone: body.phone ?? "",
            },
          }),
        } as Response;
      }

      if (url.endsWith("/recipes") || url.includes("/recipes/")) {
        const authHeader = (init?.headers as Record<string, string> | undefined)?.Authorization;
        const isAuthed = authHeader === "Bearer jwt-audit-token-123";
        const sample = {
          id: "salmon-bowl",
          title: "Pan-Seared Salmon Bowl",
          description: "Rich omega-3 bowl",
          category: "Dinner",
          calories: 540,
          prepTimeMinutes: 20,
          difficulty: "Medium",
          imageUrl: "https://example.com/salmon.jpg",
          isPremium: true,
          estimatedCostIdr: 45000,
          nutrition: { proteinGrams: 42, carbsGrams: 36, fatGrams: 22, fiberGrams: 6 },
          ingredients: [{ name: "Salmon", amount: "180g" }],
          instructions: isAuthed
            ? [
                { step: 1, text: "Season salmon fillet with sea salt." },
                { step: 2, text: "Sear skin-side down for 4 minutes." },
              ]
            : [{ step: 1, text: "Unlock full chef recipe & timer with Better Life Premium." }],
        };
        return {
          ok: true,
          status: 200,
          json: async () => (url.endsWith("/recipes") ? [sample] : sample),
        } as Response;
      }

      if (url.endsWith("/meal-plans/saved")) {
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: "Not Found" }),
        } as Response;
      }

      if (url.endsWith("/meals/reset-all")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ message: "All logged meals cleared successfully" }),
        } as Response;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response;
    }
  );

  try {
    const { useAuthStore } = await import("../../stores/useAuthStore");
    const { useOnboardingStore } = await import("../../stores/useOnboardingStore");
    const { useSubscriptionStore } = await import("../../stores/useSubscriptionStore");
    const { useMealPlannerStore } = await import("../../stores/useMealPlannerStore");
    const { useJournalStore } = await import("../../stores/useJournalStore");
    const { recipesApi } = await import("../api/recipesApi");
    const { mealsApi } = await import("../api/mealsApi");
    const { analyticsApi } = await import("../api/analyticsApi");
    const { exportAccountBackupJson } = await import("../accountBackup");
    const {
      configureJournalSync,
      clearJournalSyncQueueForCurrentAccount,
      getJournalSyncQueueSnapshot,
    } = await import("../journalSync");
    configureJournalSync({ baseBackoffMs: 10, maxImmediateRetries: 0 });

    // 1. Signup without phone must NOT inject fake "+62 812-0000-0000" and must reject short non-empty phone
    const badPhoneSignup = await useAuthStore.getState().signup({
      name: "Daffa Audit",
      email: "daffa.audit@example.com",
      password: "Password123!",
      phone: "123",
    });
    assert.equal(badPhoneSignup.success, false);

    const okSignup = await useAuthStore.getState().signup({
      name: "Daffa Audit",
      email: "daffa.audit@example.com",
      password: "Password123!",
    });
    assert.equal(okSignup.success, true);

    const registerReq = capturedRequests.find((r) => r.url.endsWith("/auth/register"));
    if (!registerReq) {
      assert.fail("Expected POST /auth/register request");
    }
    const registerBody = JSON.parse(String(registerReq.init?.body));
    assert.equal(registerBody.phone, "");
    assert.equal(useAuthStore.getState().user?.phone, undefined);

    // 2. recipesApi attaches Authorization: Bearer <token> so Premium recipes unlock on server
    const onlineRecipes = await recipesApi.getRecipes();
    assert.equal(onlineRecipes[0].instructions.length, 2);
    const singleRecipe = await recipesApi.getRecipeById("salmon-bowl");
    assert.equal(singleRecipe?.instructions[1]?.text, "Sear skin-side down for 4 minutes.");

    // Offline fallback gates premium instructions when Free, and unlocks when Premium
    onlineMode = false;
    useSubscriptionStore.setState({ isPremium: false });
    const offlineFreeRecipes = await recipesApi.getRecipes();
    const lockedPremium = offlineFreeRecipes.find((r) => r.isPremium);
    if (lockedPremium) {
      assert.equal(lockedPremium.instructions.length, 1);
      assert.match(lockedPremium.instructions[0].text, /Better Life Premium/);
    }

    useSubscriptionStore.setState({ isPremium: true });
    const offlinePremiumRecipes = await recipesApi.getRecipes();
    const unlockedPremium = offlinePremiumRecipes.find((r) => r.isPremium);
    if (unlockedPremium) {
      assert.ok(unlockedPremium.instructions.length >= 2);
    }
    onlineMode = true;

    // 3. Meal Planner hydrates calories, allergies & diet from onboarding personalization when no saved plan exists
    useOnboardingStore.setState({
      personalization: {
        ...useOnboardingStore.getState().personalization,
        targetCalories: 1740,
        dietType: "Vegetarian",
        allergies: ["Peanut", "Shellfish"],
      },
    });
    await useMealPlannerStore.getState().loadSavedPlan();
    const hydratedPrefs = useMealPlannerStore.getState().preferences;
    assert.equal(hydratedPrefs.dailyCalorieTarget, 1740);
    assert.deepEqual(hydratedPrefs.allergies, ["Peanut", "Shellfish"]);
    assert.deepEqual(hydratedPrefs.dietaryRestrictions, ["Vegetarian"]);

    // 4. Meal logging & portion edits preserve and scale estimatedCostIdr + CSV export neutralizes formulas
    onlineMode = false;
    const entry = await useJournalStore.getState().addEntry(
      {
        mealId: "nasi-ayam",
        title: "=SUM(1,2) Nasi Ayam",
        category: "Lunch",
        calories: 500,
        baseCalories: 500,
        quantity: 1,
        proteinGrams: 35,
        carbsGrams: 50,
        fatGrams: 15,
        fiberGrams: 5,
        estimatedCostIdr: 24000,
      },
      "2026-11-18"
    );
    assert.equal(entry.estimatedCostIdr, 24000);

    await useJournalStore.getState().updateEntry(entry.id, { quantity: 1.5 }, "2026-11-18");
    const updatedDay = useJournalStore.getState().getJournal("2026-11-18");
    assert.equal(updatedDay.entries[0].estimatedCostIdr, 36000);

    const csv = await analyticsApi.exportNutritionData("csv");
    assert.equal(typeof csv, "string");
    assert.ok(String(csv).includes("\"'=SUM(1,2) Nasi Ayam\""));

    const backup = await exportAccountBackupJson();
    const parsedBackup = JSON.parse(backup.json);
    assert.equal(parsedBackup.meals[0].estimatedCostIdr, 36000);

    // 5. Reset-all clears pending sync queue and calls POST /meals/reset-all with Bearer token
    const queueBefore = await getJournalSyncQueueSnapshot();
    assert.ok(queueBefore.length > 0);
    await clearJournalSyncQueueForCurrentAccount();
    const queueAfter = await getJournalSyncQueueSnapshot();
    assert.equal(queueAfter.length, 0);

    onlineMode = true;
    await mealsApi.resetMeals();
    const resetReq = capturedRequests.find((r) => r.url.endsWith("/meals/reset-all"));
    if (!resetReq) {
      assert.fail("mealsApi.resetMeals must invoke POST /meals/reset-all");
    }
    assert.equal(
      (resetReq.init?.headers as Record<string, string>)?.Authorization,
      "Bearer jwt-audit-token-123"
    );

    // 6. Tunnel vs LAN vs Web API origin resolution uses HTTPS on tunnels and HTTP on LAN
    const { resolveApiBaseOrigin } = require("../api/config");
    assert.equal(
      resolveApiBaseOrigin({
        platformOS: "android",
        envUrl: "http://localhost:4000",
        hostUri: "abc123-anonymous-8082.exp.direct",
      }),
      "https://abc123-anonymous-8082.exp.direct"
    );
    assert.equal(
      resolveApiBaseOrigin({
        platformOS: "android",
        envUrl: "http://localhost:4000",
        hostUri: "192.168.100.11:8081",
      }),
      "http://192.168.100.11:8081"
    );
    assert.equal(
      resolveApiBaseOrigin({
        platformOS: "web",
        envUrl: "http://localhost:4000",
        webLocation: { hostname: "localhost", origin: "http://localhost:8081" },
      }),
      "http://localhost:4000"
    );
    assert.equal(
      resolveApiBaseOrigin({
        platformOS: "web",
        envUrl: "http://localhost:4000",
        webLocation: {
          hostname: "abc123-anonymous-8082.exp.direct",
          origin: "https://abc123-anonymous-8082.exp.direct",
        },
      }),
      "https://abc123-anonymous-8082.exp.direct"
    );
  } finally {
    fetchMock.mock.restore();
    moduleMock.mock.restore();
    (globalThis as any).window = originalWindow;
  }
});
