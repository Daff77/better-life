import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { recipesApi } from "@/lib/api/recipesApi";
import { FoodItem } from "@/lib/schemas";
import { MOCK_RECIPES } from "@/data/mockRecipes";
import { useCustomRecipesStore } from "@/stores/useCustomRecipesStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";

export const RECIPES_QUERY_KEY = ["recipes"];

export function useRecipes() {
  const customRecipes = useCustomRecipesStore((state) => state.customRecipes);
  const isHydrated = useCustomRecipesStore((state) => state.isHydrated);
  const hydrate = useCustomRecipesStore((state) => state.hydrate);
  const userId = useAuthStore((state) => state.user?.id ?? "guest");
  const isPremium = useSubscriptionStore((state) => state.isPremium);

  useEffect(() => {
    if (!isHydrated) {
      hydrate();
    }
  }, [isHydrated, hydrate]);

  const query = useQuery<FoodItem[]>({
    queryKey: [...RECIPES_QUERY_KEY, userId, isPremium ? "premium" : "free"],
    queryFn: () => recipesApi.getRecipes(),
    placeholderData: MOCK_RECIPES,
  });

  const mergedData = useMemo(() => {
    const base = query.data ?? MOCK_RECIPES;
    const customIds = new Set(customRecipes.map((r) => r.id));
    return [...(customRecipes as FoodItem[]), ...base.filter((r) => !customIds.has(r.id))];
  }, [customRecipes, query.data]);

  return {
    ...query,
    data: mergedData,
  };
}

export function useRecipe(id: string) {
  const customRecipes = useCustomRecipesStore((state) => state.customRecipes);
  const isHydrated = useCustomRecipesStore((state) => state.isHydrated);
  const hydrate = useCustomRecipesStore((state) => state.hydrate);
  const userId = useAuthStore((state) => state.user?.id ?? "guest");
  const isPremium = useSubscriptionStore((state) => state.isPremium);

  useEffect(() => {
    if (!isHydrated) {
      hydrate();
    }
  }, [isHydrated, hydrate]);

  const customMatch = useMemo(
    () => (customRecipes.find((r) => r.id === id) as FoodItem | undefined) ?? null,
    [customRecipes, id]
  );

  const query = useQuery<FoodItem | null>({
    queryKey: [...RECIPES_QUERY_KEY, id, userId, isPremium ? "premium" : "free"],
    queryFn: () => recipesApi.getRecipeById(id),
    placeholderData: () => customMatch ?? MOCK_RECIPES.find((r) => r.id === id) ?? null,
    enabled: Boolean(id) && !id.startsWith("custom-recipe-") && !customMatch,
  });

  return {
    ...query,
    data: customMatch ?? query.data ?? null,
  };
}
