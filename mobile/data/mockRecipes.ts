export interface FoodItem {
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

export const MOCK_RECIPES: FoodItem[] = [
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
      {
        step: 1,
        text: "Wash the berries (if frozen, let soften for 2–3 minutes). Slice large strawberries.",
      },
      {
        step: 2,
        text: "Take a serving glass or bowl. Add ⅓ of the Greek yogurt to the bottom.",
      },
      {
        step: 3,
        text: "Sprinkle half of the fresh berries evenly on top of the yogurt layer.",
      },
      {
        step: 4,
        text: "Add another layer of yogurt until it smoothly covers the berries.",
      },
      {
        step: 5,
        text: "Top with the remaining berries and generously sprinkle chia seeds on top.",
      },
      {
        step: 6,
        text: "Mix lightly before eating or let sit for 5–10 minutes to form a pudding-like texture.",
        timerMinutes: 10,
      },
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
      {
        step: 1,
        text: "Pat salmon dry with paper towels. Season both sides with sea salt, black pepper, and lemon zest.",
      },
      {
        step: 2,
        text: "Heat olive oil in a non-stick skillet over medium-high heat until shimmering.",
      },
      {
        step: 3,
        text: "Sear salmon skin-side down for 4 minutes until golden and crispy.",
        timerMinutes: 4,
      },
      {
        step: 4,
        text: "Flip carefully and cook for an additional 3-4 minutes until medium-rare to medium.",
        timerMinutes: 3,
      },
      {
        step: 5,
        text: "Plate alongside warm quinoa and sautéed asparagus. Drizzle with fresh lemon juice.",
      },
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
      {
        step: 1,
        text: "Marinate chicken breast with minced garlic, oregano, lemon juice, and olive oil.",
      },
      {
        step: 2,
        text: "Grill over medium flame for 6–7 minutes each side until thoroughly cooked (75°C internally).",
        timerMinutes: 7,
      },
      {
        step: 3,
        text: "Let rest for 5 minutes, then slice diagonally.",
      },
      {
        step: 4,
        text: "Assemble over warm brown rice with sliced cucumbers, tomatoes, and parsley.",
      },
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
      {
        step: 1,
        text: "Wash and core the green apple. Slice into thin wedges.",
      },
      {
        step: 2,
        text: "Dust lightly with ground cinnamon.",
      },
      {
        step: 3,
        text: "Serve immediately with fresh whole roasted almonds for slow-release energy.",
      },
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
      {
        step: 1,
        text: "Gently muddle mint leaves at the bottom of a tall glass to release aromatic oils.",
      },
      {
        step: 2,
        text: "Add ice cubes, lemon slices, and cucumber ribbons.",
      },
      {
        step: 3,
        text: "Pour sparkling spring water over top and stir with a long spoon.",
      },
    ],
  },
];
