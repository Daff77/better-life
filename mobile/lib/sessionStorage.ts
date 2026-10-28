import { PersonalizationMetrics } from "./schemas";

export interface StoredUser {
  id?: string;
  name: string;
  email: string;
  phone?: string;
}

export interface StoredAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  onboardingCompleted: boolean;
}

export interface SessionData {
  user: StoredUser;
  isAuthenticated: boolean;
  onboardingCompleted: boolean;
  token?: string;
}

const SESSION_KEY = "betterlife_session_v1";
const USERS_KEY = "betterlife_registered_accounts_v1";
const PERSONALIZATION_KEY = "betterlife_personalization_v1";

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

// Platform-aware storage helpers
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
  } catch (err) {
    console.warn(`[sessionStorage] Failed to get item for key "${key}":`, err);
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
  } catch (err) {
    console.warn(`[sessionStorage] Failed to set item for key "${key}":`, err);
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
  } catch (err) {
    console.warn(`[sessionStorage] Failed to delete item for key "${key}":`, err);
    delete memoryStore[key];
  }
}

// Default pre-seeded account for local testing
export const DEFAULT_DEMO_ACCOUNT: StoredAccount = {
  id: "user-daffa",
  name: "Daffa Pratama",
  email: "daffa@gmail.com",
  password: "password123",
  phone: "+62 812-3456-7890",
  onboardingCompleted: true,
};

export const sessionStorage = {
  // Session handling
  async getSession(): Promise<SessionData | null> {
    const raw = await getStorageItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionData;
    } catch {
      return null;
    }
  },

  async saveSession(session: SessionData): Promise<void> {
    await setStorageItem(SESSION_KEY, JSON.stringify(session));
  },

  async clearSession(): Promise<void> {
    await deleteStorageItem(SESSION_KEY);
  },

  // Registered accounts for local authentication verification
  async getAccounts(): Promise<StoredAccount[]> {
    const raw = await getStorageItem(USERS_KEY);
    if (!raw) {
      return [DEFAULT_DEMO_ACCOUNT];
    }
    try {
      const parsed = JSON.parse(raw) as StoredAccount[];
      if (!parsed.some((a) => a.email.toLowerCase() === DEFAULT_DEMO_ACCOUNT.email.toLowerCase())) {
        parsed.unshift(DEFAULT_DEMO_ACCOUNT);
      }
      return parsed;
    } catch {
      return [DEFAULT_DEMO_ACCOUNT];
    }
  },

  async saveAccount(account: StoredAccount): Promise<void> {
    const accounts = await this.getAccounts();
    const existingIndex = accounts.findIndex(
      (a) => a.email.toLowerCase() === account.email.toLowerCase()
    );
    if (existingIndex >= 0) {
      accounts[existingIndex] = account;
    } else {
      accounts.push(account);
    }
    await setStorageItem(USERS_KEY, JSON.stringify(accounts));
  },

  async updateAccountOnboarding(email: string, onboardingCompleted: boolean): Promise<void> {
    const accounts = await this.getAccounts();
    const account = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (account) {
      account.onboardingCompleted = onboardingCompleted;
      await setStorageItem(USERS_KEY, JSON.stringify(accounts));
    }
  },

  // Personalization data persistence
  async getPersonalization(): Promise<PersonalizationMetrics | null> {
    const raw = await getStorageItem(PERSONALIZATION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PersonalizationMetrics;
    } catch {
      return null;
    }
  },

  async savePersonalization(metrics: PersonalizationMetrics): Promise<void> {
    await setStorageItem(PERSONALIZATION_KEY, JSON.stringify(metrics));
  },

  async clearPersonalization(): Promise<void> {
    await deleteStorageItem(PERSONALIZATION_KEY);
  },
};
