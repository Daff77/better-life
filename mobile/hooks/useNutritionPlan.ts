import { useOnboardingStore } from "@/stores/useOnboardingStore";

export function useNutritionPlan() {
  const personalization = useOnboardingStore((state) => state.personalization);
  const calculateCalories = useOnboardingStore((state) => state.calculateCalories);

  const target = personalization.targetCalories || 1950;
  const estimatedProtein = Math.round((target * 0.25) / 4); // 25% protein calories
  const estimatedCarbs = Math.round((target * 0.50) / 4);   // 50% carbs calories
  const estimatedFat = Math.round((target * 0.25) / 9);     // 25% fat calories

  return {
    targetCalories: target,
    macros: {
      proteinGrams: estimatedProtein,
      carbsGrams: estimatedCarbs,
      fatGrams: estimatedFat,
    },
    recalculate: calculateCalories,
  };
}
