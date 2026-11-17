import { create } from "zustand";
import { accountRevision, accountStorageKey } from "@/lib/accountScope";
import { getStorageItem, setStorageItem } from "@/lib/journalStorage";
import { sessionStorage } from "@/lib/sessionStorage";
import { API_BASE_URL } from "@/lib/api/config";
import { notifyUnauthorizedSession } from "@/lib/authToken";
import {
  notificationScheduler,
  NotificationPermissionState,
  PlatformNotificationSupport,
  ReminderScheduleConfig,
} from "@/lib/notificationScheduler";

export type WaterIntervalHours = 1 | 2 | 3;

export interface MealReminderSlot {
  id: "breakfast" | "lunch" | "snack" | "dinner";
  label: string;
  subtitle: string;
  time: string;
  enabled: boolean;
}

export type CustomTimeTarget =
  | { kind: "meal"; id: MealReminderSlot["id"]; label: string; time: string }
  | {
      kind: "other";
      key: "morningWaterTime" | "eveningJournalTime" | "weeklyWeightTime";
      label: string;
      time: string;
    };

export interface ReminderSettingsSnapshot extends ReminderScheduleConfig {
  updatedAt?: string;
}

export const DEFAULT_MEAL_REMINDER_SLOTS: MealReminderSlot[] = [
  {
    id: "breakfast",
    label: "Sarapan Pagi",
    subtitle: "Jaga energi awal hari & catat menu sarapan",
    time: "07:00",
    enabled: true,
  },
  {
    id: "lunch",
    label: "Makan Siang",
    subtitle: "Penuhi kebutuhan protein & karbohidrat siang",
    time: "12:30",
    enabled: true,
  },
  {
    id: "snack",
    label: "Camilan Sore",
    subtitle: "Opsi sehat buah atau camilan tinggi serat",
    time: "16:00",
    enabled: false,
  },
  {
    id: "dinner",
    label: "Makan Malam",
    subtitle: "Makan malam seimbang 2–3 jam sebelum tidur",
    time: "19:00",
    enabled: true,
  },
];

export const DEFAULT_REMINDER_SNAPSHOT: ReminderSettingsSnapshot = {
  masterEnabled: true,
  waterReminderEnabled: true,
  morningWaterEnabled: true,
  morningWaterTime: "07:00",
  waterIntervalHours: 2,
  waterStartHour: "07:00",
  waterEndHour: "21:00",
  mealSlots: DEFAULT_MEAL_REMINDER_SLOTS.map((s) => ({ ...s })),
  eveningJournalEnabled: true,
  eveningJournalTime: "21:00",
  weeklyWeightEnabled: true,
  weeklyWeightTime: "07:00",
};

const REMINDER_STORAGE_PREFIX = "betterlife_reminders_v1";

async function readReminderStorage(): Promise<ReminderSettingsSnapshot | null> {
  const key = accountStorageKey(REMINDER_STORAGE_PREFIX);
  try {
    const raw = await getStorageItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.mealSlots)) {
      return null;
    }
    return sanitizeSnapshot(parsed);
  } catch {
    return null;
  }
}

async function writeReminderStorage(snapshot: ReminderSettingsSnapshot): Promise<void> {
  const key = accountStorageKey(REMINDER_STORAGE_PREFIX);
  const raw = JSON.stringify(snapshot);
  try {
    await setStorageItem(key, raw);
  } catch {
    // Non-fatal storage error
  }
}

function isValidHHMM(val: unknown): val is string {
  return typeof val === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(val);
}

