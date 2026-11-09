import { create } from "zustand";
import { FoodItem } from "@/data/mockRecipes";

const CUSTOM_RECIPES_KEY = "betterlife_custom_recipes_v1";

const memoryFallback: Record<string, string> = {};

function getPlatformStorage() {
  try {
    const { Platform } = require("react-native");
    if (Platform && (Platform.OS === "ios" || Platform.OS === "android")) {
      const SecureStore = require("expo-secure-store");
      return {
        getItem: (key: string) => SecureStore.getItemAsync(key) as Promise<string | null>,
        setItem: (key: string, val: string) => SecureStore.setItemAsync(key, val) as Promise<void>,
      };
    }
  } catch {
    // Fallback below
  }
  return {
    getItem: async (key: string) => {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return memoryFallback[key] ?? null;
    },
    setItem: async (key: string, val: string) => {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, val);
      }
      memoryFallback[key] = val;
    },
  };
}

interface CustomRecipesState {
  customRecipes: FoodItem[];
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  addCustomRecipe: (recipe: FoodItem) => Promise<void>;
  removeCustomRecipe: (id: string) => Promise<void>;
}

export const useCustomRecipesStore = create<CustomRecipesState>((set, get) => ({
  customRecipes: [],
  isHydrated: false,

  hydrate: async () => {
    if (get().isHydrated) return;
    try {
      const storage = getPlatformStorage();
      const raw = await storage.getItem(CUSTOM_RECIPES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FoodItem[];
        if (Array.isArray(parsed)) {
          set({ customRecipes: parsed, isHydrated: true });
          return;
        }
      }
    } catch {
      // Ignore parse error
    }
    set({ isHydrated: true });
  },

  addCustomRecipe: async (recipe: FoodItem) => {
    const updated = [recipe, ...get().customRecipes.filter((r) => r.id !== recipe.id)];
    set({ customRecipes: updated });
    try {
      const storage = getPlatformStorage();
      await storage.setItem(CUSTOM_RECIPES_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage error
    }
  },

  removeCustomRecipe: async (id: string) => {
    const updated = get().customRecipes.filter((r) => r.id !== id);
    set({ customRecipes: updated });
    try {
      const storage = getPlatformStorage();
      await storage.setItem(CUSTOM_RECIPES_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage error
    }
  },
}));

