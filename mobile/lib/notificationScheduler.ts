function getPlatformOS(): "ios" | "android" | "web" {
  try {
    const os = require("react-native")?.Platform?.OS;
    if (os === "ios" || os === "android" || os === "web") return os;
  } catch {
    // Fallback to web in Node test runners
  }
  return "web";
}

export interface SchedulableMealSlot {
  id: "breakfast" | "lunch" | "snack" | "dinner";
  label: string;
  subtitle: string;
  time: string;
  enabled: boolean;
}

export interface ReminderScheduleConfig {
  masterEnabled: boolean;
  waterReminderEnabled: boolean;
  morningWaterEnabled: boolean;
  morningWaterTime: string;
  waterIntervalHours: 1 | 2 | 3;
  waterStartHour: string;
  waterEndHour: string;
  mealSlots: SchedulableMealSlot[];
  eveningJournalEnabled: boolean;
  eveningJournalTime: string;
  weeklyWeightEnabled: boolean;
  weeklyWeightTime: string;
}

export type NotificationPermissionState = "granted" | "denied" | "undetermined" | "unsupported";

export interface PlatformNotificationSupport {
  platform: "ios" | "android" | "web";
  mode: "native_os" | "native_expo_go" | "web_browser" | "unsupported";
  supportsBackgroundDelivery: boolean;
  headline: string;
  detail: string;
}

export interface ScheduledNotificationSpec {
  key: string;
  title: string;
  body: string;
  kind: "daily" | "weekly";
  hour: number;
  minute: number;
  /** 1 = Minggu, 2 = Senin (sesuai standar kalender expo-notifications) */
  weekday?: number;
}

export interface NotificationAdapter {
  getPlatformSupport: () => PlatformNotificationSupport;
  getPermissionStatus: () => Promise<NotificationPermissionState>;
  requestPermission: () => Promise<NotificationPermissionState>;
  cancelAll: () => Promise<void>;
  scheduleSpecs: (specs: ScheduledNotificationSpec[]) => Promise<number>;
}

function parseTimeString(value: string): { hour: number; minute: number } {
  const [rawH, rawM] = (value || "07:00").split(":");
  const hour = Math.max(0, Math.min(23, parseInt(rawH || "7", 10) || 0));
  const minute = Math.max(0, Math.min(59, parseInt(rawM || "0", 10) || 0));
  return { hour, minute };
}

/**
 * Pure schedule builder tested directly by unit tests.
 * Produces deterministic daily & weekly notification triggers from reminder settings.
 */
export function buildNotificationSpecs(config: ReminderScheduleConfig): ScheduledNotificationSpec[] {
  if (!config.masterEnabled) {
    return [];
  }

  const specs: ScheduledNotificationSpec[] = [];
  const morningTime = parseTimeString(config.morningWaterTime);

  if (config.morningWaterEnabled) {
    specs.push({
      key: "morning-water",
      title: "Waktunya minum air pagi",
      body: "Awali hari dengan 1 gelas air putih (250 ml) untuk hidrasi optimal.",
      kind: "daily",
      hour: morningTime.hour,
      minute: morningTime.minute,
    });
  }

  if (config.waterReminderEnabled) {
    const start = parseTimeString(config.waterStartHour);
    const end = parseTimeString(config.waterEndHour);
    const step = config.waterIntervalHours;
    for (let h = start.hour; h <= end.hour; h += step) {
      const collidesWithMorning =
        config.morningWaterEnabled && h === morningTime.hour && start.minute === morningTime.minute;
      if (collidesWithMorning) continue;
      specs.push({
        key: `water-interval-${String(h).padStart(2, "0")}-${String(start.minute).padStart(2, "0")}`,
        title: "Pengingat minum berkala",
        body: "Minum 1 gelas air (250 ml) agar target hidrasi harian tercapai.",
        kind: "daily",
        hour: h,
        minute: start.minute,
      });
    }
  }

  for (const slot of config.mealSlots) {
    if (!slot.enabled) continue;
    const t = parseTimeString(slot.time);
    specs.push({
      key: `meal-${slot.id}`,
      title: `Pengingat ${slot.label}`,
      body: `${slot.subtitle}. Jangan lupa catat porsinya di Jurnal Better Life.`,
      kind: "daily",
      hour: t.hour,
      minute: t.minute,
    });
  }

  if (config.eveningJournalEnabled) {
    const t = parseTimeString(config.eveningJournalTime);
    specs.push({
      key: "evening-journal",
      title: "Evaluasi jurnal malam",
      body: "Periksa kelengkapan catatan makan hari ini sebelum istirahat.",
      kind: "daily",
      hour: t.hour,
      minute: t.minute,
    });
  }

  if (config.weeklyWeightEnabled) {
    const t = parseTimeString(config.weeklyWeightTime);
    specs.push({
      key: "weekly-weight-monday",
      title: "Timbang berat badan mingguan",
      body: "Catat berat badan terbaru untuk memantau progres menuju target Anda.",
      kind: "weekly",
      weekday: 2, // Senin
      hour: t.hour,
      minute: t.minute,
    });
  }

  return specs;
}

