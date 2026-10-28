import { API_BASE_URL } from "./config";
import {
  MealPlanPreferences,
  MealPlanRecord,
  MealSlot,
  SubstitutionCandidate,
} from "../mealPlannerDomain";
import { MOCK_RECIPES } from "../../data/mockRecipes";

export interface MealPlanPreviewResponse {
  feature: string;
  description: string;
  entitlementRequired: string;
  sampleDay: any;
  sampleSummary: any;
  capabilities: string[];
}

export const mealPlannerApi = {
  /**
   * Fetch free preview information
   */
  async getPreview(): Promise<MealPlanPreviewResponse> {
    const res = await fetch(`${API_BASE_URL}/meal-plans/preview`);
    if (!res.ok) {
      throw new Error(`Failed to load meal plan preview (${res.status})`);
    }
    return res.json();
  },

  /**
   * Fetch user's saved active meal plan
   */
  async getSavedPlan(token?: string | null): Promise<MealPlanRecord | null> {
    if (!token) return null;

    const res = await fetch(`${API_BASE_URL}/meal-plans/saved`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch saved meal plan (${res.status})`);
    }

    return res.json();
  },

  /**
   * Generate a fresh 7-day personalized meal plan
   */
  async generatePlan(
    preferences: MealPlanPreferences,
    token?: string | null
  ): Promise<MealPlanRecord> {
    if (!token) {
      throw new Error("Authentication required to generate meal plans");
    }

    const res = await fetch(`${API_BASE_URL}/meal-plans/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferences),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to generate meal plan (${res.status})`);
    }

    return res.json();
  },

  /**
   * Save an existing or customized meal plan
   */
  async savePlan(
    plan: MealPlanRecord,
    token?: string | null
  ): Promise<MealPlanRecord> {
    if (!token) {
      throw new Error("Authentication required to save meal plans");
    }

    const res = await fetch(`${API_BASE_URL}/meal-plans/save`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(plan),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to save meal plan (${res.status})`);
    }

    const data = await res.json();
    return data.plan || plan;
  },

  /**
   * Fetch alternative substitutions for a meal slot
   */
  async getSubstitutions(
    slot: MealSlot,
    currentRecipeId: string,
    preferences?: MealPlanPreferences,
    token?: string | null
  ): Promise<SubstitutionCandidate[]> {
    if (!token) return [];

    const res = await fetch(`${API_BASE_URL}/meal-plans/substitute`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slot,
        currentRecipeId,
        preferences,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch substitutions (${res.status})`);
    }

    const data = await res.json();
    return data.substitutions || [];
  },

  /**
   * Replace a meal slot on a specific day
   */
  async replaceMeal(
    dayIndex: number,
    slot: MealSlot,
    newRecipeId: string,
    currentPlan: MealPlanRecord,
    token?: string | null
  ): Promise<MealPlanRecord> {
    if (!token) {
      throw new Error("Authentication required to replace meals");
    }

    const res = await fetch(`${API_BASE_URL}/meal-plans/replace-meal`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dayIndex,
        slot,
        newRecipeId,
        currentPlan,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Failed to replace meal (${res.status})`);
    }

    return res.json();
  },
};
