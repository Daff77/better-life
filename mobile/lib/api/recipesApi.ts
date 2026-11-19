import { FoodItem, FoodItemSchema } from "@/lib/schemas";
import { MOCK_RECIPES } from "@/data/mockRecipes";
import { sessionStorage } from "@/lib/sessionStorage";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { API_BASE_URL } from "./config";

function applyOfflineEntitlementGate(recipe: FoodItem): FoodItem {
  const isPremiumMember = useSubscriptionStore.getState().isPremium;
  if (recipe.isPremium && !isPremiumMember) {
    return {
      ...recipe,
      instructions: [
        {
          step: 1,
          text: "Unlock full chef recipe & timer with Better Life Premium.",
        },
      ],
    };
  }
  return recipe;
}

export const recipesApi = {
  getRecipes: async (): Promise<FoodItem[]> => {
    try {
      const session = await sessionStorage.getSession();
      const headers: Record<string, string> = {};
      if (session?.token) {
        headers.Authorization = `Bearer ${session.token}`;
      }
      const res = await fetch(`${API_BASE_URL}/recipes`, { headers });
      if (res.ok) {
        const data = await res.json();
        return data.map((item: any) => FoodItemSchema.parse(item));
      }
    } catch {
      // Graceful fallback to mock data if backend server is unreachable
    }
    return MOCK_RECIPES.map((recipe) => applyOfflineEntitlementGate(FoodItemSchema.parse(recipe)));
  },

  getRecipeById: async (id: string): Promise<FoodItem | null> => {
    try {
      const session = await sessionStorage.getSession();
      const headers: Record<string, string> = {};
      if (session?.token) {
        headers.Authorization = `Bearer ${session.token}`;
      }
      const res = await fetch(`${API_BASE_URL}/recipes/${encodeURIComponent(id)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        return FoodItemSchema.parse(data);
      }
    } catch {
      // Graceful fallback to mock data if backend server is unreachable
    }
    const found = MOCK_RECIPES.find((r) => r.id === id);
    if (!found) return null;
    return applyOfflineEntitlementGate(FoodItemSchema.parse(found));
  },
};
