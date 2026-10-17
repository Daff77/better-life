export interface FoodItem {
  id: string;
  title: string;
  category: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Drink";
  calories: number;
  prepTimeMinutes: number;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  svgIcon: "Breakfast" | "Lunch" | "Dinner" | "Snacks" | "Drinks";
  imageUrl?: string;
  estimatedCostIdr?: number;
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
    imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80",
    estimatedCostIdr: 28000,
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
    id: "avocado-toast",
    title: "Avocado Sourdough & Poached Egg",
    category: "Breakfast",
    calories: 385,
    prepTimeMinutes: 12,
    difficulty: "Easy",
    description: "Toasted artisan sourdough with smashed Hass avocado, farm poached egg, chili flakes, and microgreens.",
    svgIcon: "Breakfast",
    imageUrl: "https://images.unsplash.com/photo-1603046891726-36bfd957e0bf?auto=format&fit=crop&w=800&q=80",
    estimatedCostIdr: 25000,
    nutrition: {
      proteinGrams: 16,
      carbsGrams: 34,
      fatGrams: 21,
      fiberGrams: 9,
    },
    ingredients: [
      { name: "Artisan Sourdough Bread", amount: "2 slices" },
      { name: "Ripe Hass Avocado", amount: "1 medium" },
      { name: "Free-range Farm Egg", amount: "1 large" },
      { name: "Lime Juice & Red Pepper Flakes", amount: "to taste" },
      { name: "Fresh Microgreens / Coriander", amount: "1 tbsp" },
    ],
    instructions: [
      { step: 1, text: "Toast sourdough slices until golden brown and crispy." },
      { step: 2, text: "Mash avocado in a bowl with lime juice, sea salt, and crushed black pepper." },
      { step: 3, text: "Poach the egg in gently simmering water with a splash of vinegar for 3 minutes.", timerMinutes: 3 },
      { step: 4, text: "Spread creamy avocado over toast, crown with poached egg, and sprinkle chili flakes." },
    ],
  },
  {
    id: "smoothie-bowl",
    title: "Acai Berry & Chia Smoothie Bowl",
    category: "Breakfast",
    calories: 290,
    prepTimeMinutes: 8,
    difficulty: "Easy",
    description: "Thick antioxidant acai blend topped with sliced fresh banana, blueberries, chia seeds, and coconut flakes.",
    svgIcon: "Breakfast",
    imageUrl: "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?auto=format&fit=crop&w=800&q=80",
    estimatedCostIdr: 32000,
    nutrition: {
      proteinGrams: 9,
      carbsGrams: 48,
      fatGrams: 8,
      fiberGrams: 11,
    },
    ingredients: [
      { name: "Frozen Acai Puree or Berries", amount: "150 g" },
      { name: "Ripe Cavendish Banana", amount: "1 medium" },
      { name: "Unsweetened Almond Milk", amount: "100 ml" },
      { name: "Raw Chia Seeds & Toasted Coconut", amount: "1 tbsp each" },
    ],
    instructions: [
      { step: 1, text: "Blend frozen acai, half banana, and almond milk on high until smooth and thick." },
      { step: 2, text: "Pour into a chilled serving bowl." },
      { step: 3, text: "Arrange remaining sliced banana, fresh blueberries, chia seeds, and coconut flakes on top." },
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
    imageUrl: "https://images.unsplash.com/photo-1602881916963-5daf2d97c06e?auto=format&fit=crop&w=800&q=80",
    estimatedCostIdr: 24000,
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
    id: "tempeh-tofu-bowl",
    title: "Turmeric Tempeh & Tofu Bowl",
    category: "Lunch",
    calories: 460,
    prepTimeMinutes: 15,
    difficulty: "Easy",
    description: "High-protein Indonesian tempeh and yellow tofu pan-sautéed with aromatic turmeric, garlic, and fresh green beans.",
    svgIcon: "Lunch",
    imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
    estimatedCostIdr: 14000,
    nutrition: {
      proteinGrams: 32,
      carbsGrams: 52,
      fatGrams: 14,
      fiberGrams: 9,
    },
    ingredients: [
      { name: "Fresh Soybean Tempeh", amount: "120 g" },
      { name: "Yellow Organic Tofu", amount: "100 g" },
      { name: "Steamed White or Red Rice", amount: "1 cup" },
      { name: "Green Beans (Buncis)", amount: "50 g" },
      { name: "Turmeric & Shallot Marinade", amount: "1 tbsp" },
    ],
    instructions: [
      { step: 1, text: "Dice tempeh and tofu into bite-sized 2cm cubes." },
      { step: 2, text: "Sauté with minced garlic, shallots, and fresh turmeric in a teaspoon of coconut oil until golden.", timerMinutes: 6 },
      { step: 3, text: "Toss in sliced green beans and cook for 3 minutes." },
      { step: 4, text: "Serve over warm rice for an affordable complete plant protein meal." },
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
    imageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80",
    estimatedCostIdr: 55000,
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
    id: "beef-bowl",
    title: "Garlic Herb Beef & Quinoa Bowl",
    category: "Dinner",
    calories: 610,
    prepTimeMinutes: 22,
    difficulty: "Medium",
    description: "Lean sirloin beef strips seared with roasted garlic and herbs, accompanied by steamed broccoli and fluffy quinoa.",
    svgIcon: "Dinner",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
    estimatedCostIdr: 45000,
    nutrition: {
      proteinGrams: 46,
      carbsGrams: 42,
      fatGrams: 22,
      fiberGrams: 8,
    },
    ingredients: [
      { name: "Lean Sirloin Beef Strips", amount: "180 g" },
      { name: "Steamed Quinoa or Jasmine Rice", amount: "1 cup" },
      { name: "Fresh Broccoli Florets", amount: "100 g" },
      { name: "Garlic & Rosemary Infused Oil", amount: "1 tbsp" },
      { name: "Low-sodium Tamari Sauce", amount: "1 tbsp" },
    ],
    instructions: [
      { step: 1, text: "Steam broccoli florets until bright green and tender-crisp (approx 4 minutes).", timerMinutes: 4 },
      { step: 2, text: "Sear beef strips on high heat with garlic oil for 3-4 minutes until caramelised.", timerMinutes: 4 },
      { step: 3, text: "Deglaze pan with tamari and toss briefly." },
      { step: 4, text: "Assemble in a bowl with quinoa, broccoli, and drizzle with pan juices." },
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
    imageUrl: "https://images.unsplash.com/photo-1508736793122-f516e3ba5569?auto=format&fit=crop&w=800&q=80",
    estimatedCostIdr: 15000,
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
    id: "boiled-eggs-edamame",
    title: "Omega-3 Eggs & Steamed Edamame",
    category: "Snack",
    calories: 210,
    prepTimeMinutes: 8,
    difficulty: "Easy",
    description: "Quick protein booster featuring two soft-boiled farm eggs and lightly salted steamed edamame pods.",
    svgIcon: "Snacks",
    imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80",
    estimatedCostIdr: 10000,
    nutrition: {
      proteinGrams: 18,
      carbsGrams: 12,
      fatGrams: 11,
      fiberGrams: 5,
    },
    ingredients: [
      { name: "Omega-3 Farm Eggs", amount: "2 large" },
      { name: "Green Edamame Pods", amount: "80 g" },
      { name: "Sea Salt & Black Pepper", amount: "to taste" },
    ],
    instructions: [
      { step: 1, text: "Boil eggs for 6.5 minutes for jammy soft yolks, then plunge into cold water.", timerMinutes: 7 },
      { step: 2, text: "Steam edamame pods for 5 minutes with a pinch of sea salt.", timerMinutes: 5 },
      { step: 3, text: "Peel eggs, slice in half, and enjoy fresh." },
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
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80",
    estimatedCostIdr: 8000,
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
