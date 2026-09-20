import { create } from "zustand";
import { PersonalizationMetrics, PersonalizationSchema } from "@/lib/schemas";
import { useAuthStore } from "@/stores/useAuthStore";
import { sessionStorage } from "@/lib/sessionStorage";

export interface PlanCalculationResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbGrams: number;
  targetFatGrams: number;
}

/**
 * Reusable Mifflin-St Jeor calculation engine (Milestone 2 & 7)
 * Product estimate calculation, not medical advice.
 */
export function calculatePersonalizedPlan(input: {
  weight: number;
  height: number;
  gender: "Female" | "Male";
  birthDate?: { day: number; month: string; year: number };
  age?: number;
  goal: "Eat balanced" | "Lose weight" | "Gain muscle";
}): PlanCalculationResult {
  const currentYear = new Date().getFullYear();
  let age = input.age;
  if (age === undefined && input.birthDate) {
    age = currentYear - input.birthDate.year;
  }
  age = Math.max(14, Math.min(100, age || 25));

  // Mifflin-St Jeor Formula
  let bmr = 10 * input.weight + 6.25 * input.height - 5 * age;
  bmr += input.gender === "Male" ? 5 : -161;
  bmr = Math.round(bmr);

  // Total Daily Energy Expenditure (TDEE) with moderate activity factor 1.35
  const tdee = Math.round(bmr * 1.35);

  // Goal-adjusted target calories
  let target = tdee;
  if (input.goal === "Lose weight") {
    target = Math.round(tdee * 0.82);
  } else if (input.goal === "Gain muscle") {
    target = Math.round(tdee * 1.15);
  } else {
    target = Math.round(tdee * 1.00);
  }

  // Macronutrient targets (Protein 25%, Carbs 50%, Fat 25%)
  const proteinGrams = Math.round((target * 0.25) / 4);
  const carbGrams = Math.round((target * 0.50) / 4);
  const fatGrams = Math.round((target * 0.25) / 9);

  return {
    bmr,
    tdee,
    targetCalories: target,
    targetProteinGrams: proteinGrams,
    targetCarbGrams: carbGrams,
    targetFatGrams: fatGrams,
  };
}

interface OnboardingState {
  onboardingCompleted: boolean;
  isHydrated: boolean;
  personalization: PersonalizationMetrics;

  initializePersonalization: () => Promise<void>;
  updatePersonalization: (data: Partial<PersonalizationMetrics>) => void;
  savePersonalization: (data: Partial<PersonalizationMetrics>) => Promise<{
    success: boolean;
    error?: string;
    metrics?: PersonalizationMetrics;
  }>;
  completeOnboarding: () => Promise<void>;
  calculateCalories: () => PlanCalculationResult;
}

export const DEFAULT_PERSONALIZATION: PersonalizationMetrics = {
  goal: "Eat balanced",
  weight: 65,
  height: 170,
  gender: "Female",
  birthDate: { day: 15, month: "June", year: 2000 },
  cookingSkill: "Middle",
  dietType: "Omnivore",
  allergies: ["Lactose"],
  targetCalories: 1950,
  bmr: 1444,
  tdee: 1950,
  targetProteinGrams: 122,
  targetCarbGrams: 244,
  targetFatGrams: 54,
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  onboardingCompleted: false,
  isHydrated: false,
  personalization: DEFAULT_PERSONALIZATION,

  initializePersonalization: async () => {
    try {
      const persisted = await sessionStorage.getPersonalization();
      if (persisted) {
        set({ personalization: persisted, isHydrated: true });
      } else {
        set({ personalization: DEFAULT_PERSONALIZATION, isHydrated: true });
      }
    } catch (err) {
      console.warn("[useOnboardingStore] Hydration failed:", err);
      set({ personalization: DEFAULT_PERSONALIZATION, isHydrated: true });
    }
  },

  updatePersonalization: (data: Partial<PersonalizationMetrics>) =>
    set((state) => {
      const updated = { ...state.personalization, ...data };
      PersonalizationSchema.safeParse(updated);
      return { personalization: updated };
    }),

  savePersonalization: async (data: Partial<PersonalizationMetrics>) => {
    const current = get().personalization;
    const merged = { ...current, ...data };

    // Explicit field validations
    if (merged.weight <= 0 || isNaN(merged.weight) || merged.weight < 30 || merged.weight > 300) {
      return { success: false, error: "Weight must be between 30 and 300 kg." };
    }

    if (merged.height <= 0 || isNaN(merged.height) || merged.height < 100 || merged.height > 250) {
      return { success: false, error: "Height must be between 100 and 250 cm." };
    }

    if (merged.gender !== "Female" && merged.gender !== "Male") {
      return { success: false, error: "Gender must be Female or Male." };
    }

    if (
      merged.goal !== "Eat balanced" &&
      merged.goal !== "Lose weight" &&
      merged.goal !== "Gain muscle"
    ) {
      return { success: false, error: "Please select a valid fitness/nutrition goal." };
    }

    const currentYear = new Date().getFullYear();
    const age = currentYear - (merged.birthDate?.year || 2000);
    if (age <= 0 || isNaN(age) || age < 14 || age > 100) {
      return { success: false, error: "Age must be between 14 and 100." };
    }

    // Schema validation check
    const parseResult = PersonalizationSchema.safeParse(merged);
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.issues[0]?.message || "Invalid personalization data.",
      };
    }

    // Recalculate plan with the single source formula
    const plan = calculatePersonalizedPlan({
      weight: merged.weight,
      height: merged.height,
      gender: merged.gender,
      birthDate: merged.birthDate,
      goal: merged.goal,
    });

    const updatedMetrics: PersonalizationMetrics = {
      ...merged,
      ...plan,
    };

    // Update in-memory Zustand state
    set({ personalization: updatedMetrics });

    // Persist to storage
    await sessionStorage.savePersonalization(updatedMetrics);

    // Synchronize active Journal target
    try {
      const { useJournalStore, getTodayDateKey } = require("@/stores/useJournalStore");
      const journalStore = useJournalStore.getState();
      const today = getTodayDateKey();
      await journalStore.setTargetCalories(updatedMetrics.targetCalories, today);
    } catch (err) {
      console.warn("[useOnboardingStore] Could not sync active journal target:", err);
    }

    return { success: true, metrics: updatedMetrics };
  },

  completeOnboarding: async () => {
    const current = get().personalization;
    set(() => ({
      onboardingCompleted: true,
    }));
    await sessionStorage.savePersonalization(current);
    await useAuthStore.getState().setOnboardingCompleted(true);
    try {
      const { useJournalStore, getTodayDateKey } = require("@/stores/useJournalStore");
      await useJournalStore.getState().setTargetCalories(current.targetCalories, getTodayDateKey());
    } catch {
      // non-fatal
    }
  },

  calculateCalories: () => {
    const plan = calculatePersonalizedPlan(get().personalization);

    set((state) => ({
      personalization: {
        ...state.personalization,
        ...plan,
      },
    }));

    return plan;
  },
}));
