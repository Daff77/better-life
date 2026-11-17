import { test, mock } from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

function makeJwtWithExp(expSeconds: number, email = "user@example.com"): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ userId: "u-1", email, exp: expSeconds })).toString(
    "base64url"
  );
  return `${header}.${payload}.sig`;
}

test("Stage 2 & Stage 3: server-authoritative auth, password hygiene, token expiry, sync timeout/backoff, permanent error isolation, account switch, LWW conflict, and sync-safe undo", async () => {
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

  // Seed legacy storage containing plaintext passwords to prove sanitizeLegacyStorage scrubs them
  values.set(
    "betterlife_registered_accounts_v1",
    JSON.stringify([
      {
        id: "legacy-1",
        name: "Legacy User",
        email: "legacy@example.com",
        password: "SuperSecretPlainPassword123!",
        onboardingCompleted: true,
      },
    ])
  );

  const serverMealsByUser = new Map<string, Map<string, any>>();
  let signupMode: "reject_409" | "network_fail" | "ok" = "reject_409";
  let nextPostBehavior: "ok" | "timeout_once" | "reject_bad_payload" = "ok";
  let timeoutTriggered = false;
  let holdInFlightSync: (() => void) | null = null;
  let inFlightStarted: (() => void) | null = null;
  let authMeUnauthorized = false;

  const fetchMock = mock.method(globalThis, "fetch", async (urlInput: any, init: any = {}) => {
    const url = String(urlInput);
    const method = (init.method || "GET").toUpperCase();
    const authHeader = init.headers?.Authorization || init.headers?.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (url.endsWith("/auth/register") && method === "POST") {
      if (signupMode === "network_fail") {
        throw new TypeError("Failed to fetch");
      }
      if (signupMode === "reject_409") {
        return {
          ok: false,
          status: 409,
          json: async () => ({ error: "Conflict", message: "Email already exists" }),
        } as Response;
      }
      const body = JSON.parse(init.body);
      const validToken = makeJwtWithExp(Math.floor(Date.now() / 1000) + 3600, body.email);
      return {
        ok: true,
        status: 201,
        json: async () => ({
          token: validToken,
          user: {
            id: `srv-${body.email}`,
            name: body.name,
            email: body.email,
          },
        }),
      } as Response;
    }

    if (url.endsWith("/auth/login") && method === "POST") {
      const body = JSON.parse(init.body);
      if (body.password !== "ValidPass123!") {
        return {
          ok: false,
          status: 401,
          json: async () => ({ error: "Unauthorized", message: "Invalid credentials" }),
        } as Response;
      }
      const email = body.email || "rina@example.com";
      const validToken = makeJwtWithExp(Math.floor(Date.now() / 1000) + 3600, email);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          token: validToken,
          onboardingCompleted: true,
          user: {
            id: `srv-${email}`,
            name: "Rina Server",
            email,
          },
        }),
      } as Response;
    }

    if (url.endsWith("/auth/me")) {
      if (authMeUnauthorized) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ error: "Unauthorized", message: "Token expired" }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          user: { id: "srv-rina@example.com", name: "Rina Server", email: "rina@example.com" },
          onboardingCompleted: true,
        }),
      } as Response;
    }

    if (url.includes("/meals") && method === "POST" && !url.endsWith("/meals/reset")) {
      if (holdInFlightSync) {
        if (inFlightStarted) inFlightStarted();
        await new Promise<void>((resolve) => {
          const prev = holdInFlightSync;
          holdInFlightSync = () => {
            if (prev) prev();
            resolve();
          };
          if (init.signal) {
            init.signal.addEventListener("abort", () => resolve(), { once: true });
          }
        });
        if (init.signal?.aborted) {
          const abortErr = new Error("Aborted");
          abortErr.name = "AbortError";
          throw abortErr;
        }
      }

      if (nextPostBehavior === "timeout_once" && !timeoutTriggered) {
        timeoutTriggered = true;
        await new Promise<void>((_resolve, reject) => {
          if (init.signal) {
            init.signal.addEventListener(
              "abort",
              () => {
                const err = new Error("The operation was aborted.");
                err.name = "AbortError";
                reject(err);
              },
              { once: true }
            );
          }
        });
      }

      const body = JSON.parse(init.body);
      if (body.name === "__INVALID_SERVER_PAYLOAD__") {
        return {
          ok: false,
          status: 400,
          json: async () => ({ error: "Validation Error", message: "Invalid meal name" }),
        } as Response;
      }

      const userBucket = serverMealsByUser.get(token) ?? new Map<string, any>();
      serverMealsByUser.set(token, userBucket);
      userBucket.set(body.id, {
        ...body,
        loggedAt: body.loggedAt || new Date().toISOString(),
        updatedAt: body.updatedAt || new Date().toISOString(),
      });
      return {
        ok: true,
        status: 201,
        json: async () => userBucket.get(body.id),
      } as Response;
    }

    if (url.endsWith("/meals/reset") && method === "POST") {
      const body = JSON.parse(init.body);
      const userBucket = serverMealsByUser.get(token);
      if (userBucket) {
        for (const [k, v] of userBucket.entries()) {
          if (v.dateKey === body.dateKey) userBucket.delete(k);
        }
      }
      return { ok: true, status: 200, json: async () => ({ deletedCount: 1 }) } as Response;
    }

    if (url.includes("/meals/") && method === "DELETE") {
      const id = decodeURIComponent(url.split("/meals/")[1]);
      const userBucket = serverMealsByUser.get(token);
      userBucket?.delete(id);
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }

    if (url.endsWith("/meals") && method === "GET") {
      const userBucket = serverMealsByUser.get(token);
      return {
        ok: true,
        status: 200,
        json: async () => ({ meals: userBucket ? Array.from(userBucket.values()) : [] }),
      } as Response;
    }

    return { ok: true, status: 200, json: async () => ({}) } as Response;
  });

  try {
    const { useAuthStore } = require("../../stores/useAuthStore");
    const { sessionStorage } = require("../sessionStorage");
    const { useJournalStore, getTodayDateKey } = require("../../stores/useJournalStore");
    const {
      configureJournalSync,
      syncJournal,
      retryJournalSync,
      dismissFailedJournalSync,
      useJournalSyncStore,
      reconcileJournalsWithServer,
    } = require("../journalSync");

    configureJournalSync({
      requestTimeoutMs: 45,
      baseBackoffMs: 20,
      maxBackoffMs: 60,
      maxImmediateRetries: 2,
    });

    // 1. Legacy plaintext password scrubbing
    await useAuthStore.getState().initializeAuth();
    const allStoredRaw = Array.from(values.values()).join(" ");
    assert.equal(
      allStoredRaw.includes("SuperSecretPlainPassword123!"),
      false,
      "Plaintext legacy password must be completely scrubbed from device storage"
    );

    // 2. Rejected signup (409) & offline signup MUST NOT create a session
    signupMode = "reject_409";
    const rejectedSignup = await useAuthStore.getState().signup({
      name: "Rina",
      email: "rina@example.com",
      password: "ValidPass123!",
    });
    assert.equal(rejectedSignup.success, false);
    assert.equal(useAuthStore.getState().isAuthenticated, false);
    assert.equal(await sessionStorage.getSession(), null);

    signupMode = "network_fail";
    const offlineSignup = await useAuthStore.getState().signup({
      name: "Rina",
      email: "rina@example.com",
      password: "ValidPass123!",
    });
    assert.equal(offlineSignup.success, false);
    assert.equal(useAuthStore.getState().isAuthenticated, false);
    assert.equal(await sessionStorage.getSession(), null);

    // 3. Successful server signup stores server identity & token, NEVER raw password, and preserves session after onboarding
    signupMode = "ok";
    const okSignup = await useAuthStore.getState().signup({
      name: "Rina",
      email: "rina@example.com",
      password: "ValidPass123!",
    });
    assert.equal(okSignup.success, true);
    assert.equal(useAuthStore.getState().user.id, "srv-rina@example.com");
    assert.equal(
      Array.from(values.values()).join(" ").includes("ValidPass123!"),
      false,
      "Raw password must never be persisted to client storage"
    );

    const signupToken = (await sessionStorage.getSession()).token;
    assert.ok(signupToken.includes("."));
    await useAuthStore.getState().setOnboardingCompleted(true);
    assert.equal((await sessionStorage.getSession()).token, signupToken);
    assert.equal(useAuthStore.getState().onboardingCompleted, true);

    // 4. Expired JWT is detected and cleared on initializeAuth
    const expiredToken = makeJwtWithExp(Math.floor(Date.now() / 1000) - 120, "rina@example.com");
    await sessionStorage.saveSession({
      user: useAuthStore.getState().user,
      isAuthenticated: true,
      onboardingCompleted: true,
      token: expiredToken,
    });
    await useAuthStore.getState().initializeAuth();
    assert.equal(useAuthStore.getState().isAuthenticated, false);
    assert.ok(useAuthStore.getState().sessionNotice?.includes("kedaluwarsa"));

    // 5. Re-login via server & test timeout + exponential backoff + idempotency (no duplicates!)
    const loginRes = await useAuthStore.getState().login("rina@example.com", "ValidPass123!");
    assert.equal(loginRes.success, true);
    const activeToken = (await sessionStorage.getSession()).token;

    nextPostBehavior = "timeout_once";
    timeoutTriggered = false;
    const timeoutEntry = await useJournalStore.getState().addEntry({
      title: "Oatmeal Pisang",
      category: "Breakfast",
      calories: 320,
      proteinGrams: 12,
    });
    assert.equal(timeoutTriggered, true, "First request should time out via AbortController");
    const serverEntriesAfterRetry = Array.from(serverMealsByUser.get(activeToken)?.values() ?? []);
    assert.equal(
      serverEntriesAfterRetry.filter((m) => m.id === timeoutEntry.id).length,
      1,
      "Idempotent retry after timeout must create exactly 1 server record without duplicates"
    );
    assert.equal(useJournalSyncStore.getState().status, "synced");

    // 6. Permanent 400 error on one invalid operation MUST NOT block subsequent valid operations!
    nextPostBehavior = "ok";
    await syncJournal({
      path: "/meals",
      method: "POST",
      body: {
        id: "bad-op-1",
        name: "__INVALID_SERVER_PAYLOAD__",
        type: "Lunch",
        calories: 100,
        dateKey: getTodayDateKey(),
      },
    });
    assert.equal(useJournalSyncStore.getState().status, "failed");
    assert.equal(useJournalSyncStore.getState().permanentFailedCount, 1);

    const validAfterBad = await useJournalStore.getState().addEntry({
      title: "Ayam Bakar Madu",
      category: "Lunch",
      calories: 480,
      proteinGrams: 38,
    });
    assert.equal(
      serverMealsByUser.get(activeToken)?.has(validAfterBad.id),
      true,
      "Subsequent valid journal entry must still sync even when an earlier invalid item failed permanently"
    );

    // Dismissing permanent failed item restores clean 'synced' status
    await dismissFailedJournalSync();
    assert.equal(useJournalSyncStore.getState().status, "synced");

    // 7. Sync-safe Undo for delete & clearDay
    await useJournalStore.getState().removeEntry(validAfterBad.id);
    assert.equal(serverMealsByUser.get(activeToken)?.has(validAfterBad.id), false);
    assert.ok(useJournalStore.getState().lastUndoAction);
    await useJournalStore.getState().undoLastAction();
    assert.equal(
      serverMealsByUser.get(activeToken)?.has(validAfterBad.id),
      true,
      "Undoing entry deletion must restore entry both locally and on server"
    );

    await useJournalStore.getState().clearDay();
    assert.equal(useJournalStore.getState().getTodayJournal().entries.length, 0);
    assert.equal((serverMealsByUser.get(activeToken)?.size ?? 0), 0);
    await useJournalStore.getState().undoLastAction();
    assert.equal(useJournalStore.getState().getTodayJournal().entries.length, 2);
    assert.equal(serverMealsByUser.get(activeToken)?.size, 2);

    // 8. Explicit multi-device LWW conflict resolution
    const today = getTodayDateKey();
    const localNewerIso = new Date(Date.now() + 60_000).toISOString();
    const remoteOlderIso = new Date(Date.now() - 60_000).toISOString();
    const remoteNewerIso = new Date(Date.now() + 120_000).toISOString();

    const { merged: reconciled } = reconcileJournalsWithServer(
      {
        [today]: {
          date: today,
          targetCalories: 2000,
          entries: [
            {
              id: "shared-1",
              mealId: "m1",
              title: "Versi Lokal Lebih Baru",
              category: "Lunch",
              calories: 450,
              baseCalories: 450,
              quantity: 1,
              proteinGrams: 30,
              carbsGrams: 40,
              fatGrams: 12,
              fiberGrams: 5,
              loggedAt: remoteOlderIso,
              updatedAt: localNewerIso,
            },
            {
              id: "shared-2",
              mealId: "m2",
              title: "Versi Lokal Lama",
              category: "Dinner",
              calories: 300,
              baseCalories: 300,
              quantity: 1,
              proteinGrams: 20,
              carbsGrams: 30,
              fatGrams: 8,
              fiberGrams: 3,
              loggedAt: remoteOlderIso,
              updatedAt: remoteOlderIso,
            },
          ],
        },
      },
      [
        {
          id: "shared-1",
          name: "Versi Server Lama",
          type: "Lunch",
          calories: 400,
          quantity: 1,
          dateKey: today,
          loggedAt: remoteOlderIso,
          updatedAt: remoteOlderIso,
        },
        {
          id: "shared-2",
          name: "Versi Perangkat Lain Lebih Baru",
          type: "Dinner",
          calories: 520,
          quantity: 1,
          dateKey: today,
          loggedAt: remoteOlderIso,
          updatedAt: remoteNewerIso,
        },
        {
          id: "deleted-locally",
          name: "Sudah Dihapus Lokal",
          type: "Snack",
          calories: 150,
          quantity: 1,
          dateKey: today,
          loggedAt: remoteOlderIso,
          updatedAt: remoteNewerIso,
        },
      ],
      [
        {
          opId: "del-1",
          kind: "delete",
          dateKey: today,
          entryId: "deleted-locally",
          path: "/meals/deleted-locally",
          method: "DELETE",
          createdAt: localNewerIso,
          updatedAt: localNewerIso,
          attempts: 0,
          nextRetryAt: 0,
          status: "pending",
          permanentFailure: false,
        },
      ],
      2000
    );

    const mergedEntries = reconciled[today].entries;
    assert.equal(
      mergedEntries.find((e: any) => e.id === "shared-1")?.title,
      "Versi Lokal Lebih Baru",
      "Newer local edit must win over older server state"
    );
    assert.equal(
      mergedEntries.find((e: any) => e.id === "shared-2")?.title,
      "Versi Perangkat Lain Lebih Baru",
      "Newer remote device edit must win over older local state"
    );
    assert.equal(
      mergedEntries.some((e: any) => e.id === "deleted-locally"),
      false,
      "Pending local delete must suppress stale server resurrection"
    );

    // 9. Mid-flight account switch aborts active request and isolates account queues
    let resolveStarted!: () => void;
    const startedPromise = new Promise<void>((r) => {
      resolveStarted = r;
    });
    inFlightStarted = resolveStarted;
    holdInFlightSync = () => {};

    const slowSyncPromise = useJournalStore.getState().addEntry({
      title: "Menu Saat Pindah Akun",
      category: "Snack",
      calories: 180,
    });

    await startedPromise;
    // Switch account by logging out while request is still in-flight!
    await useAuthStore.getState().logout();
    holdInFlightSync = null;
    inFlightStarted = null;
    await slowSyncPromise;

    assert.equal(
      useJournalStore.getState().getTodayJournal().entries.length,
      0,
      "Logged-out state must never show entries from the previous account's in-flight operation"
    );

    // 10. Server 401 unauthorized response cleanly logs out active session
    await useAuthStore.getState().login("rina@example.com", "ValidPass123!");
    assert.equal(useAuthStore.getState().isAuthenticated, true);
    authMeUnauthorized = true;
    const { notifyUnauthorizedSession } = require("../authToken");
    await notifyUnauthorizedSession();
    assert.equal(useAuthStore.getState().isAuthenticated, false);
    assert.ok(useAuthStore.getState().sessionNotice);

    // Retry helper sanity check
    authMeUnauthorized = false;
    await retryJournalSync();
  } finally {
    moduleMock.mock.restore();
    fetchMock.mock.restore();
    (globalThis as any).window = originalWindow;
  }
});
