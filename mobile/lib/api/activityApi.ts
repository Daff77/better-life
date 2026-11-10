import { ActivityStats, ActivityStatsSchema } from "@/lib/schemas";

let mockActivityDatabase: ActivityStats = {
  // Starts empty: no step tracker is connected yet, so no number is invented.
  steps: 0,
  stepGoal: 6000,
  exerciseCalories: 0,
  exerciseDurationMinutes: 0,
  waterGlasses: 0,
  waterGoal: 8,
};

export const activityApi = {
  getActivityStats: async (): Promise<ActivityStats> => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { ...mockActivityDatabase };
  },

  addSteps: async (count: number): Promise<ActivityStats> => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    mockActivityDatabase = {
      ...mockActivityDatabase,
      steps: Math.min(mockActivityDatabase.stepGoal + 2000, mockActivityDatabase.steps + count),
    };
    ActivityStatsSchema.parse(mockActivityDatabase);
    return { ...mockActivityDatabase };
  },

  addWater: async (glasses = 1): Promise<ActivityStats> => {
    await new Promise((resolve) => setTimeout(resolve, 40));
    mockActivityDatabase = {
      ...mockActivityDatabase,
      waterGlasses: Math.min(16, (mockActivityDatabase.waterGlasses ?? 0) + glasses),
    };
    ActivityStatsSchema.parse(mockActivityDatabase);
    return { ...mockActivityDatabase };
  },
};
