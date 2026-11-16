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
  if (Platform.OS === "web")
    return typeof localStorage === "undefined" ? null : localStorage.getItem(key);
  return require("expo-secure-store").getItemAsync(key);
}

async function write(key: string, value: string): Promise<void> {
  const { Platform } = require("react-native");
  if (Platform.OS === "web") {
    if (typeof localStorage === "undefined")
      throw new Error("Penyimpanan tidak tersedia.");
    localStorage.setItem(key, value);
  } else {
    await require("expo-secure-store").setItemAsync(key, value);
  }
}

async function load(account: string, date: string): Promise<DailyActivity> {
  const raw = await read(storageKey(account, date));
  if (!raw) return { stats: emptyActivity(), sensorSteps: 0, manualSteps: 0 };
  const day = JSON.parse(raw) as DailyActivity;
  day.stats = ActivityStatsSchema.parse(day.stats);
  if (![day.sensorSteps, day.manualSteps].every((n) => Number.isSafeInteger(n) && n >= 0))
    throw new Error("Data langkah tersimpan tidak valid.");
  return day;
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
        waterGlasses: Math.min(16, day.stats.waterGlasses + glasses),
      },
    })),
  getTrackingEnabled: (account: string) =>
    read(storageKey(account, "tracking")).then((value) => value === "true"),
  setTrackingEnabled: (account: string, enabled: boolean) =>
    write(storageKey(account, "tracking"), String(enabled)),
};