export function sanitizeSnapshot(input: Partial<ReminderSettingsSnapshot>): ReminderSettingsSnapshot {
  const incomingSlots = Array.isArray(input.mealSlots) ? input.mealSlots : [];
  const mealSlots: MealReminderSlot[] = DEFAULT_MEAL_REMINDER_SLOTS.map((def) => {
    const match = incomingSlots.find((s) => s?.id === def.id);
    if (!match) return { ...def };
    return {
      id: def.id,
      label: typeof match.label === "string" && match.label.trim() ? match.label : def.label,
      subtitle: typeof match.subtitle === "string" ? match.subtitle : def.subtitle,
      time: isValidHHMM(match.time) ? match.time : def.time,
      enabled: typeof match.enabled === "boolean" ? match.enabled : def.enabled,
    };
  });

  const interval =
    input.waterIntervalHours === 1 || input.waterIntervalHours === 2 || input.waterIntervalHours === 3
      ? input.waterIntervalHours
      : DEFAULT_REMINDER_SNAPSHOT.waterIntervalHours;

  return {
    masterEnabled:
      typeof input.masterEnabled === "boolean"
        ? input.masterEnabled
        : DEFAULT_REMINDER_SNAPSHOT.masterEnabled,
    waterReminderEnabled:
      typeof input.waterReminderEnabled === "boolean"
        ? input.waterReminderEnabled
        : DEFAULT_REMINDER_SNAPSHOT.waterReminderEnabled,
    morningWaterEnabled:
      typeof input.morningWaterEnabled === "boolean"
        ? input.morningWaterEnabled
        : DEFAULT_REMINDER_SNAPSHOT.morningWaterEnabled,
    morningWaterTime: isValidHHMM(input.morningWaterTime)
      ? input.morningWaterTime
      : DEFAULT_REMINDER_SNAPSHOT.morningWaterTime,
    waterIntervalHours: interval,
    waterStartHour: isValidHHMM(input.waterStartHour)
      ? input.waterStartHour
      : DEFAULT_REMINDER_SNAPSHOT.waterStartHour,
    waterEndHour: isValidHHMM(input.waterEndHour)
      ? input.waterEndHour
      : DEFAULT_REMINDER_SNAPSHOT.waterEndHour,
    mealSlots,
    eveningJournalEnabled:
      typeof input.eveningJournalEnabled === "boolean"
        ? input.eveningJournalEnabled
        : DEFAULT_REMINDER_SNAPSHOT.eveningJournalEnabled,
    eveningJournalTime: isValidHHMM(input.eveningJournalTime)
      ? input.eveningJournalTime
      : DEFAULT_REMINDER_SNAPSHOT.eveningJournalTime,
    weeklyWeightEnabled:
      typeof input.weeklyWeightEnabled === "boolean"
        ? input.weeklyWeightEnabled
        : DEFAULT_REMINDER_SNAPSHOT.weeklyWeightEnabled,
    weeklyWeightTime: isValidHHMM(input.weeklyWeightTime)
      ? input.weeklyWeightTime
      : DEFAULT_REMINDER_SNAPSHOT.weeklyWeightTime,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : new Date().toISOString(),
  };
}

function extractSnapshot(state: ReminderState): ReminderSettingsSnapshot {
  return {
    masterEnabled: state.masterEnabled,
    waterReminderEnabled: state.waterReminderEnabled,
    morningWaterEnabled: state.morningWaterEnabled,
    morningWaterTime: state.morningWaterTime,
    waterIntervalHours: state.waterIntervalHours,
    waterStartHour: state.waterStartHour,
    waterEndHour: state.waterEndHour,
    mealSlots: state.mealSlots.map((s) => ({ ...s })),
    eveningJournalEnabled: state.eveningJournalEnabled,
    eveningJournalTime: state.eveningJournalTime,
    weeklyWeightEnabled: state.weeklyWeightEnabled,
    weeklyWeightTime: state.weeklyWeightTime,
    updatedAt: state.updatedAt,
  };
}

async function syncReminderSnapshotToServer(snapshot: ReminderSettingsSnapshot, expectedRevision: number) {
  try {
    const session = await sessionStorage.getSession();
    if (!session?.token || expectedRevision !== accountRevision()) return;
    const res = await fetch(`${API_BASE_URL}/profile/reminders`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(snapshot),
    });
    if (res.status === 401 && expectedRevision === accountRevision()) {
      await notifyUnauthorizedSession("Sesi berakhir. Silakan masuk kembali.");
    }
  } catch {
    // Non-fatal offline state; local account storage retains settings
  }
}

