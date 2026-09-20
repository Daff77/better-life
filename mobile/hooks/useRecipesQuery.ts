import { useQuery } from "@tanstack/react-query";
import { recipesApi } from "@/lib/api/recipesApi";
import { FoodItem } from "@/lib/schemas";
import { MOCK_RECIPES } from "@/data/mockRecipes";

export const RECIPES_QUERY_KEY = ["recipes"];

export function useRecipes() {
  return useQuery<FoodItem[]>({
    queryKey: RECIPES_QUERY_KEY,
    queryFn: () => recipesApi.getRecipes(),
    initialData: MOCK_RECIPES,
  });
}

export function useRecipe(id: string) {
  return useQuery<FoodItem | null>({
    queryKey: [...RECIPES_QUERY_KEY, id],
    queryFn: () => recipesApi.getRecipeById(id),
    initialData: () => MOCK_RECIPES.find((r) => r.id === id) ?? null,
  });
}
