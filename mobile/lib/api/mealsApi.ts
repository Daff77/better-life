import { LoggedMeal, LoggedMealSchema } from "@/lib/schemas";
import { sessionStorage } from "@/lib/sessionStorage";
import { API_BASE_URL } from "./config";

// In-memory mock database for logged meals, simulating a backend DB table
let mockMealsDatabase: LoggedMeal[] = [
  {
    id: "meal-1",
    type: "Breakfast",
    name: "Berry Yogurt Bowl with Honey & Chia",
    calories: 420,
    proteinGrams: 22,
    carbsGrams: 48,
    fatGrams: 8,
    fiberGrams: 6,
    quantity: 1,
    time: "08:30 AM",
  },
];

export const mealsApi = {
  getLoggedMeals: async (): Promise<LoggedMeal[]> => {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 50));
    return [...mockMealsDatabase];
  },

  logMeal: async (meal: Omit<LoggedMeal, "id" | "time">): Promise<LoggedMeal> => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newEntry: LoggedMeal = {
      ...meal,
      id: `meal-${Date.now()}`,
      time: timeStr,
    };
    LoggedMealSchema.parse(newEntry);
    mockMealsDatabase = [newEntry, ...mockMealsDatabase];
    return newEntry;
  },

  resetMeals: async (): Promise<void> => {
    mockMealsDatabase = [];
    const session = await sessionStorage.getSession();
    if (!session?.token) return;
    const res = await fetch(`${API_BASE_URL}/meals/reset-all`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
    });
    if (!res.ok && res.status !== 401) {
      throw new Error("Failed to clear meals on server");
    }
  },
};
