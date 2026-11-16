import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { activityApi } from "@/lib/api/activityApi";
import { activityDateKey, withSteps } from "@/lib/activityDomain";
import { ActivityStats } from "@/lib/schemas";
import { readStepHistory, stepAccess, watchSteps } from "@/lib/stepSensor";
import { useStepTrackerStore } from "@/stores/useStepTrackerStore";
import { activityQueryKey, useActivityIdentity } from "./useActivityQuery";

export function useStepTracking() {
  const { account, date } = useActivityIdentity();
  const client = useQueryClient();
  const requestVersion = useStepTrackerStore((s) => s.requestVersion);
  const command = useStepTrackerStore((s) => s.command);
  const handledRequest = useRef(requestVersion);

  useEffect(() => {
    let disposed = false;
    let generation = 0;
    let subscription: ReturnType<typeof watchSteps> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pendingTotal: number | null = null;
    const isNewRequest = requestVersion !== handledRequest.current;
    let explicitRequest = isNewRequest && command === "enable";
    let disableRequested = isNewRequest && command === "disable";
    let starting = false;
    handledRequest.current = requestVersion;

    const set = (state: Partial<ReturnType<typeof useStepTrackerStore.getState>>) => {
      if (!disposed) useStepTrackerStore.setState(state);
    };
    const fail = () =>
      set({
        status: "error",
        error: "Langkah belum bisa dibaca atau disimpan. Coba lagi.",
      });
    const save = (total: number) =>
      activityApi.setSensorSteps(account, date, total).then((stats) => {
        if (!disposed)
          client.setQueryData(
            activityQueryKey(account, date),
            (previous: ActivityStats | undefined) =>
              withSteps(stats, Math.max(previous?.steps ?? 0, stats.steps))
          );
      });
    const flush = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
      if (pendingTotal !== null) {
        void save(pendingTotal).catch(fail);
        pendingTotal = null;
      }
    };
    const stop = () => {
      generation++;
      subscription?.remove();
      subscription = undefined;
      flush();
    };

    const start = async (request: boolean) => {
      if (starting) return;
      starting = true;
      stop();
      const run = generation;
      const current = () => !disposed && run === generation && activityDateKey() === date;
      try {
        if (disableRequested) {
          await activityApi.setTrackingEnabled(account, false);
          disableRequested = false;
        }
        const enabled = await activityApi.getTrackingEnabled(account);
        if (!current()) return;
        if (!request && !enabled) {
          set({ status: "idle", historyAvailable: false, error: null });
          return;
        }
        if (request) await activityApi.setTrackingEnabled(account, true);
        set({ status: "checking", error: null });
        const access = await stepAccess(request);
        if (!current()) return;
        if (access !== "ready") {
          set({ status: access });
          return;
        }
        await activityApi.setTrackingEnabled(account, true);
        if (!current()) return;

        const end = new Date();
        const midnight = new Date(end);
        midnight.setHours(0, 0, 0, 0);
        let history: number | null = null;
        try {
          history = await readStepHistory(midnight, end, request);
        } catch {
          /* Live sensor still works without a history provider. */
        }
        if (!current()) return;
        const stored = await activityApi.getSensorSteps(account, date);
        if (!current()) return;
        const baseline = Math.max(stored, history ?? 0);
        await save(baseline);
        if (!current()) return;
        if (AppState.currentState !== "active" && AppState.currentState !== null) {
          set({ status: "paused", historyAvailable: history !== null });
          return;
        }
        subscription = watchSteps((count) => {
          if (!current()) return;
          pendingTotal = baseline + count;
          // Update the card immediately; batch durable writes to avoid writing on every step.
          client.setQueryData(
            activityQueryKey(account, date),
            (previous: ActivityStats | undefined) =>
              previous
                ? withSteps(previous, Math.max(previous.steps, pendingTotal!))
                : previous
          );
          if (!timer) timer = setTimeout(flush, 1500);
        });
        set({ status: "tracking", historyAvailable: history !== null });
      } catch {
        if (current()) fail();
      } finally {
        starting = false;
      }
    };

    set({ status: "idle", historyAvailable: false, error: null });
    if (AppState.currentState === "active" || AppState.currentState === null) {
      void start(explicitRequest);
      explicitRequest = false;
    }
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void start(explicitRequest);
        explicitRequest = false;
      } else if (state === "background") {
        // Permission dialogs can background the app. Let that request finish before resubscribing.
        if (!starting) stop();
        set({ status: "paused" });
      }
    });
    return () => {
      disposed = true;
      stop();
      listener.remove();
    };
  }, [account, date, requestVersion, command, client]);
}