/* --------------------------------------------------- Web In-Tab Timer Pool */

const activeWebTimers = new Set<ReturnType<typeof setTimeout>>();

function clearWebTimers() {
  for (const handle of activeWebTimers) {
    clearTimeout(handle);
  }
  activeWebTimers.clear();
}

function msUntilNextOccurrence(spec: ScheduledNotificationSpec, now = new Date()): number {
  const target = new Date(now);
  target.setSeconds(0, 0);
  target.setHours(spec.hour, spec.minute, 0, 0);

  if (spec.kind === "weekly" && spec.weekday !== undefined) {
    // JS getDay(): 0 = Sunday, 1 = Monday ... whereas spec.weekday: 1 = Sunday, 2 = Monday
    const desiredJsDay = (spec.weekday - 1 + 7) % 7;
    const currentJsDay = now.getDay();
    let dayDiff = (desiredJsDay - currentJsDay + 7) % 7;
    if (dayDiff === 0 && target.getTime() <= now.getTime()) {
      dayDiff = 7;
    }
    target.setDate(target.getDate() + dayDiff);
  } else if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  return Math.max(1000, target.getTime() - now.getTime());
}

/* -------------------------------------------------- Default Runtime Adapter */

let handlerConfigured = false;
const ANDROID_CHANNEL_ID = "betterlife-reminders";

function loadExpoNotifications(): any | null {
  if (getPlatformOS() === "web") return null;
  try {
    const mod = require("expo-notifications");
    if (!handlerConfigured && mod?.setNotificationHandler) {
      mod.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      handlerConfigured = true;
    }
    return mod;
  } catch {
    return null;
  }
}

function isRunningInExpoGo(): boolean {
  try {
    const Constants = require("expo-constants")?.default ?? require("expo-constants");
    return (
      Constants?.executionEnvironment === "storeClient" || Constants?.appOwnership === "expo"
    );
  } catch {
    return false;
  }
}

