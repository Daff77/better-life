import { ActivityStatsSchema } from "@/lib/schemas";
import {
  activityDateKey,
  DailyActivity,
  emptyActivity,
  updateStepSource,
} from "@/lib/activityDomain";

function storageKey(account: string, date: string) {
  return `betterlife_activity_v2_${Array.from(account)
    .map((c) => c.codePointAt(0)!.toString(16))
    .join("-")}_${date}`;
}

async function read(key: string): Promise<string | null> {
  const { Platform } = require("react-native");
  if (Platform.OS === "web") {
    const ls =
      typeof localStorage !== "undefined"
        ? localStorage
        : (globalThis as any)?.window?.localStorage;
    return ls ? ls.getItem(key) : null;
  }
  return require("expo-secure-store").getItemAsync(key);
}

async function write(key: string, value: string): Promise<void> {
  const { Platform } = require("react-native");
  if (Platform.OS === "web") {
    const ls =
      typeof localStorage !== "undefined"
        ? localStorage
        : (globalThis as any)?.window?.localStorage;
    if (!ls) throw new Error("Penyimpanan tidak tersedia.");
    ls.setItem(key, value);
  } else {
    await require("expo-secure-store").setItemAsync(key, value);
  }
}

async function load(account: string, date: string): Promise<DailyActivity> {
  const raw = await read(storageKey(account, date));
  if (!raw) {
    try {
      const { sessionStorage } = require("@/lib/sessionStorage");
      const { API_BASE_URL } = require("@/lib/api/config");
      const { notifyUnauthorizedSession } = require("@/lib/authToken");
      const session = await sessionStorage.getSession();
      if (
        session?.token &&
        session.user?.email?.trim().toLowerCase() === account.trim().toLowerCase() &&
        typeof fetch === "function"
      ) {
        const res = await fetch(`${API_BASE_URL}/activity?date=${encodeURIComponent(date)}`, {
          headers: { Authorization: `Bearer ${session.token}` },
        });
        if (res.status === 401) {
          await notifyUnauthorizedSession("Sesi berakhir. Silakan masuk kembali.");
        } else if (res.ok) {
          const remote = await res.json();
          if (remote && (remote.steps > 0 || remote.waterGlasses > 0)) {
            const hydrated: DailyActivity = {
              stats: ActivityStatsSchema.parse({
                steps: remote.steps ?? 0,
                stepGoal: remote.stepGoal ?? 6000,
                waterGlasses: remote.waterGlasses ?? 0,
                waterGoal: remote.waterGoal ?? 8,
              }),
              sensorSteps: remote.sensorSteps ?? 0,
              manualSteps: remote.manualSteps ?? 0,
            };
            await write(storageKey(account, date), JSON.stringify(hydrated));
            return hydrated;
          }
        }
      }
    } catch {
      // Offline or unmocked environment returns empty activity safely
    }
    return { stats: emptyActivity(), sensorSteps: 0, manualSteps: 0 };
  }
  const day = JSON.parse(raw) as DailyActivity;
  day.stats = ActivityStatsSchema.parse(day.stats);
  if (![day.sensorSteps, day.manualSteps].every((n) => Number.isSafeInteger(n) && n >= 0))
    throw new Error("Data langkah tersimpan tidak valid.");
  return day;
}

async function syncActivityToServer(account: string, date: string, day: DailyActivity) {
  try {
    const { sessionStorage } = require("@/lib/sessionStorage");
    const { API_BASE_URL } = require("@/lib/api/config");
    const { notifyUnauthorizedSession } = require("@/lib/authToken");
    const { accountRevision } = require("@/lib/accountScope");
    const expectedRev = accountRevision();
    const session = await sessionStorage.getSession();
    if (!session?.token || expectedRev !== accountRevision()) return;
    if (session.user?.email?.trim().toLowerCase() !== account.trim().toLowerCase()) return;
    if (typeof fetch !== "function") return;

    const res = await fetch(`${API_BASE_URL}/activity`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date,
        steps: day.stats.steps,
        stepGoal: day.stats.stepGoal,
        sensorSteps: day.sensorSteps,
        manualSteps: day.manualSteps,
        waterGlasses: day.stats.waterGlasses,
        waterGoal: day.stats.waterGoal,
      }),
    });
    if (res.status === 401 && expectedRev === accountRevision()) {
      await notifyUnauthorizedSession(expectedRev);
    }
  } catch {
    // Offline safe
  }
}

// Serialize sensor and manual writes so a late read cannot overwrite newer steps or water.
let queue: Promise<unknown> = Promise.resolve();
function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation);
  queue = result.catch(() => undefined);
  return result;
}

function update(
  account: string,
  date: string,
  change: (day: DailyActivity) => DailyActivity
) {
  return serialized(async () => {
    const day = change(await load(account, date));
    await write(storageKey(account, date), JSON.stringify(day));
    void syncActivityToServer(account, date, day);
    return day.stats;
  });
}

export const activityApi = {
  getActivityStats: (account: string, date = activityDateKey()) =>
    serialized(async () => (await load(account, date)).stats),
  getSensorSteps: (account: string, date: string) =>
    serialized(async () => (await load(account, date)).sensorSteps),
  setSensorSteps: (account: string, date: string, total: number) =>
    update(account, date, (day) =>
      updateStepSource(day, "sensor", Math.max(day.sensorSteps, total))
    ),
  setManualSteps: (account: string, date: string, total: number) =>
    update(account, date, (day) => updateStepSource(day, "manual", total)),
  addWater: (account: string, date: string, glasses = 1) =>
    update(account, date, (day) => ({
      ...day,
      stats: {
        ...day.stats,
        waterGlasses: Math.max(0, Math.min(16, day.stats.waterGlasses + glasses)),
      },
    })),
  getTrackingEnabled: (account: string) =>
    read(storageKey(account, "tracking")).then((value) => value === "true"),
  setTrackingEnabled: (account: string, enabled: boolean) =>
    write(storageKey(account, "tracking"), String(enabled)),
};
