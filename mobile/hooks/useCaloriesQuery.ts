import { useMemo } from "react";
import { useLoggedMeals } from "./useMealsQuery";
import { useActivityStats } from "./useActivityQuery";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import { CalorieData } from "@/lib/schemas";

export function useDailyCalories(): CalorieData & { isLoading: boolean } {
  const { data: meals = [], isLoading: isMealsLoading } = useLoggedMeals();
  const { data: activity, isLoading: isActivityLoading } = useActivityStats();
  const targetCalories = useOnboardingStore((s) => s.personalization.targetCalories);

  const consumedCalories = useMemo(() => {
    return meals.reduce((acc, meal) => acc + meal.calories, 0);
  }, [meals]);

  const burnedCalories = activity?.exerciseCalories ?? 0;
  const remainingCalories = Math.max(0, targetCalories - consumedCalories);

  return {
    consumedCalories,
    targetCalories,
    remainingCalories,
    burnedCalories,
    isLoading: isMealsLoading || isActivityLoading,
  };
}
