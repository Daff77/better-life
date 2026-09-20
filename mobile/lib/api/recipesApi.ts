import { FoodItem, FoodItemSchema } from "@/lib/schemas";
import { MOCK_RECIPES } from "@/data/mockRecipes";
import { API_BASE_URL } from "./config";

export const recipesApi = {
  getRecipes: async (): Promise<FoodItem[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}/recipes`);
      if (res.ok) {
        const data = await res.json();
        return data.map((item: any) => FoodItemSchema.parse(item));
      }
    } catch (err) {
      // Graceful fallback to mock data if backend server is unreachable
      console.log("[recipesApi] Backend unreachable, using local fallback");
    }
    return MOCK_RECIPES.map((recipe) => FoodItemSchema.parse(recipe));
  },

  getRecipeById: async (id: string): Promise<FoodItem | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/recipes/${id}`);
      if (res.ok) {
        const data = await res.json();
        return FoodItemSchema.parse(data);
      }
    } catch (err) {
      console.log("[recipesApi] Backend unreachable, using local fallback");
    }
    const found = MOCK_RECIPES.find((r) => r.id === id);
    if (!found) return null;
    return FoodItemSchema.parse(found);
  },
};
