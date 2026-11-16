import { Platform } from "react-native";
import Constants from "expo-constants";
import { Pedometer } from "expo-sensors";

export type StepAccess =
  "ready" | "denied" | "blocked" | "unavailable" | "build-required";

export async function stepAccess(request: boolean): Promise<StepAccess> {
  if (Platform.OS === "web") return "unavailable";
  if (Platform.OS === "android" && Constants.executionEnvironment === "storeClient")
    return "build-required";
  const permission = request
    ? await Pedometer.requestPermissionsAsync()
    : await Pedometer.getPermissionsAsync();
  if (!permission.granted) return permission.canAskAgain ? "denied" : "blocked";
  return (await Pedometer.isAvailableAsync()) ? "ready" : "unavailable";
}

export async function readStepHistory(
  start: Date,
  end: Date,
  request = false
): Promise<number | null> {
  if (Platform.OS === "ios") return (await Pedometer.getStepCountAsync(start, end)).steps;
  if (Platform.OS !== "android" || Constants.executionEnvironment === "storeClient")
    return null;
  // Load only on Android: this module requires a native Health Connect build.
  const health =
    require("react-native-health-connect") as typeof import("react-native-health-connect");
  if (!(await health.initialize())) return null;
  const permissions = request
    ? await health.requestPermission([{ accessType: "read", recordType: "Steps" }])
    : await health.getGrantedPermissions();
  if (!permissions.some((p) => p.accessType === "read" && p.recordType === "Steps"))
    return null;
  const result = await health.aggregateRecord({
    recordType: "Steps",
    timeRangeFilter: {
      operator: "between",
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    },
  });
  return result.COUNT_TOTAL ?? 0;
}

export function watchSteps(callback: (steps: number) => void) {
  return Pedometer.watchStepCount((result) => callback(result.steps));
}
