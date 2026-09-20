import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activityApi } from "@/lib/api/activityApi";
import { ActivityStats } from "@/lib/schemas";

export const ACTIVITY_QUERY_KEY = ["activity", "stats"];

export function useActivityStats() {
  return useQuery({
    queryKey: ACTIVITY_QUERY_KEY,
    queryFn: () => activityApi.getActivityStats(),
    initialData: {
      steps: 3420,
      stepGoal: 6000,
      exerciseCalories: 240,
      exerciseDurationMinutes: 35,
    },
  });
}

export function useAddStepsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (count: number) => activityApi.addSteps(count),
    onSuccess: (updated) => {
      queryClient.setQueryData<ActivityStats>(ACTIVITY_QUERY_KEY, updated);
      queryClient.invalidateQueries({ queryKey: ACTIVITY_QUERY_KEY });
    },
  });
}
