import { setAccountScope, accountRevision } from "./accountScope";
import { abortActiveJournalSync } from "./journalSync";

export async function activateAccount(email?: string) {
  // Abort any in-flight sync request belonging to the previous account before switching scope
  abortActiveJournalSync();

  setAccountScope(email);
  const revision = accountRevision();

  const { queryClient } = require("./queryClient");
  void queryClient.cancelQueries();
  queryClient.clear();

  const { useJournalStore } = require("../stores/useJournalStore");
  const { useOnboardingStore } = require("../stores/useOnboardingStore");
  const { useAnalyticsStore } = require("../stores/useAnalyticsStore");
  const { useMealPlannerStore } = require("../stores/useMealPlannerStore");
  const { useSubscriptionStore } = require("../stores/useSubscriptionStore");
  const { useCustomRecipesStore } = require("../stores/useCustomRecipesStore");
  const { useReminderStore } = require("../stores/useReminderStore");
  const { useFavoritesStore } = require("../stores/useFavoritesStore");

  useJournalStore.setState(useJournalStore.getInitialState());
  useOnboardingStore.setState(useOnboardingStore.getInitialState());
  useCustomRecipesStore.setState(useCustomRecipesStore.getInitialState());
  useAnalyticsStore.setState(useAnalyticsStore.getInitialState());
  useMealPlannerStore.setState(useMealPlannerStore.getInitialState());
  useSubscriptionStore.getState().resetState();
  useFavoritesStore.getState().resetForLogout();

  require("./api/subscriptionApi").resetSubscriptionCache();
  require("./api/mealPlannerApi").resetMealPlanCache();

  if (!email) {
    await useReminderStore.getState().resetForLogout();
  }

  await useOnboardingStore.getState().initializePersonalization();
  if (revision !== accountRevision()) return;

  await useJournalStore.getState().initialize();
  if (revision !== accountRevision()) return;

  await useCustomRecipesStore.getState().hydrate();
  if (revision !== accountRevision()) return;

  if (email) {
    await Promise.all([
      useReminderStore.getState().hydrateForAccount(),
      useFavoritesStore.getState().hydrateForAccount(),
    ]);
    if (revision !== accountRevision()) return;
    void useSubscriptionStore.getState().fetchStatus();
  }
}
