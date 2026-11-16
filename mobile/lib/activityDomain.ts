import { ActivityStats, ActivityStatsSchema } from "./schemas";

export function activityDateKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function emptyActivity(): ActivityStats {
  return {
    steps: 0,
    stepGoal: 6000,
    exerciseCalories: 0,
    exerciseDurationMinutes: 0,
    waterGlasses: 0,
    waterGoal: 8,
  };
}

export function withSteps(stats: ActivityStats, steps: number): ActivityStats {
  if (!Number.isSafeInteger(steps) || steps < 0)
    throw new Error("Jumlah langkah harus bilangan bulat positif atau nol.");
  return ActivityStatsSchema.parse({
    ...stats,
    steps,
    exerciseCalories: Math.round(steps * 0.04),
    exerciseDurationMinutes: Math.round(steps / 100),
  });
}

export interface DailyActivity {
  stats: ActivityStats;
  sensorSteps: number;
  manualSteps: number;
}

export function updateStepSource(
  day: DailyActivity,
  source: "sensor" | "manual",
  total: number
): DailyActivity {
  withSteps(day.stats, total);
  const next = { ...day, [source === "sensor" ? "sensorSteps" : "manualSteps"]: total };
  // Manual entries are daily totals and can overlap steps already read from a sensor.
  return {
    ...next,
    stats: withSteps(day.stats, Math.max(next.sensorSteps, next.manualSteps)),
  };
}
