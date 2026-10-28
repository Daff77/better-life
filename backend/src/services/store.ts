import { INITIAL_RECIPES, FoodItemData } from "../data/seedData.js";

// Fast memory store with Postgres schema symmetry
export const inMemoryStore = {
  users: new Map<string, any>([
    [
      "user-1",
      {
        id: "user-1",
        name: "John Doe",
        email: "johndoe25@gmail.com",
        phone: "+62 812-3456-7890",
        passwordHash: "hashed_pass_placeholder",
        createdAt: new Date(),
      },
    ],
  ]),
  profiles: new Map<string, any>([
    [
      "user-1",
      {
        userId: "user-1",
        goal: "Eat balanced",
        weight: 65,
        height: 170,
        gender: "Female",
        birthDate: { day: 15, month: "June", year: 2000 },
        cookingSkill: "Middle",
        dietType: "Omnivore",
        allergies: ["Lactose"],
        targetCalories: 1950,
        onboardingCompleted: true,
      },
    ],
  ]),
  recipes: new Map<string, FoodItemData>(
    INITIAL_RECIPES.map((r) => [r.id, r])
  ),
  loggedMeals: new Map<string, any[]>([
    [
      "user-1",
      [
        {
          id: "meal-1",
          userId: "user-1",
          type: "Breakfast",
          name: "Berry Yogurt Bowl with Honey & Chia",
          calories: 420,
          time: "08:30 AM",
          loggedAt: new Date(),
        },
      ],
    ],
  ]),
  activity: new Map<string, any>([
    [
      "user-1",
      {
        userId: "user-1",
        date: new Date().toISOString().split("T")[0],
        steps: 3420,
        stepGoal: 6000,
        exerciseCalories: 240,
        exerciseDurationMinutes: 35,
      },
    ],
  ]),
  subscriptions: new Map<string, any>([
    [
      "user-1",
      {
        id: "sub-user-1",
        userId: "user-1",
        tier: "free",
        status: "free",
        planId: null,
        billingProvider: "mock_sandbox",
        externalSubscriptionId: null,
        externalCustomerId: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  ]),
  paymentEvents: new Map<string, any>(),
};