interface ReminderState extends ReminderSettingsSnapshot {
  isHydrated: boolean;
  permissionStatus: NotificationPermissionState;
  platformSupport: PlatformNotificationSupport;
  scheduledCount: number;

  hydrateForAccount: () => Promise<void>;
  resetForLogout: () => Promise<void>;
  requestPermission: () => Promise<NotificationPermissionState>;
  refreshNotificationStatus: () => Promise<void>;
  getSnapshot: () => ReminderSettingsSnapshot;
  applySnapshot: (snapshot: Partial<ReminderSettingsSnapshot>, syncRemote?: boolean) => Promise<void>;

  setMasterEnabled: (enabled: boolean) => void;
  setWaterReminderEnabled: (enabled: boolean) => void;
  setMorningWaterEnabled: (enabled: boolean) => void;
  setWaterIntervalHours: (hours: WaterIntervalHours) => void;
  toggleMealSlot: (id: MealReminderSlot["id"]) => void;
  setMealSlotTime: (id: MealReminderSlot["id"], time: string) => void;
  setOtherReminderTime: (
    key: "morningWaterTime" | "eveningJournalTime" | "weeklyWeightTime",
    time: string
  ) => void;
  setEveningJournalEnabled: (enabled: boolean) => void;
  setWeeklyWeightEnabled: (enabled: boolean) => void;
}

