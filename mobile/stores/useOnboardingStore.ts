import { create } from "zustand";
import { PersonalizationMetrics, PersonalizationSchema } from "@/lib/schemas";
import { useAuthStore } from "@/stores/useAuthStore";
import { sessionStorage } from "@/lib/sessionStorage";
import { API_BASE_URL } from "@/lib/api/config";
import { accountRevision } from "@/lib/accountScope";
import { notifyUnauthorizedSession } from "@/lib/authToken";
import { calculatePersonalizedPlan } from "@/lib/nutritionDomain";
export { calculatePersonalizedPlan } from "@/lib/nutritionDomain";

export interface PlanCalculationResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbGrams: number;
  targetFatGrams: number;
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
  weight: 70,
  targetWeight: 65,
  height: 175,
  gender: "Male",
  birthDate: { day: 15, month: "June", year: 2000 },
  cookingSkill: "Middle",
  dietType: "Omnivore",
  allergies: [],
  targetCalories: 2582,
  bmr: 1720,
  tdee: 2582,
  targetProteinGrams: 161,
  targetCarbGrams: 323,
  targetFatGrams: 72,
};

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  onboardingCompleted: false,
  isHydrated: false,
  personalization: DEFAULT_PERSONALIZATION,

  initializePersonalization: async () => {
    const revision = accountRevision();
    try {
      const persisted = await sessionStorage.getPersonalization();
      if (revision !== accountRevision()) return;
      if (persisted) {
        set({
          personalization: persisted,
          onboardingCompleted: true,
          isHydrated: true,
        });
      } else {
        set({ personalization: DEFAULT_PERSONALIZATION, isHydrated: true });
      }

      // Reconcile profile from backend when authenticated (especially important on new device login)
      const session = await sessionStorage.getSession();
      if (session?.token && revision === accountRevision()) {
        try {
          const res = await fetch(`${API_BASE_URL}/profile`, {
            headers: { Authorization: `Bearer ${session.token}` },
          });
          if (res.status === 401 && revision === accountRevision()) {
            await notifyUnauthorizedSession("Sesi berakhir. Silakan masuk kembali.");
            return;
          }
          if (res.ok && revision === accountRevision()) {
            const payload = await res.json();
            const remoteProfile = payload?.profile;
            if (remoteProfile && remoteProfile.weight && remoteProfile.height) {
              const plan = calculatePersonalizedPlan({
                weight: remoteProfile.weight,
                height: remoteProfile.height,
                gender: remoteProfile.gender,
                birthDate: remoteProfile.birthDate,
                goal: remoteProfile.goal,
              });
              const hydratedMetrics: PersonalizationMetrics = {
                goal: remoteProfile.goal,
                weight: remoteProfile.weight,
                targetWeight: remoteProfile.targetWeight ?? persisted?.targetWeight ?? remoteProfile.weight,
                height: remoteProfile.height,
                gender: remoteProfile.gender,
                birthDate: remoteProfile.birthDate ?? DEFAULT_PERSONALIZATION.birthDate,
                cookingSkill: remoteProfile.cookingSkill ?? "Middle",
                dietType: remoteProfile.dietType ?? "Omnivore",
                allergies: Array.isArray(remoteProfile.allergies) ? remoteProfile.allergies : [],
                ...plan,
                targetCalories: remoteProfile.targetCalories || plan.targetCalories,
              };
              if (!persisted) {
                set({
                  personalization: hydratedMetrics,
                  onboardingCompleted: Boolean(remoteProfile.onboardingCompleted),
                  isHydrated: true,
                });
                await sessionStorage.savePersonalization(hydratedMetrics);
              }
            }
          }
        } catch {
          // Offline safe
        }
      }
    } catch {
      if (revision !== accountRevision()) return;
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
    const revision = accountRevision();
    const current = get().personalization;
    const merged = { ...current, ...data };

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

    const parseResult = PersonalizationSchema.safeParse(merged);
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.issues[0]?.message || "Invalid personalization data.",
      };
    }

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

    set({ personalization: updatedMetrics });

    await sessionStorage.savePersonalization(updatedMetrics);
    if (revision !== accountRevision()) {
      return { success: false, error: "Akun telah berubah. Silakan ulangi." };
    }

    try {
      const session = await sessionStorage.getSession();
      if (session?.token) {
        const res = await fetch(`${API_BASE_URL}/profile/personalization`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            goal: updatedMetrics.goal,
            weight: updatedMetrics.weight,
            targetWeight: updatedMetrics.targetWeight,
            height: updatedMetrics.height,
            gender: updatedMetrics.gender,
            birthDate: updatedMetrics.birthDate,
            age: currentYear - (updatedMetrics.birthDate?.year || 2000),
            targetCalories: updatedMetrics.targetCalories,
            dietType: updatedMetrics.dietType,
            cookingSkill: updatedMetrics.cookingSkill,
            allergies: updatedMetrics.allergies,
            onboardingCompleted: true,
          }),
        });
        if (res.status === 401 && revision === accountRevision()) {
          await notifyUnauthorizedSession("Sesi berakhir. Silakan masuk kembali.");
        }
      }
    } catch {
      // Non-fatal if backend is offline
    }

    try {
      const { useJournalStore, getTodayDateKey } = require("@/stores/useJournalStore");
      const journalStore = useJournalStore.getState();
      const today = getTodayDateKey();
      await journalStore.setTargetCalories(updatedMetrics.targetCalories, today);
    } catch {
      // Non-fatal if journal store is not yet ready
    }

    return { success: true, metrics: updatedMetrics };
  },

  completeOnboarding: async () => {
    const revision = accountRevision();
    const current = get().personalization;
    set(() => ({
      onboardingCompleted: true,
    }));
    await get().savePersonalization(current);
    if (revision !== accountRevision()) return;
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
