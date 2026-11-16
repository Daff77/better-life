import { test, mock } from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";
import { activityApi } from "../api/activityApi";

test("daily activity storage isolates accounts, survives repeated reads, serializes writes and reports failures", async () => {
  const data = new Map<string, string>();
  let blocked = false;
  const secureStore = {
    getItemAsync: async (key: string) => data.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      if (blocked) throw new Error("storage unavailable");
      await new Promise((resolve) => setTimeout(resolve, 2));
      data.set(key, value);
    },
  };
  const loader = Module as unknown as {
    _load: (name: string, ...args: unknown[]) => unknown;
  };
  const original = loader._load;
  const replacement = mock.method(
    loader,
    "_load",
    function (this: unknown, name: string, ...args: unknown[]) {
      if (name === "react-native") return { Platform: { OS: "ios" } };
      if (name === "expo-secure-store") return secureStore;
      return original.apply(this, [name, ...args]);
    }
  );
  try {
    await Promise.all([
      activityApi.setSensorSteps("alice", "2026-11-16", 9000),
      activityApi.addWater("alice", "2026-11-16", 1),
      activityApi.addWater("alice", "2026-11-16", 1),
      activityApi.setManualSteps("alice", "2026-11-16", 8500),
    ]);
    let stats = await activityApi.getActivityStats("alice", "2026-11-16");
    assert.equal(stats.steps, 9000);
    assert.equal(stats.waterGlasses, 2);
    assert.equal((await activityApi.getActivityStats("bob", "2026-11-16")).steps, 0);
    assert.equal((await activityApi.getActivityStats("alice", "2026-11-17")).steps, 0);
    await activityApi.setSensorSteps("alice", "2026-11-16", 100);
    assert.equal((await activityApi.getActivityStats("alice", "2026-11-16")).steps, 9000);
    await activityApi.setTrackingEnabled("alice", true);
    assert.equal(await activityApi.getTrackingEnabled("alice"), true);
    assert.equal(await activityApi.getTrackingEnabled("bob"), false);
    assert.ok([...data.values()].some((raw) => raw.includes('"sensorSteps":9000')));
    blocked = true;
    await assert.rejects(
      activityApi.setManualSteps("alice", "2026-11-16", 12000),
      /storage unavailable/
    );
    blocked = false;
    stats = await activityApi.getActivityStats("alice", "2026-11-16");
    assert.equal(stats.steps, 9000);
    await activityApi.setManualSteps("alice", "2026-11-16", 12000);
    assert.equal(
      (await activityApi.getActivityStats("alice", "2026-11-16")).steps,
      12000
    );
  } finally {
    replacement.mock.restore();
  }
});
