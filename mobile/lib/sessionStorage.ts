import { PersonalizationMetrics } from "./schemas";
import { accountStorageKey } from "./accountScope";

export interface StoredUser {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
}

/**
 * Non-sensitive per-account metadata cached on device.
 * Raw passwords are NEVER stored on the client.
 */
export interface StoredAccountMeta {
  id: string;
  name: string;
  email: string;
  phone?: string;
  onboardingCompleted: boolean;
}

export interface SessionData {
  user: StoredUser;
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
  token?: string;
}

const SESSION_KEY = "betterlife_session_v2";
const LEGACY_USERS_KEY = "betterlife_registered_accounts_v1";
const ACCOUNT_META_KEY = "betterlife_account_meta_v2";
const PERSONALIZATION_KEY = "betterlife_personalization_v1";

// Demo credentials hint strictly for UI quick-fill helper in development, never used to verify auth locally
export const DEMO_LOGIN_HINT = {
  email: "daffa@gmail.com",
  password: "password123",
} as const;

// In-memory fallback if storage is blocked or in non-browser Node environments
const memoryStore: Record<string, string> = {};

function getPlatformInfo(): { isWeb: boolean; hasSecureStore: boolean } {
  try {
    const { Platform } = require("react-native");
    if (Platform && Platform.OS === "web") {
      return { isWeb: true, hasSecureStore: false };
    }
    if (Platform && (Platform.OS === "ios" || Platform.OS === "android")) {
      return { isWeb: false, hasSecureStore: true };
    }
  } catch {
    // Node environment or fallback
  }
  return { isWeb: true, hasSecureStore: false };
}

function getSecureStore() {
  try {
    return require("expo-secure-store");
  } catch {
    return null;
  }
}

async function getStorageItem(key: string): Promise<string | null> {
  try {
    const { isWeb, hasSecureStore } = getPlatformInfo();
    const SecureStore = hasSecureStore ? getSecureStore() : null;

    if (!isWeb && SecureStore) {
      return await SecureStore.getItemAsync(key);
    }

    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }

    return memoryStore[key] ?? null;
  } catch {
    return memoryStore[key] ?? null;
  }
}

async function setStorageItem(key: string, value: string): Promise<void> {
  try {
    const { isWeb, hasSecureStore } = getPlatformInfo();
    const SecureStore = hasSecureStore ? getSecureStore() : null;

    if (!isWeb && SecureStore) {
      await SecureStore.setItemAsync(key, value);
      memoryStore[key] = value;
      return;
    }

    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    memoryStore[key] = value;
  } catch {
    memoryStore[key] = value;
  }
}

async function deleteStorageItem(key: string): Promise<void> {
  try {
    const { isWeb, hasSecureStore } = getPlatformInfo();
    const SecureStore = hasSecureStore ? getSecureStore() : null;

    if (!isWeb && SecureStore) {
      await SecureStore.deleteItemAsync(key);
      delete memoryStore[key];
      return;
    }

    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
    }
    delete memoryStore[key];
  } catch {
    delete memoryStore[key];
  }
}