export const useReminderStore = create<ReminderState>((set, get) => {
  const persistAndReschedule = async (nextSnapshot: ReminderSettingsSnapshot) => {
    const rev = accountRevision();
    await writeReminderStorage(nextSnapshot);
    if (rev !== accountRevision()) return;

    const scheduleResult = await notificationScheduler.syncSchedule(nextSnapshot);
    if (rev !== accountRevision()) return;

    set({
      permissionStatus: scheduleResult.permissionStatus,
      scheduledCount: scheduleResult.scheduledCount,
      platformSupport: notificationScheduler.getPlatformSupport(),
    });

    void syncReminderSnapshotToServer(nextSnapshot, rev);
  };

  const mutateSettings = (recipe: (prev: ReminderState) => Partial<ReminderSettingsSnapshot>) => {
    const nextPartial = recipe(get());
    const merged = sanitizeSnapshot({
      ...extractSnapshot(get()),
      ...nextPartial,
      updatedAt: new Date().toISOString(),
    });
    set({ ...merged });
    void persistAndReschedule(merged);
  };

  return {
    ...DEFAULT_REMINDER_SNAPSHOT,
    mealSlots: DEFAULT_MEAL_REMINDER_SLOTS.map((s) => ({ ...s })),
    isHydrated: false,
    permissionStatus: "undetermined",
    platformSupport: notificationScheduler.getPlatformSupport(),
    scheduledCount: 0,

    getSnapshot: () => extractSnapshot(get()),

    hydrateForAccount: async () => {
      const rev = accountRevision();
      await notificationScheduler.cancelAllNotifications();
      if (rev !== accountRevision()) return;

      const local = await readReminderStorage();
      if (rev !== accountRevision()) return;

      let chosen = local ?? sanitizeSnapshot(DEFAULT_REMINDER_SNAPSHOT);

      // Reconcile with server if authenticated
      try {
        const session = await sessionStorage.getSession();
        if (session?.token && rev === accountRevision()) {
          const res = await fetch(`${API_BASE_URL}/profile/reminders`, {
            headers: { Authorization: `Bearer ${session.token}` },
          });
          if (res.status === 401 && rev === accountRevision()) {
            await notifyUnauthorizedSession("Sesi berakhir. Silakan masuk kembali.");
            return;
          }
          if (res.ok && rev === accountRevision()) {
            const payload = await res.json();
            if (payload?.settings) {
              const remote = sanitizeSnapshot(payload.settings);
              const localTs = local?.updatedAt ? Date.parse(local.updatedAt) : 0;
              const remoteTs = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
              if (!local || remoteTs >= localTs) {
                chosen = remote;
                await writeReminderStorage(chosen);
              } else {
                void syncReminderSnapshotToServer(chosen, rev);
              }
            } else if (local) {
              void syncReminderSnapshotToServer(chosen, rev);
            }
          }
        }
      } catch {
        // Offline fallback uses local account-scoped settings
      }

      if (rev !== accountRevision()) return;

      const scheduleResult = await notificationScheduler.syncSchedule(chosen);
      if (rev !== accountRevision()) return;

      set({
        ...chosen,
        isHydrated: true,
        permissionStatus: scheduleResult.permissionStatus,
        scheduledCount: scheduleResult.scheduledCount,
        platformSupport: notificationScheduler.getPlatformSupport(),
      });
    },

    resetForLogout: async () => {
      await notificationScheduler.cancelAllNotifications();
      const fresh = sanitizeSnapshot(DEFAULT_REMINDER_SNAPSHOT);
      set({
        ...fresh,
        isHydrated: false,
        scheduledCount: 0,
        platformSupport: notificationScheduler.getPlatformSupport(),
      });
    },

    requestPermission: async () => {
      const status = await notificationScheduler.requestPermission();
      const snapshot = extractSnapshot(get());
      const scheduleResult = await notificationScheduler.syncSchedule(snapshot);
      set({
        permissionStatus: status,
        scheduledCount: scheduleResult.scheduledCount,
        platformSupport: notificationScheduler.getPlatformSupport(),
      });
      return status;
    },

    refreshNotificationStatus: async () => {
      const snapshot = extractSnapshot(get());
      const scheduleResult = await notificationScheduler.syncSchedule(snapshot);
      set({
        permissionStatus: scheduleResult.permissionStatus,
        scheduledCount: scheduleResult.scheduledCount,
        platformSupport: notificationScheduler.getPlatformSupport(),
      });
    },

    applySnapshot: async (snapshot, syncRemote = true) => {
      const rev = accountRevision();
      const cleaned = sanitizeSnapshot({
        ...extractSnapshot(get()),
        ...snapshot,
        updatedAt: new Date().toISOString(),
      });
      set({ ...cleaned, isHydrated: true });
      await writeReminderStorage(cleaned);
      if (rev !== accountRevision()) return;
      const scheduleResult = await notificationScheduler.syncSchedule(cleaned);
      if (rev !== accountRevision()) return;
      set({
        permissionStatus: scheduleResult.permissionStatus,
        scheduledCount: scheduleResult.scheduledCount,
      });
      if (syncRemote) {
        await syncReminderSnapshotToServer(cleaned, rev);
      }
    },

    setMasterEnabled: (enabled) => mutateSettings(() => ({ masterEnabled: enabled })),
    setWaterReminderEnabled: (enabled) =>
      mutateSettings(() => ({ waterReminderEnabled: enabled })),
    setMorningWaterEnabled: (enabled) =>
      mutateSettings(() => ({ morningWaterEnabled: enabled })),
    setWaterIntervalHours: (hours) => mutateSettings(() => ({ waterIntervalHours: hours })),
    toggleMealSlot: (id) =>
      mutateSettings((state) => ({
        mealSlots: state.mealSlots.map((slot) =>
          slot.id === id ? { ...slot, enabled: !slot.enabled } : slot
        ),
      })),
    setMealSlotTime: (id, time) =>
      mutateSettings((state) => ({
        mealSlots: state.mealSlots.map((slot) =>
          slot.id === id ? { ...slot, time, enabled: true } : slot
        ),
      })),
    setOtherReminderTime: (key, time) =>
      mutateSettings(() => {
        if (key === "morningWaterTime") {
          return { morningWaterTime: time, morningWaterEnabled: true };
        }
        if (key === "eveningJournalTime") {
          return { eveningJournalTime: time, eveningJournalEnabled: true };
        }
        return { weeklyWeightTime: time, weeklyWeightEnabled: true };
      }),
    setEveningJournalEnabled: (enabled) =>
      mutateSettings(() => ({ eveningJournalEnabled: enabled })),
    setWeeklyWeightEnabled: (enabled) =>
      mutateSettings(() => ({ weeklyWeightEnabled: enabled })),
  };
});
