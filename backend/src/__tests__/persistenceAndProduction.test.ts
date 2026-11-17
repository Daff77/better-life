import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { spawn, ChildProcess } from "node:child_process";
import { parseEnvironment, isOriginAllowed } from "../config/env.js";

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close((err) => (err ? reject(err) : resolve(port)));
    });
    srv.on("error", reject);
  });
}

async function waitForHealth(baseUrl: string, timeoutMs = 20000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {
      // keep polling until child server listens
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Timed out waiting for backend health at ${baseUrl}`);
}

function startBackendProcess(port: number, dbDir: string): ChildProcess {
  const backendRoot = path.resolve(__dirname, "../..");
  const tsxCli = path.join(backendRoot, "node_modules", "tsx", "dist", "cli.mjs");

  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "development",
    PORT: String(port),
    DATABASE_URL: `pglite://${dbDir}`,
    ENABLE_PAYMENT_SANDBOX: "true",
    JWT_SECRET: "test_persistent_restart_jwt_secret_key_32chars_ok",
  };
  delete childEnv.NODE_TEST_CONTEXT;
  delete childEnv.TEST_DATABASE_URL;

  return spawn(process.execPath, [tsxCli, "src/index.ts"], {
    cwd: backendRoot,
    env: childEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function stopBackendProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
      resolve();
    }, 4000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill("SIGTERM");
  });
}

