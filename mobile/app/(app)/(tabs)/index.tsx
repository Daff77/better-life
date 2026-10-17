import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
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
import {
  useJournalStore,
  getTodayDateKey,
  computeJournalAggregates,
} from "@/stores/useJournalStore";
import { useActivityStats, useAddStepsMutation } from "@/hooks/useActivityQuery";
import { IconRenderer } from "@/constants/Assets";
import { MOCK_RECIPES, FoodItem } from "@/data/mockRecipes";

// Standard meal slot definitions for grouping journal entries
const MEAL_SLOTS = [
  {
    id: "Breakfast",
    label: "Breakfast",
    iconName: "Breakfast" as const,
    timeRange: "Morning",
    dotColor: "#f59e0b",
    bgColor: "bg-amber-50/50",
    borderColor: "border-amber-200/60",
    textColor: "text-amber-800",
  },
  {
    id: "Lunch",
    label: "Lunch",
    iconName: "Lunch" as const,
    timeRange: "Midday",
    dotColor: "#10b981",
    bgColor: "bg-emerald-50/50",
    borderColor: "border-emerald-200/60",
    textColor: "text-emerald-800",
  },
  {
    id: "Dinner",
    label: "Dinner",
    iconName: "Dinner" as const,
    timeRange: "Evening",
    dotColor: "#6366f1",
    bgColor: "bg-indigo-50/50",
    borderColor: "border-indigo-200/60",
    textColor: "text-indigo-800",
  },
  {
    id: "Snack",
    label: "Snacks & Drinks",
    iconName: "Snacks" as const,
    timeRange: "Anytime",
    dotColor: "#ec4899",
    bgColor: "bg-pink-50/50",
    borderColor: "border-pink-200/60",
    textColor: "text-pink-800",
  },
] as const;

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

  // Activity stats query & mutation
  const {
    data: activity,
    isLoading: isActivityLoading,
    isError: isActivityError,
  } = useActivityStats();
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

  // Derived progress percentage (0 - 100)
  const progressPercent = Math.min(
    100,
    Math.round(aggregates.progressRatio * 100)
  );

  // Dynamic greeting based on current local hour
  const currentHour = new Date().getHours();
  const greetingTime =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
      ? "Good afternoon"
      : "Good evening";

  // Formatted date string (e.g. "Saturday, Oct 17")
  const formattedToday = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }, []);

  // Group today's journal entries by slot
  const groupedJournal = useMemo(() => {
    const entries = todayJournal?.entries || [];
    return MEAL_SLOTS.map((slot) => {
      const slotEntries = entries.filter((e) => {
        if (slot.id === "Snack") {
          return e.category === "Snack" || (e as any).category === "Drink";
        }
        return e.category === slot.id;
      });
      const totalSlotCalories = slotEntries.reduce((sum, item) => sum + item.calories, 0);
      return {
        ...slot,
        entries: slotEntries,
        totalCalories: totalSlotCalories,
      };
    });
  }, [todayJournal?.entries]);

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
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#f8faf8]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: Platform.OS === "web" ? 48 : 96,
        }}
      >
        {/* 1. REFINED COMPACT HEADER (No massive green block) */}
        <View className="mb-6 pb-4 border-b border-[#e5ece7] flex-col sm:flex-row sm:items-center justify-between gap-4">
          <View>
            <View className="flex-row items-center gap-2 mb-1">
              <View className="w-2 h-2 rounded-full bg-emerald-600" />
              <AppText weight="bold" className="text-xs text-emerald-800 uppercase tracking-wider">
                {formattedToday}
              </AppText>
            </View>
            <AppText weight="black" className="text-2xl sm:text-3xl text-neutral-dark tracking-tight">
              {greetingTime}, {user?.name?.split(" ")[0] || "Friend"}
            </AppText>
            <AppText weight="medium" className="text-xs sm:text-sm text-neutral-muted mt-0.5">
              {aggregates.remainingCalories > 0
                ? `${aggregates.remainingCalories} kcal remaining to reach your daily goal.`
                : "You have reached your daily calorie target for today."}
            </AppText>
          </View>

          {/* Quick Header Actions / Profile Control */}
          <View className="flex-row items-center gap-2.5 self-start sm:self-center">
            {/* Target Budget Chip */}
            <View className="bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200/80 flex-row items-center">
              <AppText weight="bold" className="text-xs text-emerald-800">
                🎯 Target: {aggregates.targetCalories} kcal
              </AppText>
            </View>

            {/* Profile Avatar Control */}
            <TouchableOpacity
              onPress={() => router.push("/(app)/(tabs)/profile")}
              className={`w-10 h-10 rounded-full bg-white border border-[#e5ece7] items-center justify-center shadow-2xs hover:border-emerald-600/40 transition-all ${
                Platform.OS === "web" ? "cursor-pointer" : ""
              }`}
              accessibilityRole="button"
              accessibilityLabel="View profile settings"
            >
              <IconRenderer name="Profile" size={20} color="#15803d" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. MAIN BALANCED RESPONSIVE GRID */}
        <View className="flex-col lg:flex-row gap-6">
          {/* LEFT COLUMN: Nutrition Summary, Macros, Activity & Recommendations */}
          <View className="flex-1 flex-col gap-6">
            {/* DAILY CALORIE NUTRITION SUMMARY CARD */}
            <View className="bg-white rounded-2xl border border-[#e5ece7] p-5 sm:p-6 shadow-2xs">
              <View className="flex-row items-center justify-between pb-3.5 mb-4 border-b border-[#f0f4f1]">
                <View>
                  <AppText weight="black" className="text-base sm:text-lg text-neutral-dark tracking-tight">
                    Daily Calorie Budget
                  </AppText>
                  <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
                    Real-time intake tracked against your personalized plan
                  </AppText>
                </View>

                {/* Progress Status Badge */}
                <View
                  className={`px-3 py-1 rounded-full border ${
                    aggregates.remainingCalories > 0
                      ? "bg-emerald-50 border-emerald-200/80"
                      : "bg-amber-50 border-amber-200/80"
                  }`}
                >
                  <AppText
                    weight="bold"
                    className={`text-xs ${
                      aggregates.remainingCalories > 0 ? "text-emerald-800" : "text-amber-800"
                    }`}
                  >
                    {aggregates.remainingCalories > 0
                      ? `${aggregates.remainingCalories} kcal left`
                      : "Target Reached"}
                  </AppText>
                </View>
              </View>

              {/* Calorie Stats Breakdown & Ring Visualizer */}
              <View className="flex-col sm:flex-row sm:items-center justify-between gap-6">
                {/* Left Stats Triad */}
                <View className="flex-1">
                  <View className="mb-4">
                    <AppText weight="bold" className="text-xs text-neutral-muted uppercase tracking-wider mb-1">
                      Consumed Today
                    </AppText>
                    <View className="flex-row items-baseline">
                      <AnimatedNumber
                        value={aggregates.totalConsumed}
                        decimals={0}
                        weight="black"
                        className="text-4xl sm:text-5xl text-neutral-dark tracking-tight leading-none"
                      />
                      <AppText weight="bold" className="text-sm text-neutral-muted ml-1.5">
                        kcal
                      </AppText>
                    </View>
                  </View>

                  {/* 3 Metric Balance Pills */}
                  <View className="flex-row items-center gap-2 pt-3 border-t border-[#f0f4f1]">
                    <View className="flex-1 bg-[#f8faf8] p-2.5 rounded-xl border border-[#e5ece7]">
                      <AppText weight="semibold" className="text-[11px] text-neutral-muted">
                        Target
                      </AppText>
                      <AppText weight="black" className="text-sm text-neutral-dark mt-0.5">
                        {aggregates.targetCalories}{" "}
                        <AppText weight="medium" className="text-[10px] text-neutral-muted">
                          kcal
                        </AppText>
                      </AppText>
                    </View>

                    <View className="flex-1 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200/60">
                      <AppText weight="semibold" className="text-[11px] text-emerald-800">
                        Remaining
                      </AppText>
                      <AppText weight="black" className="text-sm text-emerald-800 mt-0.5">
                        {Math.max(0, aggregates.remainingCalories)}{" "}
                        <AppText weight="medium" className="text-[10px] text-emerald-600">
                          kcal
                        </AppText>
                      </AppText>
                    </View>

                    <View className="flex-1 bg-[#f8faf8] p-2.5 rounded-xl border border-[#e5ece7]">
                      <AppText weight="semibold" className="text-[11px] text-neutral-muted">
                        Logged
                      </AppText>
                      <AppText weight="black" className="text-sm text-neutral-dark mt-0.5">
                        {aggregates.entryCount}{" "}
                        <AppText weight="medium" className="text-[10px] text-neutral-muted">
                          meals
                        </AppText>
                      </AppText>
                    </View>
                  </View>
                </View>

                {/* Right Progress Ring */}
                <View className="items-center justify-center self-center sm:self-auto px-2">
                  <ProgressRing
                    progress={progressPercent}
                    size={118}
                    strokeWidth={11}
                    color="#059669"
                    backgroundColor="#d1fae5"
                    label="Daily Budget"
                  />
                  <AppText weight="semibold" className="text-[11px] text-neutral-muted mt-2">
                    {progressPercent}% of target
                  </AppText>
                </View>
              </View>
            </View>

            {/* MACRONUTRIENT BALANCE (Protein, Carbs, Fats) */}
            <NutritionCard
              proteinGrams={aggregates.totalProteinGrams}
              carbsGrams={aggregates.totalCarbsGrams}
              fatGrams={aggregates.totalFatGrams}
              fiberGrams={aggregates.totalFiberGrams}
              totalCalories={aggregates.totalConsumed}
              targetProteinGrams={aggregates.targetProteinGrams}
              targetCarbsGrams={aggregates.targetCarbsGrams}
              targetFatGrams={aggregates.targetFatGrams}
            />

            {/* ACTIVITY OVERVIEW (Truth in data, handles unavailable state gracefully) */}
            <View>
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <AppText weight="black" className="text-base text-neutral-dark">
                    Physical Activity
                  </AppText>
                  <AppText weight="medium" className="text-xs text-neutral-muted">
                    Movement, steps, and active calories
                  </AppText>
                </View>
              </View>

              {isActivityError ? (
                /* Unconnected / Unavailable Activity State */
                <View className="bg-white rounded-2xl border border-dashed border-[#e5ece7] p-6 items-center justify-center">
                  <View className="w-10 h-10 rounded-xl bg-neutral-100 items-center justify-center mb-2">
                    <IconRenderer name="Shoe" size={20} color="#6b7280" />
                  </View>
                  <AppText weight="bold" className="text-sm text-neutral-dark mb-0.5">
                    Activity Tracker Disconnected
                  </AppText>
                  <AppText weight="medium" className="text-xs text-neutral-muted text-center max-w-xs">
                    Connect your fitness device or Apple Health / Google Fit to sync live daily step counts.
                  </AppText>
                </View>
              ) : (
                /* Balanced 2-Card Activity Grid */
                <View className="flex-col sm:flex-row gap-3">
                  {/* Steps Card */}
                  <View className="flex-1 bg-white p-4 rounded-2xl border border-[#e5ece7] shadow-2xs justify-between">
                    <View>
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center gap-1.5">
                          <IconRenderer name="Shoe" size={16} />
                          <AppText weight="bold" className="text-xs text-neutral-dark">
                            Daily Steps
                          </AppText>
                        </View>
                        <View className="bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                          <AppText weight="bold" className="text-[10px] text-teal-800">
                            Pedometer
                          </AppText>
                        </View>
                      </View>

                      <View className="flex-row items-baseline mb-1">
                        <AnimatedNumber
                          value={activity?.steps ?? 0}
                          weight="black"
                          className="text-2xl text-neutral-dark"
                        />
                        <AppText weight="semibold" className="text-xs text-neutral-muted ml-1">
                          / {(activity?.stepGoal ?? 6000).toLocaleString()}
                        </AppText>
                      </View>

                      <ProgressBar
                        progress={
                          activity ? Math.min(1.0, activity.steps / activity.stepGoal) : 0
                        }
                        color="#0d9488"
                        backgroundColor="#ccfbf1"
                        height={5}
                      />
                    </View>

                    {/* Interactive Step Increment Action */}
                    <TouchableOpacity
                      onPress={() => addStepsMutation.mutate(500)}
                      disabled={addStepsMutation.isPending}
                      className={`mt-3 py-1.5 px-3 rounded-xl bg-[#f2f8f5] border border-emerald-200/70 items-center justify-center flex-row hover:bg-emerald-50 active:scale-95 transition-all ${
                        Platform.OS === "web" ? "cursor-pointer" : ""
                      }`}
                      accessibilityRole="button"
                      accessibilityLabel="Add 500 walking steps"
                    >
                      <AppText weight="extrabold" className="text-xs text-emerald-800">
                        +500 Steps
                      </AppText>
                    </TouchableOpacity>
                  </View>

                  {/* Active Calories & Duration Card */}
                  <View className="flex-1 bg-white p-4 rounded-2xl border border-[#e5ece7] shadow-2xs justify-between">
                    <View>
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center gap-1.5">
                          <IconRenderer name="Fire" size={16} />
                          <AppText weight="bold" className="text-xs text-neutral-dark">
                            Active Energy
                          </AppText>
                        </View>
                        <View className="bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          <AppText weight="bold" className="text-[10px] text-amber-800">
                            Workout
                          </AppText>
                        </View>
                      </View>

                      <View className="flex-row items-baseline mb-1">
                        <AnimatedNumber
                          value={activity?.exerciseCalories ?? 0}
                          weight="black"
                          className="text-2xl text-neutral-dark mr-1"
                        />
                        <AppText weight="bold" className="text-xs text-neutral-muted">
                          kcal burned
                        </AppText>
                      </View>
                    </View>

                    <View className="flex-row items-center pt-2.5 border-t border-[#f0f4f1]">
                      <IconRenderer name="Clock" size={14} className="mr-1.5" />
                      <AppText weight="bold" className="text-xs text-neutral-dark">
                        {activity?.exerciseDurationMinutes ?? 0} mins active duration
                      </AppText>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* MEAL SUGGESTIONS CAROUSEL */}
            <View>
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <AppText weight="black" className="text-base text-neutral-dark">
                    Curated Meal Suggestions
                  </AppText>
                  <AppText weight="medium" className="text-xs text-neutral-muted">
                    Healthy dishes tailored to your remaining calorie budget
                  </AppText>
                </View>

                <TouchableOpacity
                  onPress={() => router.push("/(app)/(tabs)/meals")}
                  className={`py-1 px-3 rounded-full bg-emerald-50 border border-emerald-200/60 hover:bg-emerald-100/60 transition-colors ${
                    Platform.OS === "web" ? "cursor-pointer" : ""
                  }`}
                  accessibilityRole="link"
                  accessibilityLabel="View full culinary meal catalog"
                >
                  <AppText weight="bold" className="text-xs text-emerald-800">
                    View Catalog ›
                  </AppText>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="-mx-1 px-1"
              >
                {MOCK_RECIPES.slice(0, 4).map((meal) => (
                  <View key={meal.id} className="mr-3.5 w-[260px]">
                    <MealCard
                      title={meal.title}
                      mealType={meal.category}
                      calories={meal.calories}
                      description={meal.description}
                      prepTimeMinutes={meal.prepTimeMinutes}
                      estimatedCostIdr={meal.estimatedCostIdr}
                      imageUrl={meal.imageUrl}
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

          {/* RIGHT COLUMN: TODAY'S JOURNAL (Grouped by Meal Slot) */}
          <View className="w-full lg:w-[420px]">
            <View className="bg-white rounded-2xl border border-[#e5ece7] p-5 shadow-2xs">
              {/* Journal Header */}
              <View className="flex-row items-center justify-between pb-3.5 mb-3 border-b border-[#f0f4f1]">
                <View>
                  <View className="flex-row items-baseline gap-1.5">
                    <AppText weight="black" className="text-base text-neutral-dark">
                      Today's Journal
                    </AppText>
                    <AppText weight="bold" className="text-xs text-neutral-muted">
                      ({aggregates.entryCount} logged)
                    </AppText>
                  </View>
                  <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
                    Grouped by daily meal slots
                  </AppText>
                </View>

                {aggregates.entryCount > 0 && (
                  <TouchableOpacity
                    onPress={handleResetDay}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    className={`py-1 px-2.5 rounded-full bg-status-error/10 border border-status-error/20 hover:bg-status-error/20 transition-colors ${
                      Platform.OS === "web" ? "cursor-pointer" : ""
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel="Reset today's logged meals"
                  >
                    <AppText weight="bold" className="text-[11px] text-status-error">
                      Clear Day
                    </AppText>
                  </TouchableOpacity>
                )}
              </View>

              {/* Journal Empty State (When 0 total meals logged today) */}
              {aggregates.entryCount === 0 ? (
                <View className="py-10 px-5 items-center justify-center bg-[#f8faf8] border border-dashed border-[#e5ece7] rounded-xl my-2">
                  <View className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 items-center justify-center mb-3">
                    <IconRenderer name="Cook" size={24} />
                  </View>
                  <AppText weight="black" className="text-sm text-neutral-dark mb-1 text-center">
                    No meals logged yet today
                  </AppText>
                  <AppText weight="medium" className="text-xs text-neutral-muted text-center max-w-[220px] mb-4 leading-relaxed">
                    Ready to track your first meal? Log breakfast, lunch, or dinner to start your nutrition day.
                  </AppText>
                  <Button
                    title="+ Log First Meal"
                    variant="primary"
                    size="sm"
                    onPress={() => router.push("/(app)/(tabs)/meals")}
                    accessibilityLabel="Navigate to meals catalog to log food"
                  />
                </View>
              ) : (
                /* Journal Grouped by Meal Slot */
                <View className="divide-y divide-[#f0f4f1]">
                  {groupedJournal.map((slot) => {
                    const hasEntries = slot.entries.length > 0;
                    return (
                      <View key={slot.id} className="py-3">
                        {/* Slot Header Row */}
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center gap-2">
                            <View
                              style={{ backgroundColor: slot.dotColor }}
                              className="w-2 h-2 rounded-full"
                            />
                            <AppText weight="black" className="text-xs text-neutral-dark">
                              {slot.label}
                            </AppText>
                            <AppText weight="medium" className="text-[11px] text-neutral-muted">
                              ({slot.timeRange})
                            </AppText>
                          </View>

                          <View className="flex-row items-center gap-2">
                            <AppText
                              weight="extrabold"
                              className={`text-xs ${hasEntries ? "text-primary" : "text-neutral-400"}`}
                            >
                              {slot.totalCalories} kcal
                            </AppText>
                            <TouchableOpacity
                              onPress={() => router.push("/(app)/(tabs)/meals")}
                              className={`w-5 h-5 rounded-md bg-[#f2f6f3] items-center justify-center hover:bg-emerald-100 transition-colors ${
                                Platform.OS === "web" ? "cursor-pointer" : ""
                              }`}
                              accessibilityRole="button"
                              accessibilityLabel={`Add meal to ${slot.label}`}
                            >
                              <AppText weight="bold" className="text-xs text-emerald-800 leading-none">
                                +
                              </AppText>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Slot Entries List or Quiet Placeholder */}
                        {hasEntries ? (
                          <View className="gap-2 mt-1">
                            {slot.entries.map((item) => {
                              // Find recipe image if available
                              const matchedRecipe = MOCK_RECIPES.find(
                                (r) =>
                                  r.id === item.mealId ||
                                  r.title.toLowerCase() === item.title.toLowerCase()
                              );
                              const photoUrl = (item as any).imageUrl || matchedRecipe?.imageUrl;

                              return (
                                <View
                                  key={item.id}
                                  className="p-2.5 rounded-xl bg-[#f8faf8] border border-[#e5ece7] flex-row items-center justify-between"
                                >
                                  <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                                    {/* Thumbnail Image or Icon */}
                                    <View className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200/50 overflow-hidden items-center justify-center">
                                      {photoUrl ? (
                                        <Image
                                          source={{ uri: photoUrl }}
                                          style={{ width: "100%", height: "100%" }}
                                          resizeMode="cover"
                                        />
                                      ) : (
                                        <IconRenderer name={slot.iconName} size={18} />
                                      )}
                                    </View>

                                    {/* Item Details */}
                                    <View className="flex-1">
                                      <AppText
                                        weight="extrabold"
                                        numberOfLines={1}
                                        className="text-xs text-neutral-dark"
                                      >
                                        {item.title}
                                      </AppText>
                                      <View className="flex-row items-center gap-1.5 mt-0.5">
                                        {item.quantity > 1 && (
                                          <AppText weight="semibold" className="text-[10px] text-neutral-muted">
                                            {item.quantity} portions •
                                          </AppText>
                                        )}
                                        <AppText weight="medium" className="text-[10px] text-neutral-muted">
                                          P: {item.proteinGrams}g • C: {item.carbsGrams}g • F: {item.fatGrams}g
                                        </AppText>
                                      </View>
                                    </View>
                                  </View>

                                  {/* Calorie Amount */}
                                  <AppText weight="black" className="text-xs text-primary">
                                    +{item.calories}{" "}
                                    <AppText weight="medium" className="text-[10px] text-neutral-muted">
                                      kcal
                                    </AppText>
                                  </AppText>
                                </View>
                              );
                            })}
                          </View>
                        ) : (
                          /* Subtle Empty Slot Line */
                          <TouchableOpacity
                            onPress={() => router.push("/(app)/(tabs)/meals")}
                            className={`py-2 px-3 rounded-lg border border-dashed border-[#e2e8e4] bg-[#fafcfa] flex-row items-center justify-between ${
                              Platform.OS === "web" ? "cursor-pointer hover:bg-emerald-50/40" : ""
                            }`}
                          >
                            <AppText weight="medium" className="text-[11px] text-neutral-muted">
                              No {slot.label.toLowerCase()} logged yet
                            </AppText>
                            <AppText weight="bold" className="text-[11px] text-emerald-800">
                              + Plan meal
                            </AppText>
                          </TouchableOpacity>
                        )}
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
