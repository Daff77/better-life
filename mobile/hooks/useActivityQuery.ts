import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activityApi } from "@/lib/api/activityApi";
import { activityDateKey } from "@/lib/activityDomain";
import { useAuthStore } from "@/stores/useAuthStore";

export const ACTIVITY_QUERY_KEY = ["activity", "stats"];
export const activityQueryKey = (account: string, date: string) => [
  ...ACTIVITY_QUERY_KEY,
  account,
  date,
];

export function useActivityIdentity() {
  const account = useAuthStore((s) => s.user?.id || s.user?.email || "guest");
  const [date, setDate] = useState(activityDateKey);
  useEffect(() => {
    const refresh = () => setDate(activityDateKey());
    const timer = setInterval(refresh, 1000);
    const subscription = AppState.addEventListener("change", refresh);
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
  return { account, date };
}

export function useActivityStats() {
  const { account, date } = useActivityIdentity();
  return useQuery({
    queryKey: activityQueryKey(account, date),
    queryFn: () => activityApi.getActivityStats(account, date),
  });
}

export function useSetStepsMutation() {
  const { account, date } = useActivityIdentity();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { account: string; date: string; total: number }) =>
      activityApi.setManualSteps(input.account, input.date, input.total),
    onSuccess: (stats, input) =>
      client.setQueryData(activityQueryKey(input.account, input.date), stats),
  });
  return {
    ...mutation,
    mutateAsync: (total: number) => mutation.mutateAsync({ account, date, total }),
  };
}

export function useAddWaterMutation() {
  const { account, date } = useActivityIdentity();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: { account: string; date: string; glasses: number }) =>
      activityApi.addWater(input.account, input.date, input.glasses),
    onSuccess: (stats, input) =>
      client.setQueryData(activityQueryKey(input.account, input.date), stats),
  });
  return {
    ...mutation,
    mutate: (glasses = 1) => mutation.mutate({ account, date, glasses }),
  };
}