const defaultAdapter: NotificationAdapter = {
  getPlatformSupport(): PlatformNotificationSupport {
    const currentOS = getPlatformOS();
    if (currentOS === "web") {
      const hasWebNotification =
        typeof globalThis !== "undefined" && "Notification" in globalThis;
      if (!hasWebNotification) {
        return {
          platform: "web",
          mode: "unsupported",
          supportsBackgroundDelivery: false,
          headline: "Browser ini tidak mendukung Web Notification API",
          detail:
            "Pengaturan jam pengingat tetap tersimpan ke akun Anda, tetapi notifikasi otomatis memerlukan aplikasi native iOS/Android atau browser yang mendukung Notification API.",
        };
      }
      return {
        platform: "web",
        mode: "web_browser",
        supportsBackgroundDelivery: false,
        headline: "Mode Web: aktif selama tab browser terbuka",
        detail:
          "Browser menampilkan pengingat saat tab Better Life terbuka dan izin diberikan. Notifikasi latar belakang saat aplikasi ditutup memerlukan build native iOS/Android.",
      };
    }

    const platform = currentOS === "ios" ? "ios" : "android";
    if (isRunningInExpoGo()) {
      return {
        platform,
        mode: "native_expo_go",
        supportsBackgroundDelivery: false,
        headline: "Mode Expo Go: penjadwalan lokal terbatas",
        detail:
          "Notifikasi lokal dijadwalkan melalui sistem operasi, tetapi pengiriman latar belakang penuh wajib diuji pada development build atau APK/IPA fisik.",
      };
    }

    return {
      platform,
      mode: "native_os",
      supportsBackgroundDelivery: true,
      headline: `Aplikasi Native (${platform === "ios" ? "iOS" : "Android"})`,
      detail:
        "Notifikasi dijadwalkan langsung pada penjadwal lokal sistem operasi perangkat dan diperbarui otomatis saat jadwal berubah.",
    };
  },

  async getPermissionStatus(): Promise<NotificationPermissionState> {
    const currentOS = getPlatformOS();
    if (currentOS === "web") {
      if (typeof globalThis === "undefined" || !("Notification" in globalThis)) {
        return "unsupported";
      }
      const perm = globalThis.Notification.permission;
      if (perm === "granted") return "granted";
      if (perm === "denied") return "denied";
      return "undetermined";
    }

    const Notifications = loadExpoNotifications();
    if (!Notifications) return "unsupported";
    try {
      const settings = await Notifications.getPermissionsAsync();
      if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus?.PROVISIONAL) {
        return "granted";
      }
      if (settings.canAskAgain === false || settings.status === "denied") {
        return "denied";
      }
      return "undetermined";
    } catch {
      return "unsupported";
    }
  },

  async requestPermission(): Promise<NotificationPermissionState> {
    const currentOS = getPlatformOS();
    if (currentOS === "web") {
      if (typeof globalThis === "undefined" || !("Notification" in globalThis)) {
        return "unsupported";
      }
      try {
        const result = await globalThis.Notification.requestPermission();
        if (result === "granted") return "granted";
        if (result === "denied") return "denied";
        return "undetermined";
      } catch {
        return "denied";
      }
    }

    const Notifications = loadExpoNotifications();
    if (!Notifications) return "unsupported";
    try {
      if (currentOS === "android" && Notifications.setNotificationChannelAsync) {
        await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
          name: "Pengingat Harian Better Life",
          importance: Notifications.AndroidImportance?.HIGH ?? 4,
          vibrationPattern: [0, 200, 120, 200],
          sound: "default",
        });
      }
      const res = await Notifications.requestPermissionsAsync();
      if (res.granted || res.ios?.status === Notifications.IosAuthorizationStatus?.PROVISIONAL) {
        return "granted";
      }
      return res.status === "denied" ? "denied" : "undetermined";
    } catch {
      return "unsupported";
    }
  },

  async cancelAll(): Promise<void> {
    clearWebTimers();
    if (getPlatformOS() === "web") return;
    const Notifications = loadExpoNotifications();
    if (!Notifications) return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {
      // Ignore if native module unavailable in test runner
    }
  },

  async scheduleSpecs(specs: ScheduledNotificationSpec[]): Promise<number> {
    await this.cancelAll();
    if (specs.length === 0) return 0;

    const currentOS = getPlatformOS();
    if (currentOS === "web") {
      if (typeof globalThis === "undefined" || !("Notification" in globalThis)) return 0;
      if (globalThis.Notification.permission !== "granted") return 0;

      let count = 0;
      const now = new Date();
      for (const spec of specs) {
        const delayMs = msUntilNextOccurrence(spec, now);
        // Only arm timers within 24h window to avoid 32-bit timeout overflow
        if (delayMs <= 24 * 60 * 60 * 1000) {
          const timer = setTimeout(() => {
            activeWebTimers.delete(timer);
            try {
              if (globalThis.Notification.permission === "granted") {
                new globalThis.Notification(spec.title, {
                  body: spec.body,
                  tag: `betterlife-${spec.key}`,
                });
              }
            } catch {
              // Ignore browser notification restrictions
            }
          }, delayMs);
          activeWebTimers.add(timer);
          count++;
        }
      }
      return count;
    }

    const Notifications = loadExpoNotifications();
    if (!Notifications) return 0;

    if (currentOS === "android" && Notifications.setNotificationChannelAsync) {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: "Pengingat Harian Better Life",
        importance: Notifications.AndroidImportance?.HIGH ?? 4,
        sound: "default",
      }).catch(() => undefined);
    }

    const TriggerTypes = Notifications.SchedulableTriggerInputTypes ?? {
      DAILY: "daily",
      WEEKLY: "weekly",
    };

    let scheduled = 0;
    for (const spec of specs) {
      try {
        const trigger =
          spec.kind === "weekly" && spec.weekday !== undefined
            ? {
                type: TriggerTypes.WEEKLY,
                weekday: spec.weekday,
                hour: spec.hour,
                minute: spec.minute,
                channelId: currentOS === "android" ? ANDROID_CHANNEL_ID : undefined,
              }
            : {
                type: TriggerTypes.DAILY,
                hour: spec.hour,
                minute: spec.minute,
                channelId: currentOS === "android" ? ANDROID_CHANNEL_ID : undefined,
              };

        await Notifications.scheduleNotificationAsync({
          identifier: `betterlife-${spec.key}`,
          content: {
            title: spec.title,
            body: spec.body,
            sound: "default",
            data: { reminderKey: spec.key },
          },
          trigger,
        });
        scheduled++;
      } catch {
        // Continue scheduling remaining items if one trigger fails on specific OS version
      }
    }
    return scheduled;
  },
};

