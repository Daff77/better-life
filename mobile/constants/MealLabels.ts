/** Indonesian display labels for meal categories stored in English in data and API. */
export const MEAL_CATEGORY_LABELS: Record<string, string> = {
  Semua: "Semua",
  Breakfast: "Sarapan",
  Lunch: "Makan siang",
  Dinner: "Makan malam",
  Snack: "Camilan",
  Snacks: "Camilan",
  Drink: "Minuman",
  Drinks: "Minuman",
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  Easy: "Mudah",
  Medium: "Sedang",
  Hard: "Sulit",
};

export const mealLabel = (category: string) => MEAL_CATEGORY_LABELS[category] ?? category;

