import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activityDateKey,
  emptyActivity,
  updateStepSource,
  withSteps,
} from "../activityDomain";

test("daily keys use the local calendar and roll over at midnight", () => {
  assert.equal(activityDateKey(new Date(2026, 10, 16, 23, 59, 59)), "2026-11-16");
  assert.equal(activityDateKey(new Date(2026, 10, 17, 0, 0, 0)), "2026-11-17");
});

test("step totals exceed the goal and old 8000 cap while keeping exercise metrics consistent", () => {
  const stats = withSteps(emptyActivity(), 12345);
  assert.equal(stats.steps, 12345);
  assert.equal(stats.exerciseCalories, 494);
  assert.equal(stats.exerciseDurationMinutes, 123);
  assert.equal(stats.stepGoal, 6000);
});

test("manual daily total and overlapping sensor history are not added together", () => {
  let day = { stats: emptyActivity(), sensorSteps: 0, manualSteps: 0 };
  day = updateStepSource(day, "manual", 4350);
  day = updateStepSource(day, "sensor", 4200);
  assert.equal(day.stats.steps, 4350);
  day = updateStepSource(day, "sensor", 6200);
  assert.equal(day.stats.steps, 6200);
  day = updateStepSource(day, "manual", 6200);
  assert.equal(day.stats.steps, 6200);
});

test("manual corrections preserve sensor steps and water", () => {
  let day = {
    stats: { ...emptyActivity(), waterGlasses: 3 },
    sensorSteps: 0,
    manualSteps: 0,
  };
  day = updateStepSource(day, "sensor", 2000);
  day = updateStepSource(day, "manual", 7000);
  day = updateStepSource(day, "manual", 0);
  assert.equal(day.stats.steps, 2000);
  assert.equal(day.stats.waterGlasses, 3);
});

test("invalid sensor and manual counts are rejected", () => {
  for (const count of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() =>
      updateStepSource(
        { stats: emptyActivity(), sensorSteps: 0, manualSteps: 0 },
        "sensor",
        count
      )
    );
  }
});
