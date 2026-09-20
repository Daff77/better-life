export interface FoodItemData {
  id: string;
  title: string;
  category: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Drink";
  calories: number;
  prepTimeMinutes: number;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  svgIcon: "Breakfast" | "Lunch" | "Dinner" | "Snacks" | "Drinks";
  nutrition: {
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    fiberGrams: number;
  };
  ingredients: {
    name: string;
    amount: string;
  }[];
  instructions: {
    step: number;
    text: string;
    timerMinutes?: number;
  }[];
}

export const INITIAL_RECIPES: FoodItemData[] = [
  {
    id: "parfait",
    title: "Greek-Yogurt Berry Parfait",
    category: "Breakfast",
    calories: 320,
    prepTimeMinutes: 10,
    difficulty: "Easy",
    description: "Layered organic Greek yogurt, antioxidant berries, chia seeds, and raw blossom honey.",
    svgIcon: "Breakfast",
    nutrition: {
      proteinGrams: 22,
      carbsGrams: 38,
      fatGrams: 6,
      fiberGrams: 8,
    },
    ingredients: [
      { name: "Greek Yogurt (Non-fat or Low-fat)", amount: "200 g" },
      { name: "Fresh Strawberries & Blueberries", amount: "100 g" },
      { name: "Raw Chia Seeds", amount: "1 tbsp" },
      { name: "Natural Blossom Honey", amount: "1 tsp" },
    ],
    instructions: [
      { step: 1, text: "Wash the berries. Slice large strawberries." },
      { step: 2, text: "Add ⅓ of the Greek yogurt to a serving glass." },
      { step: 3, text: "Sprinkle half of the berries on top." },
      { step: 4, text: "Add another layer of yogurt." },
      { step: 5, text: "Top with remaining berries and chia seeds." },
    ],
  },
  {
    id: "grilled-salmon",
    title: "Pan-Seared Atlantic Salmon",
    category: "Dinner",
    calories: 520,
    prepTimeMinutes: 20,
    difficulty: "Medium",
    description: "Fresh Atlantic salmon fillet paired with steamed fluffy quinoa and roasted asparagus.",
    svgIcon: "Dinner",
    nutrition: {
      proteinGrams: 42,
      carbsGrams: 32,
      fatGrams: 24,
      fiberGrams: 6,
    },
    ingredients: [
      { name: "Wild Atlantic Salmon Fillet", amount: "180 g" },
      { name: "Cooked Organic Quinoa", amount: "1 cup" },
      { name: "Fresh Asparagus Spears", amount: "8 spears" },
      { name: "Extra Virgin Olive Oil", amount: "1 tbsp" },
      { name: "Lemon & Sea Salt", amount: "to taste" },
    ],
    instructions: [
      { step: 1, text: "Pat salmon dry with paper towels. Season with sea salt and pepper." },
      { step: 2, text: "Sear in hot olive oil skin-side down for 4 minutes." },
      { step: 3, text: "Flip and cook for 3-4 minutes." },
      { step: 4, text: "Serve with warm quinoa and roasted asparagus." },
    ],
  },
  {
    id: "chicken-bowl",
    title: "Mediterranean Herb Chicken",
    category: "Lunch",
    calories: 580,
    prepTimeMinutes: 25,
    difficulty: "Medium",
    description: "Tender grilled chicken breast, crisp cucumbers, cherry tomatoes, and warm brown rice.",
    svgIcon: "Lunch",
    nutrition: {
      proteinGrams: 48,
      carbsGrams: 45,
      fatGrams: 18,
      fiberGrams: 7,
    },
    ingredients: [
      { name: "Boneless Chicken Breast", amount: "200 g" },
      { name: "Steamed Brown Rice", amount: "1 cup" },
      { name: "Cherry Tomatoes & Cucumber", amount: "120 g" },
      { name: "Oregano, Garlic & Olive Oil", amount: "1 tbsp" },
    ],
    instructions: [
      { step: 1, text: "Marinate chicken with garlic, oregano, and olive oil." },
      { step: 2, text: "Grill for 6-7 minutes on each side." },
      { step: 3, text: "Rest for 5 minutes and slice." },
      { step: 4, text: "Serve over warm brown rice with fresh veggies." },
    ],
  },
  {
    id: "almond-apple",
    title: "Roasted Almonds & Green Apple",
    category: "Snack",
    calories: 190,
    prepTimeMinutes: 3,
    difficulty: "Easy",
    description: "Crunchy oven-roasted whole almonds paired with crisp green Granny Smith apple slices.",
    svgIcon: "Snacks",
    nutrition: {
      proteinGrams: 6,
      carbsGrams: 22,
      fatGrams: 10,
      fiberGrams: 5,
    },
    ingredients: [
      { name: "Unsalted Roasted Almonds", amount: "25 g" },
      { name: "Green Granny Smith Apple", amount: "1 medium" },
      { name: "Ground Cinnamon", amount: "pinch" },
    ],
    instructions: [
      { step: 1, text: "Wash and slice apple into wedges." },
      { step: 2, text: "Dust with cinnamon and serve with almonds." },
    ],
  },
  {
    id: "lemon-mint-infusion",
    title: "Infused Lemon Mint Sparkler",
    category: "Drink",
    calories: 45,
    prepTimeMinutes: 5,
    difficulty: "Easy",
    description: "Electrolyte-rich sparkling water infused with fresh lemon wedges, cucumber, and bruised mint.",
    svgIcon: "Drinks",
    nutrition: {
      proteinGrams: 1,
      carbsGrams: 10,
      fatGrams: 0,
      fiberGrams: 2,
    },
    ingredients: [
      { name: "Sparkling Spring Water", amount: "350 ml" },
      { name: "Organic Lemon Slices", amount: "3 slices" },
      { name: "Fresh Mint Leaves", amount: "6 leaves" },
      { name: "Cucumber Ribbons", amount: "3 ribbons" },
    ],
    instructions: [
      { step: 1, text: "Muddle mint leaves gently in a tall glass." },
      { step: 2, text: "Add ice, lemon, and cucumber ribbons." },
      { step: 3, text: "Top with sparkling water and stir." },
    ],
  },
];
