import { test, mock } from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

test("sensor access handles web, Expo Go, permission denial, native history and listener cleanup", async () => {
  const platform = { OS: "web" };
  const constants = { executionEnvironment: "standalone" };
  let permission = { granted: true, canAskAgain: true };
  let available = true;
  let permissionRequests = 0;
  let removed = false;
  let callback: ((result: { steps: number }) => void) | undefined;
  let historyRequest: unknown;
  let healthPermission = false;
  const pedometer = {
    requestPermissionsAsync: async () => {
      permissionRequests++;
      return permission;
    },
    getPermissionsAsync: async () => permission,
    isAvailableAsync: async () => available,
    getStepCountAsync: async (start: Date, end: Date) => {
      historyRequest = { start, end };
      return { steps: 4567 };
    },
    watchStepCount: (handler: typeof callback) => {
      callback = handler;
      return {
        remove: () => {
          removed = true;
        },
      };
    },
  };
  const health = {
    initialize: async () => true,
    getGrantedPermissions: async () =>
      healthPermission ? [{ accessType: "read", recordType: "Steps" }] : [],
    requestPermission: async (requested: unknown) => {
      assert.deepEqual(requested, [{ accessType: "read", recordType: "Steps" }]);
      healthPermission = true;
      return [{ accessType: "read", recordType: "Steps" }];
    },
    aggregateRecord: async (request: unknown) => {
      historyRequest = request;
      return { COUNT_TOTAL: 6789 };
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
      if (name === "react-native") return { Platform: platform };
      if (name === "expo-constants") return { __esModule: true, default: constants };
      if (name === "expo-sensors") return { Pedometer: pedometer };
      if (name === "react-native-health-connect") return health;
      return original.apply(this, [name, ...args]);
    }
  );
  try {
    const sensor = require("../stepSensor") as typeof import("../stepSensor");
    assert.equal(await sensor.stepAccess(true), "unavailable");
    platform.OS = "android";
    constants.executionEnvironment = "storeClient";
    assert.equal(await sensor.stepAccess(true), "build-required");
    assert.equal(permissionRequests, 0);
    constants.executionEnvironment = "standalone";
    permission = { granted: false, canAskAgain: true };
    assert.equal(await sensor.stepAccess(true), "denied");
    permission.canAskAgain = false;
    assert.equal(await sensor.stepAccess(false), "blocked");
    permission.granted = true;
    available = false;
    assert.equal(await sensor.stepAccess(false), "unavailable");
    available = true;
    assert.equal(await sensor.stepAccess(false), "ready");
    const start = new Date(2026, 10, 16, 0);
    const end = new Date(2026, 10, 16, 12);
    assert.equal(await sensor.readStepHistory(start, end), null);
    assert.equal(await sensor.readStepHistory(start, end, true), 6789);
    assert.deepEqual(historyRequest, {
      recordType: "Steps",
      timeRangeFilter: {
        operator: "between",
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });
    platform.OS = "ios";
    assert.equal(await sensor.readStepHistory(start, end), 4567);
    assert.deepEqual(historyRequest, { start, end });
    let observed = 0;
    const subscription = sensor.watchSteps((count) => {
      observed = count;
    });
    callback!({ steps: 42 });
    assert.equal(observed, 42);
    subscription.remove();
    assert.equal(removed, true);
  } finally {
    replacement.mock.restore();
  }
});
