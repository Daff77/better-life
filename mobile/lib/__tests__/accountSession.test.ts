import { test, mock } from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

test("verified Google session, onboarding token, account isolation, reload and failure paths", async () => {
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
  const original = loader._load;
  const modules = mock.method(
    loader,
    "_load",
    function (this: unknown, name: string, ...args: unknown[]) {
      if (name === "react-native") return { Platform: { OS: "web" } };
      if (name === "expo-constants") return { __esModule: true, default: {} };
      return original.apply(this, [name, ...args]);
    }
  );
  let email = "alice@gmail.com";
  let reject = false;
  const fetchMock = mock.method(globalThis, "fetch", async (url: any, init: any) => {
    if (String(url).endsWith("/auth/google")) {
      const body = JSON.parse(init.body);
      assert.deepEqual(Object.keys(body), ["idToken"]);
      if (reject) return { ok: false, status: 401 } as Response;
      return {
        ok: true,
        json: async () => ({
          token: `jwt-${email}`,
          user: { id: `server-${email}`, name: "Verified User", email },
        }),
      } as Response;
    }
    return { ok: false, status: 401, json: async () => ({}) } as Response;
  });
  try {
    const { useAuthStore } = require("../../stores/useAuthStore");
    const { useJournalStore } = require("../../stores/useJournalStore");
    const {
      useOnboardingStore,
      DEFAULT_PERSONALIZATION,
    } = require("../../stores/useOnboardingStore");
    const { sessionStorage } = require("../sessionStorage");
    const { activateAccount } = require("../accountLifecycle");
    const { journalStorage } = require("../journalStorage");
    const google = () =>
      useAuthStore
        .getState()
        .loginWithGoogle({
          email: "untrusted@gmail.com",
          name: "Untrusted",
          idToken: "provider-token",
        });
    const missing = await useAuthStore.getState().loginWithGoogle({ email });
    assert.equal(missing.success, false);
    assert.equal(await sessionStorage.getSession(), null);
    reject = true;
    assert.equal((await google()).success, false);
    assert.equal(useAuthStore.getState().isAuthenticated, false);
    reject = false;
    assert.equal((await google()).success, true);
    assert.equal(useAuthStore.getState().user.email, email);
    assert.equal(useAuthStore.getState().user.id, `server-${email}`);
    await useAuthStore.getState().setOnboardingCompleted(true);
    assert.equal((await sessionStorage.getSession()).token, `jwt-${email}`);
    await useJournalStore
      .getState()
      .addEntry({ title: "Alice lunch", category: "Lunch", calories: 400 });
    await sessionStorage.savePersonalization({ ...DEFAULT_PERSONALIZATION, weight: 81 });
    await useAuthStore.getState().logout();
    assert.equal(useJournalStore.getState().getTodayJournal().entries.length, 0);
    assert.equal(
      useOnboardingStore.getState().personalization.weight,
      DEFAULT_PERSONALIZATION.weight
    );
    email = "bob@gmail.com";
    await google();
    assert.equal(useJournalStore.getState().getTodayJournal().entries.length, 0);
    assert.equal(await sessionStorage.getPersonalization(), null);
    await useJournalStore
      .getState()
      .addEntry({ title: "Bob lunch", category: "Lunch", calories: 500 });
    await useAuthStore.getState().logout();
    email = "alice@gmail.com";
    await google();
    assert.deepEqual(
      useJournalStore
        .getState()
        .getTodayJournal()
        .entries.map((e: any) => e.title),
      ["Alice lunch"]
    );
    assert.equal(useOnboardingStore.getState().personalization.weight, 81);
    assert.equal(useAuthStore.getState().onboardingCompleted, true);
    await useAuthStore.getState().initializeAuth();
    assert.equal((await sessionStorage.getSession()).token, `jwt-${email}`);
    assert.equal(useJournalStore.getState().getTodayJournal().entries.length, 1);
    values.set(
      "betterlife_journals_v1",
      JSON.stringify({ secret: { entries: ["unknown-owner"] } })
    );
    await activateAccount("new@gmail.com");
    assert.deepEqual(
      Object.values(await journalStorage.getJournals()).flatMap((d: any) => d.entries),
      []
    );
    assert.ok(values.get("betterlife_journals_v1")?.includes("unknown-owner"));
    const oldRead = journalStorage.getJournals.bind(journalStorage);
    let release: (value: any) => void = () => {};
    let first = true;
    const delayedRead = mock.method(journalStorage, "getJournals", (...args: any[]) => {
      if (first) {
        first = false;
        return new Promise((resolve) => {
          release = resolve;
        });
      }
      return oldRead(...args);
    });
    const oldHydration = useJournalStore.getState().initialize();
    await activateAccount("next@gmail.com");
    release({
      "2026-11-17": {
        date: "2026-11-17",
        targetCalories: 2000,
        entries: [{ title: "stale secret" }],
      },
    });
    await oldHydration;
    assert.equal(
      JSON.stringify(useJournalStore.getState().journals).includes("stale secret"),
      false
    );
    delayedRead.mock.restore();
    assert.equal((await useAuthStore.getState().login("daffa@gmail.com")).success, false);
    assert.equal(
      (await useAuthStore.getState().login("daffa@gmail.com", "password123")).success,
      false
    );
    const journal = useJournalStore.getState();
    const half = await journal.addEntry({ title: "Half serving", category: "Lunch", baseCalories: 400, calories: 200, quantity: 0.5, proteinGrams: 10 });
    await journal.updateEntry(half.id, { title: "Renamed" });
    assert.equal(useJournalStore.getState().getJournal().entries.find((e: { id: string }) => e.id === half.id)?.calories, 200);
    await journal.updateEntry(half.id, { quantity: 1 });
    assert.equal(useJournalStore.getState().getJournal().entries.find((e: { id: string }) => e.id === half.id)?.proteinGrams, 20);
    const { calculatePersonalizedPlan: actualCalculate } = require("../../stores/useOnboardingStore");
    const { calculatePersonalizedPlan: domainCalculate } = require("../nutritionDomain");
    assert.equal(actualCalculate, domainCalculate);
    const { mealPlannerApi } = require("../api/mealPlannerApi");
    const { MOCK_RECIPES } = require("../../data/mockRecipes");
    await assert.rejects(() => mealPlannerApi.generatePlan({ preferredMealSlots: ["Lunch"], allergies: MOCK_RECIPES.flatMap((r: any) => r.ingredients.map((i: any) => i.name)), dietaryRestrictions: [] }), /No recipes/);
    const { subscriptionApi } = require("../api/subscriptionApi");
    await assert.rejects(() => subscriptionApi.checkout("monthly", "stripe", "rejected-token"));
    assert.equal((await subscriptionApi.getStatus()).isPremium, false);
    const { syncJournal } = require("../journalSync");
    const delivered: any[] = [];
    const online = mock.method(globalThis, "fetch", async (url: any, init: any) => {
      delivered.push({ url: String(url), method: init.method, body: init.body ? JSON.parse(init.body) : undefined });
      return { ok: true, status: 200 } as Response;
    });
    try {
      await syncJournal();
      assert.ok(delivered.some(item => item.body?.id === half.id && item.body.quantity === 0.5));
      assert.ok(delivered.some(item => item.body?.id === half.id && item.body.quantity === 1 && item.body.proteinGrams === 20));
      delivered.length = 0;
      await syncJournal();
      assert.equal(delivered.length, 0);
    } finally { online.mock.restore(); }
  } finally {
    modules.mock.restore();
    fetchMock.mock.restore();
    (globalThis as any).window = originalWindow;
  }
});