export const sessionStorage = {
  async getSession(): Promise<SessionData | null> {
    const raw = await getStorageItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as SessionData & { password?: unknown };
      // Ensure no legacy password field survives inside session payload
      if (parsed && typeof parsed === "object" && "password" in parsed) {
        delete parsed.password;
      }
      if (parsed?.user && typeof parsed.user === "object" && "password" in (parsed.user as any)) {
        delete (parsed.user as any).password;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  async saveSession(session: SessionData): Promise<void> {
    const cleanUser: StoredUser = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      ...(session.user.phone ? { phone: session.user.phone } : {}),
      ...(session.user.photoUrl ? { photoUrl: session.user.photoUrl } : {}),
    };
    await setStorageItem(
      SESSION_KEY,
      JSON.stringify({
        user: cleanUser,
        isAuthenticated: Boolean(session.isAuthenticated),
        onboardingCompleted: Boolean(session.onboardingCompleted),
        ...(session.token ? { token: session.token } : {}),
      })
    );
  },

  async clearSession(): Promise<void> {
    await deleteStorageItem(SESSION_KEY);
  },

  /**
   * Safely migrates legacy account registry by stripping all plaintext passwords
   * while preserving per-email onboarding completion metadata.
   * Global unowned journals/profiles (`betterlife_journals_v1`, `betterlife_personalization_v1`)
   * are intentionally NOT assigned to any user to prevent cross-account data leaks.
   */
  async sanitizeLegacyStorage(): Promise<void> {
    const legacyRaw = await getStorageItem(LEGACY_USERS_KEY);
    if (!legacyRaw) return;

    try {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed)) {
        const currentMeta = await this.getAccountMetaList();
        const byEmail = new Map<string, StoredAccountMeta>(
          currentMeta.map((m) => [m.email.toLowerCase(), m])
        );

        for (const item of parsed) {
          if (item && typeof item.email === "string" && item.email.trim()) {
            const normEmail = item.email.trim().toLowerCase();
            if (!byEmail.has(normEmail)) {
              byEmail.set(normEmail, {
                id: String(item.id || `user-${normEmail}`),
                name: String(item.name || normEmail.split("@")[0]),
                email: normEmail,
                phone: typeof item.phone === "string" ? item.phone : undefined,
                onboardingCompleted: Boolean(item.onboardingCompleted),
              });
            }
          }
        }

        await setStorageItem(ACCOUNT_META_KEY, JSON.stringify(Array.from(byEmail.values())));
      }
    } catch {
      // ignore malformed legacy value
    }

    // Permanently remove legacy plaintext-password registry key
    await deleteStorageItem(LEGACY_USERS_KEY);
  },

  async getAccountMetaList(): Promise<StoredAccountMeta[]> {
    const raw = await getStorageItem(ACCOUNT_META_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => ({
        id: String(item.id || ""),
        name: String(item.name || ""),
        email: String(item.email || "").toLowerCase(),
        phone: typeof item.phone === "string" ? item.phone : undefined,
        onboardingCompleted: Boolean(item.onboardingCompleted),
      }));
    } catch {
      return [];
    }
  },

  async getAccountMeta(email: string): Promise<StoredAccountMeta | null> {
    const norm = email.trim().toLowerCase();
    const list = await this.getAccountMetaList();
    return list.find((a) => a.email.toLowerCase() === norm) ?? null;
  },

  async saveAccountMeta(meta: StoredAccountMeta): Promise<void> {
    const list = await this.getAccountMetaList();
    const normEmail = meta.email.trim().toLowerCase();
    const clean: StoredAccountMeta = {
      id: meta.id,
      name: meta.name,
      email: normEmail,
      ...(meta.phone ? { phone: meta.phone } : {}),
      onboardingCompleted: Boolean(meta.onboardingCompleted),
    };
    const idx = list.findIndex((a) => a.email.toLowerCase() === normEmail);
    if (idx >= 0) {
      list[idx] = clean;
    } else {
      list.push(clean);
    }
    await setStorageItem(ACCOUNT_META_KEY, JSON.stringify(list));
  },

  async updateAccountOnboarding(email: string, onboardingCompleted: boolean): Promise<void> {
    const existing = await this.getAccountMeta(email);
    if (existing) {
      await this.saveAccountMeta({
        ...existing,
        onboardingCompleted,
      });
    }
  },

  async getPersonalization(): Promise<PersonalizationMetrics | null> {
    const raw = await getStorageItem(accountStorageKey(PERSONALIZATION_KEY));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PersonalizationMetrics;
    } catch {
      return null;
    }
  },

  async savePersonalization(metrics: PersonalizationMetrics): Promise<void> {
    await setStorageItem(accountStorageKey(PERSONALIZATION_KEY), JSON.stringify(metrics));
  },

  async clearPersonalization(): Promise<void> {
    await deleteStorageItem(accountStorageKey(PERSONALIZATION_KEY));
  },
};