describe("Database Persistence Across Real Process Restart & Production Config Hardening", () => {
  it("persists accounts, profiles, fractional meals, activity, reminders, favorites, subscriptions & meal plans across process restart with strict user isolation", async () => {
    const tempDbDir = fs.mkdtempSync(path.join(os.tmpdir(), "betterlife-pg-restart-"));
    const port1 = await getFreePort();
    const baseUrl1 = `http://127.0.0.1:${port1}`;

    let proc1: ChildProcess | null = null;
    let proc2: ChildProcess | null = null;

    try {
      proc1 = startBackendProcess(port1, tempDbDir);
      await waitForHealth(baseUrl1);

      // 1. Register User A & User B on Server Process #1
      const regARes = await fetch(`${baseUrl1}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Rina Kusuma",
          email: "rina@example.com",
          phone: "+62811223344",
          password: "SecurePass123!",
        }),
      });
      assert.equal(regARes.status, 201);
      const regAData: any = await regARes.json();
      const tokenA1 = regAData.token;
      const userIdA = regAData.user.id;

      const regBRes = await fetch(`${baseUrl1}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Budi Santoso",
          email: "budi@example.com",
          phone: "+62855667788",
          password: "SecurePass456!",
        }),
      });
      assert.equal(regBRes.status, 201);

      // 2. Save Profile, Fractional Meal, Steps + Water, Reminders, Favorites, Subscription & Meal Plan for User A
      const profRes = await fetch(`${baseUrl1}/api/profile/personalization`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenA1}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          goal: "Lose weight",
          weight: 64.5,
          targetWeight: 58,
          height: 165,
          gender: "Female",
          birthDate: { day: 12, month: "March", year: 1999 },
          cookingSkill: "High",
          dietType: "Omnivore",
          allergies: ["Seafood"],
          targetCalories: 1680,
        }),
      });
      assert.equal(profRes.status, 200);

      const mealRes = await fetch(`${baseUrl1}/api/meals`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA1}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: "entry-shared-id",
          type: "Breakfast",
          name: "Setengah Porsi Oatmeal Berry",
          calories: 160,
          proteinGrams: 11.5,
          carbsGrams: 19.5,
          fatGrams: 3.2,
          fiberGrams: 4.1,
          quantity: 0.5,
          dateKey: "2026-11-18",
        }),
      });
      assert.equal(mealRes.status, 201);

      await fetch(`${baseUrl1}/api/activity/steps`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA1}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ steps: 4500, date: "2026-11-18" }),
      });

      await fetch(`${baseUrl1}/api/activity/water`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA1}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ glasses: 5, date: "2026-11-18" }),
      });

      const remRes = await fetch(`${baseUrl1}/api/profile/reminders`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenA1}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          masterEnabled: true,
          waterReminderEnabled: true,
          morningWaterEnabled: true,
          morningWaterTime: "06:30",
          waterIntervalHours: 2,
          waterStartHour: "07:00",
          waterEndHour: "21:00",
          mealSlots: [
            { id: "breakfast", label: "Sarapan", subtitle: "Pagi", time: "07:15", enabled: true },
            { id: "lunch", label: "Siang", subtitle: "Siang", time: "12:30", enabled: true },
            { id: "snack", label: "Camilan", subtitle: "Sore", time: "16:00", enabled: false },
            { id: "dinner", label: "Malam", subtitle: "Malam", time: "19:00", enabled: true },
          ],
          eveningJournalEnabled: true,
          eveningJournalTime: "20:45",
          weeklyWeightEnabled: true,
          weeklyWeightTime: "07:00",
        }),
      });
      assert.equal(remRes.status, 200);

      const favRes = await fetch(`${baseUrl1}/api/profile/favorites`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA1}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: "parfait",
          title: "Greek Yogurt Berry Bowl",
          category: "Breakfast",
          calories: 320,
          proteinGrams: 22,
          carbsGrams: 38,
          fatGrams: 6,
          fiberGrams: 8,
          estimatedCostIdr: 28000,
        }),
      });
      assert.equal(favRes.status, 201);

      // Activate sandbox subscription & generate meal plan
      const subRes = await fetch(`${baseUrl1}/api/subscription/checkout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA1}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId: "annual", provider: "mock_sandbox" }),
      });
      assert.equal(subRes.status, 200);

      const planRes = await fetch(`${baseUrl1}/api/meal-plans/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenA1}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dailyCalorieTarget: 1680,
          dailyBudgetIdr: 60000,
          allergies: ["Seafood"],
          dietaryRestrictions: [],
          preferredMealSlots: ["Breakfast", "Lunch", "Dinner"],
          mealsPerDay: 3,
        }),
      });
      assert.equal(planRes.status, 201);

      // 3. SHUT DOWN Server Process #1 completely
      await stopBackendProcess(proc1);
      proc1 = null;

      // 4. START fresh Server Process #2 against the same PostgreSQL disk directory
      const port2 = await getFreePort();
      const baseUrl2 = `http://127.0.0.1:${port2}`;
      proc2 = startBackendProcess(port2, tempDbDir);
      await waitForHealth(baseUrl2);

      // 5. Log in as User A on Process #2 and verify ALL data survived restart
      const loginARes = await fetch(`${baseUrl2}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "rina@example.com", password: "SecurePass123!" }),
      });
      assert.equal(loginARes.status, 200);
      const loginAData: any = await loginARes.json();
      assert.equal(loginAData.user.id, userIdA);
      assert.equal(loginAData.onboardingCompleted, true);
      const tokenA2 = loginAData.token;

      const profAfter: any = await (
        await fetch(`${baseUrl2}/api/profile/me`, {
          headers: { Authorization: `Bearer ${tokenA2}` },
        })
      ).json();
      assert.equal(profAfter.profile.weight, 64.5);
      assert.equal(profAfter.profile.targetWeight, 58);
      assert.deepEqual(profAfter.profile.allergies, ["Seafood"]);

      const mealsAfter = (await (
        await fetch(`${baseUrl2}/api/meals?dateKey=2026-11-18`, {
          headers: { Authorization: `Bearer ${tokenA2}` },
        })
      ).json()) as any[];
      assert.equal(mealsAfter.length, 1);
      assert.equal(mealsAfter[0].id, "entry-shared-id");
      assert.equal(mealsAfter[0].quantity, 0.5);
      assert.equal(mealsAfter[0].proteinGrams, 11.5);

      const actAfter: any = await (
        await fetch(`${baseUrl2}/api/activity?date=2026-11-18`, {
          headers: { Authorization: `Bearer ${tokenA2}` },
        })
      ).json();
      assert.equal(actAfter.steps, 4500);
      assert.equal(actAfter.waterGlasses, 5);

      const remAfter: any = await (
        await fetch(`${baseUrl2}/api/profile/reminders`, {
          headers: { Authorization: `Bearer ${tokenA2}` },
        })
      ).json();
      assert.equal(remAfter.settings.morningWaterTime, "06:30");

      const favAfter: any = await (
        await fetch(`${baseUrl2}/api/profile/favorites`, {
          headers: { Authorization: `Bearer ${tokenA2}` },
        })
      ).json();
      assert.equal(favAfter.favorites.length, 1);
      assert.equal(favAfter.favorites[0].itemId, "parfait");

      const subAfter: any = await (
        await fetch(`${baseUrl2}/api/subscription/status`, {
          headers: { Authorization: `Bearer ${tokenA2}` },
        })
      ).json();
      assert.equal(subAfter.isPremium, true);
      assert.equal(subAfter.planId, "annual");

      const planAfter: any = await (
        await fetch(`${baseUrl2}/api/meal-plans/saved`, {
          headers: { Authorization: `Bearer ${tokenA2}` },
        })
      ).json();
      assert.equal(planAfter.days.length, 7);

      // 6. Verify User B is strictly isolated from User A's persisted records
      const loginBRes = await fetch(`${baseUrl2}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "budi@example.com", password: "SecurePass456!" }),
      });
      assert.equal(loginBRes.status, 200);
      const loginBData: any = await loginBRes.json();
      assert.equal(loginBData.onboardingCompleted, false);
      const tokenB2 = loginBData.token;

      const mealsB = (await (
        await fetch(`${baseUrl2}/api/meals`, {
          headers: { Authorization: `Bearer ${tokenB2}` },
        })
      ).json()) as any[];
      assert.equal(mealsB.length, 0);

      // User B logging a meal with the SAME client ID "entry-shared-id" does NOT overwrite User A's meal!
      const bSameIdRes = await fetch(`${baseUrl2}/api/meals`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenB2}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: "entry-shared-id",
          type: "Lunch",
          name: "Nasi Padang Budi",
          calories: 780,
          dateKey: "2026-11-18",
        }),
      });
      assert.equal(bSameIdRes.status, 201);

      const mealsAStillIntact = (await (
        await fetch(`${baseUrl2}/api/meals?dateKey=2026-11-18`, {
          headers: { Authorization: `Bearer ${tokenA2}` },
        })
      ).json()) as any[];
      assert.equal(mealsAStillIntact[0].name, "Setengah Porsi Oatmeal Berry");
      assert.equal(mealsAStillIntact[0].calories, 160);

      // User B cannot restore User A's backup
      const backupA: any = await (
        await fetch(`${baseUrl2}/api/profile/backup`, {
          headers: { Authorization: `Bearer ${tokenA2}` },
        })
      ).json();
      const crossRestoreRes = await fetch(`${baseUrl2}/api/profile/restore`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenB2}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(backupA),
      });
      assert.equal(crossRestoreRes.status, 403);
    } finally {
      if (proc1) await stopBackendProcess(proc1);
      if (proc2) await stopBackendProcess(proc2);
      try {
        fs.rmSync(tempDbDir, { recursive: true, force: true });
      } catch {
        // ignore Windows file lock delay if any
      }
    }
  });

  it("rejects insecure JWT_SECRET and wildcard CORS_ORIGIN in production and enforces origin allowlist", () => {
    assert.throws(
      () =>
        parseEnvironment({
          NODE_ENV: "production",
          JWT_SECRET: "super_secret_better_life_jwt_key_development_only",
          CORS_ORIGIN: "https://app.betterlife.id",
        }),
      /JWT_SECRET/
    );

    assert.throws(
      () =>
        parseEnvironment({
          NODE_ENV: "production",
          JWT_SECRET: "short_secret",
          CORS_ORIGIN: "https://app.betterlife.id",
        }),
      /32 characters/
    );

    assert.throws(
      () =>
        parseEnvironment({
          NODE_ENV: "production",
          JWT_SECRET: "prod_random_unique_secret_key_at_least_32_chars_998877",
          CORS_ORIGIN: "*",
        }),
      /CORS_ORIGIN/
    );

    const validProd = parseEnvironment({
      NODE_ENV: "production",
      JWT_SECRET: "prod_random_unique_secret_key_at_least_32_chars_998877",
      CORS_ORIGIN: "https://app.betterlife.id, https://admin.betterlife.id",
    });

    assert.equal(isOriginAllowed("https://app.betterlife.id", validProd), true);
    assert.equal(isOriginAllowed(undefined, validProd), true); // Native mobile client without Origin
    assert.equal(isOriginAllowed("https://evil.example.com", validProd), false);
    assert.equal(isOriginAllowed("http://localhost:8081", validProd), false);
  });
});