let activeAdapter: NotificationAdapter = defaultAdapter;

/** Override adapter in automated tests without mocking React Native internals. */
export function setNotificationAdapterForTests(adapter: NotificationAdapter | null) {
  activeAdapter = adapter ?? defaultAdapter;
}

let scheduleChain: Promise<unknown> = Promise.resolve();

export const notificationScheduler = {
  getPlatformSupport(): PlatformNotificationSupport {
    return activeAdapter.getPlatformSupport();
  },

  async getPermissionStatus(): Promise<NotificationPermissionState> {
    return activeAdapter.getPermissionStatus();
  },

  async requestPermission(): Promise<NotificationPermissionState> {
    return activeAdapter.requestPermission();
  },

  async cancelAllNotifications(): Promise<void> {
    const op = scheduleChain.then(() => activeAdapter.cancelAll());
    scheduleChain = op.catch(() => undefined);
    return op;
  },

  async syncSchedule(config: ReminderScheduleConfig): Promise<{
    permissionStatus: NotificationPermissionState;
    scheduledCount: number;
    specs: ScheduledNotificationSpec[];
  }> {
    const run = async () => {
      const specs = buildNotificationSpecs(config);
      if (!config.masterEnabled || specs.length === 0) {
        await activeAdapter.cancelAll();
        const permissionStatus = await activeAdapter.getPermissionStatus();
        return { permissionStatus, scheduledCount: 0, specs: [] };
      }

      const permissionStatus = await activeAdapter.getPermissionStatus();
      if (permissionStatus !== "granted") {
        await activeAdapter.cancelAll();
        return { permissionStatus, scheduledCount: 0, specs };
      }

      const scheduledCount = await activeAdapter.scheduleSpecs(specs);
      return { permissionStatus, scheduledCount, specs };
    };

    const op = scheduleChain.then(run);
    scheduleChain = op.catch(() => undefined);
    return op;
  },
};
