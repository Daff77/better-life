import { create } from "zustand";
import {
  MealPlanRecord,
  MealPlanPreferences,
  DEFAULT_MEAL_PLAN_PREFERENCES,
  MealSlot,
  SubstitutionCandidate,
} from "../lib/mealPlannerDomain";
import { mealPlannerApi } from "../lib/api/mealPlannerApi";
import { sessionStorage } from "../lib/sessionStorage";
import { useAuthStore } from "./useAuthStore";

interface SubstitutionModalState {
  isOpen: boolean;
  dayIndex: number;
  slot: MealSlot;
  currentRecipeId: string;
  candidates: SubstitutionCandidate[];
  isLoading: boolean;
}

interface MealPlannerState {
  activePlan: MealPlanRecord | null;
  selectedDayIndex: number;
  preferences: MealPlanPreferences;
  isLoading: boolean;
  isGenerating: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  error: string | null;
  checkedShoppingItemIds: string[];
  preferenceModalOpen: boolean;
  substitutionModal: SubstitutionModalState;

  // Actions
  setSelectedDayIndex: (index: number) => void;
  setPreferenceModalOpen: (open: boolean) => void;
  updatePreferences: (partial: Partial<MealPlanPreferences>) => void;
  loadSavedPlan: () => Promise<void>;
  generatePlan: () => Promise<void>;
  savePlan: () => Promise<void>;
  openSubstitutionModal: (dayIndex: number, slot: MealSlot, currentRecipeId: string) => Promise<void>;
  closeSubstitutionModal: () => void;
  replaceMeal: (newRecipeId: string) => Promise<void>;
  toggleShoppingItem: (itemId: string) => void;
  clearCheckedShoppingItems: () => void;
}

export const useMealPlannerStore = create<MealPlannerState>((set, get) => ({
  activePlan: null,
  selectedDayIndex: 0,
  preferences: DEFAULT_MEAL_PLAN_PREFERENCES,
  isLoading: false,
  isGenerating: false,
  isSaving: false,
  hasUnsavedChanges: false,
  error: null,
  checkedShoppingItemIds: [],
  preferenceModalOpen: false,
  substitutionModal: {
    isOpen: false,
    dayIndex: 0,
    slot: "Breakfast",
    currentRecipeId: "",
    candidates: [],
    isLoading: false,
  },

  setSelectedDayIndex: (index: number) => set({ selectedDayIndex: index }),

  setPreferenceModalOpen: (open: boolean) => set({ preferenceModalOpen: open }),

  updatePreferences: (partial: Partial<MealPlanPreferences>) =>
    set((state) => ({
      preferences: { ...state.preferences, ...partial },
      hasUnsavedChanges: true,
    })),

  loadSavedPlan: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await sessionStorage.getSession();
      const token = session?.token;
      const plan = await mealPlannerApi.getSavedPlan(token);

      if (plan) {
        set({
          activePlan: plan,
          preferences: plan.preferences,
          hasUnsavedChanges: false,
          isLoading: false,
        });
      } else {
        // Automatically populate profile calories if available
        const user = useAuthStore.getState().user;
        set({ isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  generatePlan: async () => {
    set({ isGenerating: true, error: null });
    try {
      const session = await sessionStorage.getSession();
      const token = session?.token;
      const { preferences } = get();

      const newPlan = await mealPlannerApi.generatePlan(preferences, token);
      set({
        activePlan: newPlan,
        hasUnsavedChanges: false,
        isGenerating: false,
        preferenceModalOpen: false,
      });
    } catch (err: any) {
      set({ error: err.message, isGenerating: false });
      throw err;
    }
  },

  savePlan: async () => {
    const { activePlan } = get();
    if (!activePlan) return;

    set({ isSaving: true, error: null });
    try {
      const session = await sessionStorage.getSession();
      const token = session?.token;

      const saved = await mealPlannerApi.savePlan(activePlan, token);
      set({
        activePlan: saved,
        hasUnsavedChanges: false,
        isSaving: false,
      });
    } catch (err: any) {
      set({ error: err.message, isSaving: false });
      throw err;
    }
  },

  openSubstitutionModal: async (dayIndex: number, slot: MealSlot, currentRecipeId: string) => {
    set({
      substitutionModal: {
        isOpen: true,
        dayIndex,
        slot,
        currentRecipeId,
        candidates: [],
        isLoading: true,
      },
    });

    try {
      const session = await sessionStorage.getSession();
      const token = session?.token;
      const { preferences } = get();

      const candidates = await mealPlannerApi.getSubstitutions(
        slot,
        currentRecipeId,
        preferences,
        token
      );

      set((state) => ({
        substitutionModal: {
          ...state.substitutionModal,
          candidates,
          isLoading: false,
        },
      }));
    } catch (err: any) {
      set((state) => ({
        substitutionModal: {
          ...state.substitutionModal,
          isLoading: false,
        },
        error: err.message,
      }));
    }
  },

  closeSubstitutionModal: () => {
    set((state) => ({
      substitutionModal: {
        ...state.substitutionModal,
        isOpen: false,
      },
    }));
  },

  replaceMeal: async (newRecipeId: string) => {
    const { activePlan, substitutionModal } = get();
    if (!activePlan) return;

    const { dayIndex, slot } = substitutionModal;
    set({ isLoading: true, error: null });

    try {
      const session = await sessionStorage.getSession();
      const token = session?.token;

      const updatedPlan = await mealPlannerApi.replaceMeal(
        dayIndex,
        slot,
        newRecipeId,
        activePlan,
        token
      );

      set({
        activePlan: updatedPlan,
        hasUnsavedChanges: true,
        isLoading: false,
        substitutionModal: {
          ...substitutionModal,
          isOpen: false,
        },
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  toggleShoppingItem: (itemId: string) => {
    set((state) => {
      const exists = state.checkedShoppingItemIds.includes(itemId);
      const updated = exists
        ? state.checkedShoppingItemIds.filter((id) => id !== itemId)
        : [...state.checkedShoppingItemIds, itemId];
      return { checkedShoppingItemIds: updated };
    });
  },

  clearCheckedShoppingItems: () => {
    set({ checkedShoppingItemIds: [] });
  },
}));
