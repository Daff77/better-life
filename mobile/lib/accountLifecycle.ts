import { setAccountScope, accountRevision } from "./accountScope";

export async function activateAccount(email?: string) {
  setAccountScope(email);
  const revision = accountRevision();
  const { queryClient } = require("./queryClient");
  void queryClient.cancelQueries();
  queryClient.clear();
  const { useJournalStore } = require("../stores/useJournalStore");
  const { useOnboardingStore } = require("../stores/useOnboardingStore");
  useJournalStore.setState(useJournalStore.getInitialState());
  useOnboardingStore.setState(useOnboardingStore.getInitialState());
  const { useAnalyticsStore } = require("../stores/useAnalyticsStore");
  const { useMealPlannerStore } = require("../stores/useMealPlannerStore");
  const { useSubscriptionStore } = require("../stores/useSubscriptionStore");
  const { useCustomRecipesStore } = require("../stores/useCustomRecipesStore");
  useCustomRecipesStore.setState(useCustomRecipesStore.getInitialState());
  useAnalyticsStore.setState(useAnalyticsStore.getInitialState());
  useMealPlannerStore.setState(useMealPlannerStore.getInitialState());
  useSubscriptionStore.getState().resetState();
  require("./api/subscriptionApi").resetSubscriptionCache();
  require("./api/mealPlannerApi").resetMealPlanCache();
  await useOnboardingStore.getState().initializePersonalization();
  if (revision !== accountRevision()) return;
  await useJournalStore.getState().initialize();
  if (revision !== accountRevision()) return;
  await useCustomRecipesStore.getState().hydrate();
  if (revision !== accountRevision()) return;
  if (email) void useSubscriptionStore.getState().fetchStatus();
}
