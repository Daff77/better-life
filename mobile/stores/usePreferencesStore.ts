import { create } from "zustand";
import { UserPreferences, UserPreferencesSchema } from "@/lib/schemas";

interface PreferencesState {
  preferences: UserPreferences;
  toggleNotifications: () => void;
  setTheme: (theme: UserPreferences["theme"]) => void;
  setUnitSystem: (unit: UserPreferences["unitSystem"]) => void;
  updatePreferences: (data: Partial<UserPreferences>) => void;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  notificationsEnabled: true,
  theme: "light",
  unitSystem: "metric",
};

export const usePreferencesStore = create<PreferencesState>((set) => ({
  preferences: DEFAULT_PREFERENCES,
  toggleNotifications: () =>
    set((state) => ({
      preferences: {
        ...state.preferences,
        notificationsEnabled: !state.preferences.notificationsEnabled,
      },
    })),
  setTheme: (theme) =>
    set((state) => ({
      preferences: { ...state.preferences, theme },
    })),
  setUnitSystem: (unitSystem) =>
    set((state) => ({
      preferences: { ...state.preferences, unitSystem },
    })),
  updatePreferences: (data) =>
    set((state) => {
      const updated = { ...state.preferences, ...data };
      UserPreferencesSchema.safeParse(updated);
      return { preferences: updated };
    }),
}));
