export interface OnboardingGoal {
  id: string;
  title: string;
  subtitle: string;
  calorieAdjustment: number;
}

export const ONBOARDING_GOALS: OnboardingGoal[] = [
  {
    id: "eat-balanced",
    title: "Eat balanced",
    subtitle: "Maintain current weight and build healthy, sustainable nutrition habits.",
    calorieAdjustment: 0,
  },
  {
    id: "lose-weight",
    title: "Lose weight",
    subtitle: "Gradual, healthy fat reduction with balanced macronutrient targets.",
    calorieAdjustment: -400,
  },
  {
    id: "gain-muscle",
    title: "Gain muscle",
    subtitle: "Hypertrophy-focused nutrition target with high protein intake.",
    calorieAdjustment: 350,
  },
];

export const DIET_TYPES = [
  { id: "omnivore", name: "Omnivore", description: "I eat meat and almost everything" },
  { id: "vegetarian", name: "Vegetarian", description: "No meat or poultry, includes dairy & eggs" },
  { id: "vegan", name: "Vegan", description: "100% plant-based nutrition" },
  { id: "keto", name: "Ketogenic", description: "Low carb, high healthy fats" },
  { id: "mediterranean", name: "Mediterranean", description: "Rich in olive oil, fish, and greens" },
];

export const COMMON_ALLERGIES = [
  { id: "gluten", name: "Gluten" },
  { id: "lactose", name: "Lactose" },
  { id: "seafood", name: "Seafood" },
  { id: "egg", name: "Eggs" },
  { id: "nuts", name: "Peanuts / Tree Nuts" },
];
