import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AppText,
  NutritionCard,
  ProgressBar,
  ProgressRing,
  AnimatedNumber,
  Badge,
  MealLogModal,
  MealCard,
  Button,
} from "@/components/ui";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import { useJournalStore, getTodayDateKey, computeJournalAggregates } from "@/stores/useJournalStore";
import { useActivityStats, useAddStepsMutation } from "@/hooks/useActivityQuery";
import { IconRenderer } from "@/constants/Assets";
import { MOCK_RECIPES, FoodItem } from "@/data/mockRecipes";

const getCategoryStyle = (category: string) => {
  switch (category) {
    case "Breakfast":
      return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", iconBg: "bg-amber-100" };
    case "Lunch":
      return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", iconBg: "bg-emerald-100" };
    case "Dinner":
      return { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", iconBg: "bg-indigo-100" };
    case "Snack":
    default:
      return { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200", iconBg: "bg-pink-100" };
  }
};

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const personalization = useOnboardingStore((state) => state.personalization);

  // Single Source of Truth: Central Journal Store with stable selector
  const todayDate = getTodayDateKey();
  const todayJournal = useJournalStore((state) => state.journals[todayDate]);
  const aggregates = useMemo(
    () => computeJournalAggregates(todayJournal, personalization.targetCalories),
    [todayJournal, personalization.targetCalories]
  );

  // Activity stats (pedometer / steps tracking)
  const { data: activity = { steps: 3420, stepGoal: 6000, exerciseCalories: 240, exerciseDurationMinutes: 35 } } = useActivityStats();
  const addStepsMutation = useAddStepsMutation();

  // Logging modal state for quick suggestion logs
  const [selectedMealForLog, setSelectedMealForLog] = useState<FoodItem | null>(null);
  const [isLogModalVisible, setIsLogModalVisible] = useState<boolean>(false);

  // Synchronize target calories from user's personalized profile into the active journal
  useEffect(() => {
    if (personalization.targetCalories && personalization.targetCalories > 0) {
      if (todayJournal && todayJournal.targetCalories !== personalization.targetCalories) {
        useJournalStore.getState().setTargetCalories(personalization.targetCalories, todayDate);
      }
    }
  }, [personalization.targetCalories, todayDate, todayJournal?.targetCalories]);

  // Derived progress percentage (0 - 100) capped at 100%
  const progressPercent = Math.min(
    100,
    Math.round(aggregates.progressRatio * 100)
  );

  // Dynamic greeting based on current local hour
  const currentHour = new Date().getHours();
  const greetingSubtitle =
    currentHour < 12
      ? "Good morning,"
      : currentHour < 18
      ? "Good afternoon,"
      : "Good evening,";

  const handleOpenLogModal = (meal: FoodItem) => {
    setSelectedMealForLog(meal);
    setIsLogModalVisible(true);
  };

  const handleResetDay = () => {
    Alert.alert(
      "Reset Today's Journal",
      "Are you sure you want to clear all meals logged today? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await useJournalStore.getState().clearDay(todayDate);
          },
        },
      ]
    );
  };

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* 1. Curved Green Header with Greeting (home-header) */}
        <View className="bg-primary pt-6 pb-12 px-6 rounded-b-[28px] shadow-sm">
          <View className="flex-row items-center justify-between max-w-[1120px] mx-auto w-full">
            <View>
              <AppText weight="semibold" className="text-sm text-white/90">
                {greetingSubtitle}
              </AppText>
              <AppText weight="extrabold" className="text-2xl text-white mt-0.5">
                {user?.name || "Friend"}
              </AppText>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(app)/(tabs)/profile")}
              className="w-11 h-11 rounded-full bg-white/20 border border-white/40 items-center justify-center transition-all duration-150 hover:bg-white/30"
              accessibilityRole="button"
              accessibilityLabel="View profile"
            >
              <IconRenderer name="Profile" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Responsive Container for Cards: Stacked on Mobile, 2-Column on Tablet/Desktop */}
        <View className="px-5 -mt-8 flex-col lg:flex-row gap-6 max-w-[1120px] mx-auto w-full">
          {/* Left Column: Calorie Progress, Activity, and Meal Suggestions */}
          <View className="flex-1">
            {/* 2. Main Calorie Progress Card (Synchronized with useJournalStore) */}
            <View>
              <View className="p-6 rounded-3xl bg-emerald-50/50 border border-emerald-100/90 mb-5 shadow-sm">
                <View className="flex-row items-center justify-between">
                  {/* Left Metrics */}
                  <View className="flex-1 pr-3">
                    <View className="bg-emerald-100/70 px-2.5 py-0.5 rounded-full self-start mb-2 border border-emerald-200/60">
                      <AppText weight="bold" className="text-[10px] text-emerald-800 uppercase tracking-wider">
                        Today's Budget • {aggregates.targetCalories} kcal
                      </AppText>
                    </View>

                    <AppText weight="extrabold" className="text-xs text-neutral-muted uppercase tracking-wider mb-0.5">
                      Consumed
                    </AppText>
                    <View className="flex-row items-baseline mb-3">
                      <AnimatedNumber
                        value={aggregates.totalConsumed}
                        decimals={0}
                        weight="black"
                        className="text-4xl text-neutral-dark leading-none"
                      />
                      <AppText weight="bold" className="text-sm text-neutral-muted ml-1.5">
                        kcal
                      </AppText>
                    </View>

                    <View className="pt-2.5 border-t border-emerald-200/50 flex-row items-baseline justify-between">
                      <View>
                        <AppText weight="medium" className="text-xs text-neutral-muted">
                          Remaining
                        </AppText>
                        <View className="flex-row items-baseline mt-0.5">
                          <AnimatedNumber
                            value={aggregates.remainingCalories}
                            decimals={0}
                            weight="black"
                            className="text-primary text-xl"
                          />
                          <AppText weight="bold" className="text-xs text-primary/80 ml-1">
                            kcal
                          </AppText>
                        </View>
                      </View>

                      <View className="items-end">
                        <AppText weight="medium" className="text-xs text-neutral-muted">
                          Pace
                        </AppText>
                        <AppText weight="bold" className="text-xs text-neutral-dark mt-0.5">
                          {progressPercent}% logged
                        </AppText>
                      </View>
                    </View>
                  </View>

                  {/* Right Animated Circular Gauge */}
                  <View className="items-center justify-center pl-2">
                    <ProgressRing
                      progress={progressPercent}
                      size={128}
                      strokeWidth={12}
                      color="#22c55e"
                      backgroundColor="#dcfce7"
                      label="Progress"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* 3. Activity Section: Steps & Exercise Cards */}
            <View className="flex-row gap-3 mb-5">
              {/* Steps Card */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => addStepsMutation.mutate(500)}
                className={`flex-1 bg-teal-50/40 p-4 rounded-2xl border border-teal-100/70 shadow-sm justify-between transition-all duration-200 hover:shadow-md ${
                  Platform.OS === "web" ? "cursor-pointer" : ""
                }`}
                accessibilityRole="button"
                accessibilityLabel="Add 500 steps"
              >
                <View>
                  <View className="flex-row items-center justify-between mb-1.5">
                    <AppText weight="extrabold" className="text-sm text-neutral-dark">
                      Steps
                    </AppText>
                    <IconRenderer name="Shoe" size={18} />
                  </View>
                  <AnimatedNumber
                    value={activity.steps}
                    weight="black"
                    className="text-2xl text-neutral-dark mb-0.5"
                  />
                  <AppText weight="medium" className="text-xs text-neutral-muted mb-2.5">
                    Goal: {activity.stepGoal.toLocaleString()}
                  </AppText>
                </View>

                <ProgressBar
                  progress={activity.steps / activity.stepGoal}
                  color="#0d9488"
                  backgroundColor="#ccfbf1"
                  height={6}
                />
              </TouchableOpacity>

              {/* Exercise Summary Card */}
              <View className="flex-1 bg-amber-50/40 p-4 rounded-2xl border border-amber-100/70 shadow-sm justify-between">
                <View>
                  <View className="flex-row items-center justify-between mb-1.5">
                    <AppText weight="extrabold" className="text-sm text-neutral-dark">
                      Activity
                    </AppText>
                    <IconRenderer name="Fire" size={18} />
                  </View>
                  <View className="flex-row items-baseline mb-0.5">
                    <AnimatedNumber
                      value={activity.exerciseCalories}
                      weight="black"
                      className="text-2xl text-neutral-dark mr-1"
                    />
                    <AppText weight="bold" className="text-xs text-neutral-muted">
                      burn kcal
                    </AppText>
                  </View>
                </View>

                <View className="flex-row items-center pt-2 border-t border-amber-200/50">
                  <IconRenderer name="Clock" size={14} className="mr-1.5" />
                  <AppText weight="bold" className="text-xs text-neutral-dark">
                    0:{activity.exerciseDurationMinutes} hr active
                  </AppText>
                </View>
              </View>
            </View>

            {/* 4. Meal Suggestions Bar */}
            <View>
              <View className="flex-row items-center justify-between mt-1 mb-3">
                <View>
                  <AppText weight="extrabold" className="text-lg text-neutral-dark">
                    Meal Suggestions
                  </AppText>
                  <AppText weight="medium" className="text-xs text-neutral-muted">
                    Quick picks tailored to your remaining calories
                  </AppText>
                </View>

                <TouchableOpacity
                  onPress={() => router.push("/(app)/(tabs)/meals")}
                  className="py-1 px-2.5 rounded-full bg-secondary-soft hover:bg-secondary transition-colors"
                  accessibilityRole="link"
                  accessibilityLabel="View all daily meals"
                >
                  <AppText weight="bold" className="text-xs text-primary">
                    View Catalog ›
                  </AppText>
                </TouchableOpacity>
              </View>

              {/* Horizontal Scroll Meal Suggestions Carousel */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-5 -mx-2 px-2"
              >
                {MOCK_RECIPES.slice(0, 4).map((meal) => (
                  <View key={meal.id} className="mr-3.5 w-[260px]">
                    <MealCard
                      title={meal.title}
                      mealType={meal.category}
                      calories={meal.calories}
                      description={meal.description}
                      prepTimeMinutes={meal.prepTimeMinutes}
                      svgElement={<IconRenderer name={meal.svgIcon} size={88} />}
                      onLogMeal={() => handleOpenLogModal(meal)}
                      onPress={() =>
                        router.push({
                          pathname: "/(app)/recipe-detail",
                          params: { id: meal.id },
                        })
                      }
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Right Column: Calorie Journal • Today's Logged Meals Feed */}
          <View className="w-full lg:w-[420px]">
            <View>
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <View className="flex-row items-baseline">
                    <AppText weight="extrabold" className="text-lg text-neutral-dark mr-1.5">
                      Today's Journal
                    </AppText>
                    <AppText weight="bold" className="text-xs text-neutral-muted">
                      ({todayJournal.entries.length} logged)
                    </AppText>
                  </View>
                  <AppText weight="medium" className="text-xs text-neutral-muted">
                    Daily breakdown by meal slot
                  </AppText>
                </View>

                {todayJournal.entries.length > 0 && (
                  <TouchableOpacity
                    onPress={handleResetDay}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    className="flex-row items-center py-1 px-2.5 rounded-full bg-status-error/10 border border-status-error/20 hover:bg-status-error/20 transition-colors"
                    accessibilityRole="button"
                    accessibilityLabel="Reset today's journal entries"
                  >
                    <AppText weight="bold" className="text-xs text-status-error">
                      Clear Day
                    </AppText>
                  </TouchableOpacity>
                )}
              </View>

              {/* Empty State vs Unified Logged Entries Container */}
              {todayJournal.entries.length === 0 ? (
                <View className="py-10 px-6 items-center justify-center bg-neutral-surface border border-dashed border-neutral-border rounded-3xl">
                  <View className="w-14 h-14 rounded-2xl bg-secondary-soft items-center justify-center mb-3 border border-secondary">
                    <IconRenderer name="Cook" size={28} />
                  </View>
                  <AppText weight="black" className="text-base text-neutral-dark mb-1 text-center">
                    No meals logged yet today
                  </AppText>
                  <AppText weight="medium" className="text-xs text-neutral-muted text-center max-w-[240px] mb-4 leading-relaxed">
                    Ready for your first meal? Log breakfast, lunch, dinner or snacks to start tracking.
                  </AppText>
                  <Button
                    title="+ Log First Meal"
                    variant="primary"
                    size="sm"
                    onPress={() => router.push("/(app)/(tabs)/meals")}
                    accessibilityLabel="Navigate to Meals to log food"
                  />
                </View>
              ) : (
                <View className="bg-white rounded-2xl border border-neutral-border-light shadow-sm overflow-hidden divide-y divide-neutral-border-light/60">
                  {todayJournal.entries.map((item) => {
                    const catStyle = getCategoryStyle(item.category);
                    return (
                      <View
                        key={item.id}
                        className={`p-3.5 flex-row items-center justify-between transition-colors duration-150 hover:bg-neutral-surface/60 ${
                          Platform.OS === "web" ? "cursor-default" : ""
                        }`}
                      >
                        <View className="flex-row items-center gap-x-3 flex-1 mr-2">
                          <View className={`w-10 h-10 rounded-xl ${catStyle.iconBg} items-center justify-center border border-black/5`}>
                            <IconRenderer
                              name={
                                item.category === "Breakfast"
                                  ? "Breakfast"
                                  : item.category === "Lunch"
                                  ? "Lunch"
                                  : item.category === "Dinner"
                                  ? "Dinner"
                                  : "Snacks"
                              }
                              size={20}
                            />
                          </View>
                          <View className="flex-1">
                            <AppText weight="extrabold" numberOfLines={1} className="text-sm text-neutral-dark">
                              {item.title}
                            </AppText>
                            <View className="flex-row items-center gap-1.5 mt-0.5">
                              <View className={`px-2 py-0.5 rounded-md ${catStyle.bg} border ${catStyle.border}`}>
                                <AppText weight="bold" className={`text-[10px] ${catStyle.text}`}>
                                  {item.category}
                                </AppText>
                              </View>
                              {item.quantity > 1 && (
                                <AppText weight="medium" className="text-[11px] text-neutral-muted">
                                  • {item.quantity} portions
                                </AppText>
                              )}
                            </View>
                          </View>
                        </View>
                        <View className="items-end">
                          <AppText weight="black" className="text-sm text-primary">
                            +{item.calories}{" "}
                            <AppText weight="bold" className="text-xs text-neutral-muted">
                              kcal
                            </AppText>
                          </AppText>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Reusable MealLogModal for quick suggestion logs */}
      <MealLogModal
        visible={isLogModalVisible}
        meal={selectedMealForLog}
        onClose={() => setIsLogModalVisible(false)}
      />
    </ScreenWrapper>
  );
}
