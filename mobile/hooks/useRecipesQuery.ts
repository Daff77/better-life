import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { recipesApi } from "@/lib/api/recipesApi";
import { FoodItem } from "@/lib/schemas";
import { MOCK_RECIPES } from "@/data/mockRecipes";
import { useCustomRecipesStore } from "@/stores/useCustomRecipesStore";

export const RECIPES_QUERY_KEY = ["recipes"];

export function useRecipes() {
  const customRecipes = useCustomRecipesStore((state) => state.customRecipes);
  const isHydrated = useCustomRecipesStore((state) => state.isHydrated);
  const hydrate = useCustomRecipesStore((state) => state.hydrate);

  useEffect(() => {
    if (!isHydrated) {
      hydrate();
    }
  }, [isHydrated, hydrate]);

  const query = useQuery<FoodItem[]>({
    queryKey: RECIPES_QUERY_KEY,
    queryFn: () => recipesApi.getRecipes(),
    initialData: MOCK_RECIPES,
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
    queryKey: [...RECIPES_QUERY_KEY, id],
    queryFn: () => recipesApi.getRecipeById(id),
    initialData: () => customMatch ?? MOCK_RECIPES.find((r) => r.id === id) ?? null,
    enabled: !customMatch,
  });

  return {
    ...query,
    data: customMatch ?? query.data ?? null,
  };
}
