import { DailyJournal, DailyJournalSchema } from "./schemas";

const JOURNALS_KEY = "betterlife_journals_v1";

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
  } catch (err) {
    console.warn(`[journalStorage] Failed to get item for key "${key}":`, err);
    return memoryStore[key] ?? null;
  }
}

async function setStorageItem(key: string, value: string): Promise<void> {
  try {
    memoryStore[key] = value;

    const { isWeb, hasSecureStore } = getPlatformInfo();
    const SecureStore = hasSecureStore ? getSecureStore() : null;

    if (!isWeb && SecureStore) {
      // SecureStore on Android KeyStore has a hard 2048-byte limit.
      // Payloads larger than 2KB must not be written to SecureStore to prevent KeyStore warnings.
      if (value.length < 2040) {
        await SecureStore.setItemAsync(key, value);
      }
      return;
    }

    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (err) {
    // Memory store fallback already preserved
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
    console.warn(`[journalStorage] Failed to delete item for key "${key}":`, err);
    delete memoryStore[key];
  }
}

export const journalStorage = {
  async getJournals(): Promise<Record<string, DailyJournal>> {
    const raw = await getStorageItem(JOURNALS_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, DailyJournal>;
    } catch {
      return {};
    }
  },

  async saveJournals(journals: Record<string, DailyJournal>): Promise<void> {
    await setStorageItem(JOURNALS_KEY, JSON.stringify(journals));
  },

  async getDailyJournal(date: string): Promise<DailyJournal | null> {
    const journals = await this.getJournals();
    return journals[date] || null;
  },

  async saveDailyJournal(journal: DailyJournal): Promise<void> {
    const journals = await this.getJournals();
    journals[journal.date] = journal;
    await this.saveJournals(journals);
  },

  async clearAllJournals(): Promise<void> {
    await deleteStorageItem(JOURNALS_KEY);
  },
};
