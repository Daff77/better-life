import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mealsApi } from "@/lib/api/mealsApi";
import { LoggedMeal } from "@/lib/schemas";

export const MEALS_QUERY_KEY = ["meals", "logged"];

export function useLoggedMeals() {
  return useQuery({
    queryKey: MEALS_QUERY_KEY,
    queryFn: () => mealsApi.getLoggedMeals(),
    initialData: [
      {
        id: "meal-1",
        type: "Breakfast" as const,
        name: "Berry Yogurt Bowl with Honey & Chia",
        calories: 420,
        proteinGrams: 22,
        carbsGrams: 48,
        fatGrams: 8,
        fiberGrams: 6,
        quantity: 1,
        time: "08:30 AM",
      },
    ],
  });
}

export function useLogMealMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (meal: Omit<LoggedMeal, "id" | "time">) => mealsApi.logMeal(meal),
    onSuccess: (newMeal) => {
      queryClient.setQueryData<LoggedMeal[]>(MEALS_QUERY_KEY, (prev) =>
        prev ? [newMeal, ...prev] : [newMeal]
      );
      queryClient.invalidateQueries({ queryKey: MEALS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["calories"] });
    },
  });
}

export function useResetMealsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => mealsApi.resetMeals(),
    onSuccess: () => {
      queryClient.setQueryData<LoggedMeal[]>(MEALS_QUERY_KEY, []);
      queryClient.invalidateQueries({ queryKey: MEALS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["calories"] });
    },
  });
}
