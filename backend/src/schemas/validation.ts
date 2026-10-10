import { z } from "zod";

export const RegisterInputSchema = z.object({
  name: z.string().min(2, "Name must have at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(8, "Phone number is too short"),
  password: z.string().min(6, "Password must have at least 6 characters"),
});

export const LoginInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must have at least 6 characters"),
});

export const GoogleAuthInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
  photoUrl: z.string().optional(),
  idToken: z.string().optional(),
});

export const UpdateProfileInputSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(8).optional(),
});

export const PersonalizationInputSchema = z.object({
  goal: z.enum(["Eat balanced", "Lose weight", "Gain muscle"]),
  weight: z.number().min(30).max(300),
  height: z.number().min(100).max(250),
  gender: z.enum(["Female", "Male"]),
  birthDate: z.object({
    day: z.number().min(1).max(31),
    month: z.string(),
    year: z.number().min(1920).max(2025),
  }),
  cookingSkill: z.enum(["Low", "Middle", "High"]),
  dietType: z.string(),
  allergies: z.array(z.string()),
  targetCalories: z.number().positive(),
});

export const LogMealInputSchema = z.object({
  type: z.enum(["Breakfast", "Lunch", "Dinner", "Snack", "Drink"]),
  name: z.string().min(1, "Meal name cannot be empty"),
  calories: z.number().nonnegative(),
});

export const AddStepsInputSchema = z.object({
  steps: z.number().positive(),
});
