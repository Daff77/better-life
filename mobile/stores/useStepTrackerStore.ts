import { create } from "zustand";
import { StepAccess } from "@/lib/stepSensor";

export type TrackingStatus =
  StepAccess | "idle" | "checking" | "tracking" | "paused" | "error";

export const useStepTrackerStore = create<{
  status: TrackingStatus;
  historyAvailable: boolean;
  error: string | null;
  requestVersion: number;
  command: "enable" | "disable";
  requestTracking: () => void;
  stopTracking: () => void;
}>((set) => ({
  status: "idle",
  historyAvailable: false,
  error: null,
  requestVersion: 0,
  command: "enable",
  requestTracking: () =>
    set((s) => ({ requestVersion: s.requestVersion + 1, command: "enable" })),
  stopTracking: () =>
    set((s) => ({ requestVersion: s.requestVersion + 1, command: "disable" })),
}));
