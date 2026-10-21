import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  Platform,
  Image,
  useWindowDimensions,
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
import { IconRenderer, CloseIconSvg } from "@/constants/Assets";
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
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isNarrowMobile = width < 360;

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
      weekday: "short",
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

  const handleDeleteEntry = (entryId: string, title: string) => {
    Alert.alert(
      "Remove Meal Entry",
      `Are you sure you want to remove "${title}" from your journal?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await useJournalStore.getState().removeEntry(entryId, todayDate);
          },
        },
      ]
    );
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

  /* Render Today's Journal Section Component (Used in mobile flow and desktop right column) */
  const renderTodaysJournalSection = () => (
    <View className="bg-white rounded-2xl border border-[#e5ece7] p-4 sm:p-5 shadow-2xs">
      {/* Journal Header */}
      <View className="flex-row items-center justify-between pb-3 mb-3 border-b border-[#f0f4f1]">
        <View className="flex-1 mr-2">
          <View className="flex-row items-baseline gap-1.5 flex-wrap">
            <AppText weight="black" className="text-base text-neutral-dark">
              Today's Meals
            </AppText>
            <AppText weight="bold" className="text-xs text-neutral-muted">
              ({aggregates.entryCount} {aggregates.entryCount === 1 ? "meal" : "meals"} logged)
            </AppText>
          </View>
          <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
            Real-time chronological meal diary
          </AppText>
        </View>

        {aggregates.entryCount > 0 && (
          <TouchableOpacity
            onPress={handleResetDay}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className={`py-1.5 px-3 rounded-full bg-status-error/10 border border-status-error/20 active:bg-status-error/20 transition-colors ${
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
        <View className="py-8 px-4 items-center justify-center bg-[#f8faf8] border border-dashed border-[#e5ece7] rounded-xl my-1">
          <View className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 items-center justify-center mb-2.5 shadow-2xs">
            <IconRenderer name="Cook" size={24} />
          </View>
          <AppText weight="black" className="text-sm text-neutral-dark mb-1 text-center">
            No meals logged yet today
          </AppText>
          <AppText weight="medium" className="text-xs text-neutral-muted text-center max-w-[240px] mb-4 leading-relaxed">
            Record what you eat to stay aligned with your daily {aggregates.targetCalories} kcal goal.
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
                      className="w-2.5 h-2.5 rounded-full"
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
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      className={`min-h-[32px] px-2 rounded-lg bg-[#f2f6f3] border border-emerald-200/50 items-center justify-center active:bg-emerald-100 transition-colors flex-row gap-1 ${
                        Platform.OS === "web" ? "cursor-pointer" : ""
                      }`}
                      accessibilityRole="button"
                      accessibilityLabel={`Add meal to ${slot.label}`}
                    >
                      <AppText weight="extrabold" className="text-xs text-emerald-800 leading-none">
                        + Add
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Slot Entries List or Quiet Placeholder */}
                {hasEntries ? (
                  <View className="gap-2 mt-1">
                    {slot.entries.map((item) => {
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
                          <View className="flex-row items-center gap-2.5 flex-1 mr-2 min-w-0">
                            {/* Thumbnail Image or Icon */}
                            <View className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200/50 overflow-hidden items-center justify-center flex-shrink-0">
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
                            <View className="flex-1 min-w-0">
                              <AppText
                                weight="extrabold"
                                numberOfLines={1}
                                className="text-xs text-neutral-dark"
                              >
                                {item.title}
                              </AppText>
                              <View className="flex-row items-center gap-1.5 mt-0.5 flex-wrap">
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

                          {/* Calorie Amount & Delete Button */}
                          <View className="flex-row items-center gap-2 flex-shrink-0">
                            <AppText weight="black" className="text-xs text-primary">
                              +{item.calories}{" "}
                              <AppText weight="medium" className="text-[10px] text-neutral-muted">
                                kcal
                              </AppText>
                            </AppText>

                            <TouchableOpacity
                              onPress={() => handleDeleteEntry(item.id, item.title)}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              className="w-7 h-7 rounded-lg bg-status-error/10 items-center justify-center active:bg-status-error/20"
                              accessibilityRole="button"
                              accessibilityLabel={`Remove ${item.title}`}
                            >
                              <CloseIconSvg size={12} color="#ef4444" strokeWidth={2.4} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  /* Subtle Empty Slot Row */
                  <TouchableOpacity
                    onPress={() => router.push("/(app)/(tabs)/meals")}
                    className={`py-2 px-3 rounded-lg border border-dashed border-[#e2e8e4] bg-[#fafcfa] flex-row items-center justify-between active:bg-emerald-50/50 ${
                      Platform.OS === "web" ? "cursor-pointer" : ""
                    }`}
                  >
                    <AppText weight="medium" className="text-[11px] text-neutral-muted">
                      No {slot.label.toLowerCase()} logged yet
                    </AppText>
                    <AppText weight="bold" className="text-[11px] text-emerald-800">
                      + Add meal
                    </AppText>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  /* Render Quick Food Logging Action Bar */
  const renderQuickFoodLoggingBar = () => (
    <View className="bg-white rounded-2xl border border-[#e5ece7] p-3.5 shadow-2xs">
      <View className="flex-row items-center justify-between mb-2.5">
        <View className="flex-row items-center gap-1.5">
          <IconRenderer name="Fire" size={14} color="#1b7a53" />
          <AppText weight="extrabold" className="text-xs text-neutral-dark uppercase tracking-wider">
            Quick Food Log
          </AppText>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(app)/(tabs)/meals")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="link"
          accessibilityLabel="Browse complete meals catalog"
        >
          <AppText weight="bold" className="text-xs text-primary">
            Browse Catalog
          </AppText>
        </TouchableOpacity>
      </View>

      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={() => router.push("/(app)/(tabs)/meals")}
          className="flex-1 min-h-[44px] rounded-xl bg-primary items-center justify-center flex-row gap-1.5 active:scale-[0.98] shadow-xs"
          accessibilityRole="button"
          accessibilityLabel="Open food search and logging"
        >
          <AppText weight="black" className="text-white text-sm">
            +
          </AppText>
          <AppText weight="extrabold" className="text-white text-xs">
            Log Food
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(app)/(tabs)/recipes")}
          className="flex-1 min-h-[44px] rounded-xl bg-[#f2f8f5] border border-emerald-200/70 items-center justify-center flex-row gap-1.5 active:scale-[0.98]"
          accessibilityRole="button"
          accessibilityLabel="Explore recipes"
        >
          <IconRenderer name="Cook" size={14} color="#065f46" />
          <AppText weight="bold" className="text-emerald-900 text-xs">
            Recipes
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  /* Render Daily Calorie Card */
  const renderCalorieOverviewCard = () => (
    <View className="bg-white rounded-2xl border border-[#e5ece7] p-4 sm:p-5 shadow-2xs">
      <View className="flex-row items-center justify-between pb-3 mb-3 border-b border-[#f0f4f1]">
        <View className="flex-1 mr-2">
          <AppText weight="black" className="text-base sm:text-lg text-neutral-dark tracking-tight">
            Daily Calorie Budget
          </AppText>
          <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
            Real-time intake vs personalized plan
          </AppText>
        </View>

        {/* Progress Status Badge */}
        <View
          className={`px-3 py-1 rounded-full border flex-shrink-0 ${
            aggregates.remainingCalories > 0
              ? "bg-emerald-50 border-emerald-200/80"
              : "bg-amber-50 border-amber-200/80"
          }`}
        >
          <AppText
            weight="extrabold"
            className={`text-xs ${
              aggregates.remainingCalories > 0 ? "text-emerald-800" : "text-amber-800"
            }`}
          >
            {aggregates.remainingCalories > 0
              ? `${aggregates.remainingCalories} kcal left`
              : "Target Met"}
          </AppText>
        </View>
      </View>

      {/* Calorie Stats Breakdown & Ring Visualizer */}
      <View className="flex-row items-center justify-between gap-4">
        {/* Left Side: Big Numbers & Metrics */}
        <View className="flex-1 min-w-0">
          <View className="mb-3">
            <AppText weight="extrabold" className="text-[11px] text-neutral-muted uppercase tracking-wider mb-0.5">
              Consumed Today
            </AppText>
            <View className="flex-row items-baseline flex-wrap">
              <AnimatedNumber
                value={aggregates.totalConsumed}
                decimals={0}
                weight="black"
                className="text-3xl sm:text-4xl text-neutral-dark tracking-tight leading-none"
              />
              <AppText weight="bold" className="text-xs text-neutral-muted ml-1">
                kcal
              </AppText>
            </View>
          </View>

          {/* 3 Metric Balance Pills */}
          <View className="flex-row items-center gap-1.5 pt-2.5 border-t border-[#f0f4f1]">
            <View className="flex-1 bg-[#f8faf8] p-2 rounded-xl border border-[#e5ece7] min-w-0">
              <AppText weight="semibold" className="text-[10px] text-neutral-muted">
                Target
              </AppText>
              <AppText weight="black" numberOfLines={1} className="text-xs text-neutral-dark mt-0.5">
                {aggregates.targetCalories}
              </AppText>
            </View>

            <View className="flex-1 bg-emerald-50/60 p-2 rounded-xl border border-emerald-200/60 min-w-0">
              <AppText weight="semibold" className="text-[10px] text-emerald-800">
                Left
              </AppText>
              <AppText weight="black" numberOfLines={1} className="text-xs text-emerald-800 mt-0.5">
                {Math.max(0, aggregates.remainingCalories)}
              </AppText>
            </View>

            <View className="flex-1 bg-[#f8faf8] p-2 rounded-xl border border-[#e5ece7] min-w-0">
              <AppText weight="semibold" className="text-[10px] text-neutral-muted">
                Logged
              </AppText>
              <AppText weight="black" numberOfLines={1} className="text-xs text-neutral-dark mt-0.5">
                {aggregates.entryCount}
              </AppText>
            </View>
          </View>
        </View>

        {/* Right Progress Ring */}
        <View className="items-center justify-center flex-shrink-0">
          <ProgressRing
            progress={progressPercent}
            size={isNarrowMobile ? 92 : 106}
            strokeWidth={10}
            color="#059669"
            backgroundColor="#d1fae5"
            label="Budget"
          />
          <AppText weight="extrabold" className="text-[11px] text-neutral-muted mt-1.5">
            {progressPercent}% target
          </AppText>
        </View>
      </View>
    </View>
  );

  /* Render Physical Activity Section */
  const renderActivitySection = () => (
    <View>
      <View className="flex-row items-center justify-between mb-2.5">
        <View>
          <AppText weight="black" className="text-base text-neutral-dark">
            Physical Activity
          </AppText>
          <AppText weight="medium" className="text-xs text-neutral-muted">
            Movement & active calories burned
          </AppText>
        </View>
      </View>

      {isActivityError ? (
        <View className="bg-white rounded-2xl border border-dashed border-[#e5ece7] p-5 items-center justify-center">
          <View className="w-10 h-10 rounded-xl bg-neutral-100 items-center justify-center mb-2">
            <IconRenderer name="Shoe" size={20} color="#6b7280" />
          </View>
          <AppText weight="bold" className="text-sm text-neutral-dark mb-0.5">
            Activity Sensor Offline
          </AppText>
          <AppText weight="medium" className="text-xs text-neutral-muted text-center max-w-xs">
            Connect Apple Health or Google Fit to track live sensor steps.
          </AppText>
        </View>
      ) : (
        <View className="flex-col sm:flex-row gap-3">
          {/* Steps Card */}
          <View className="flex-1 bg-white p-3.5 rounded-2xl border border-[#e5ece7] shadow-2xs justify-between">
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
                progress={activity ? Math.min(1.0, activity.steps / activity.stepGoal) : 0}
                color="#0d9488"
                backgroundColor="#ccfbf1"
                height={5}
              />
            </View>

            <TouchableOpacity
              onPress={() => addStepsMutation.mutate(500)}
              disabled={addStepsMutation.isPending}
              className={`mt-3 py-2 px-3 rounded-xl bg-[#f2f8f5] border border-emerald-200/70 items-center justify-center flex-row active:scale-95 transition-all ${
                Platform.OS === "web" ? "cursor-pointer hover:bg-emerald-50" : ""
              }`}
              accessibilityRole="button"
              accessibilityLabel="Add 500 walking steps"
            >
              <AppText weight="extrabold" className="text-xs text-emerald-800">
                +500 Steps
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Active Calories Card */}
          <View className="flex-1 bg-white p-3.5 rounded-2xl border border-[#e5ece7] shadow-2xs justify-between">
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

            <View className="flex-row items-center pt-2.5 border-t border-[#f0f4f1] mt-2">
              <IconRenderer name="Clock" size={14} className="mr-1.5" />
              <AppText weight="bold" className="text-xs text-neutral-dark">
                {activity?.exerciseDurationMinutes ?? 0} mins active duration
              </AppText>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  /* Render Meal Suggestions Carousel */
  const renderMealSuggestions = () => (
    <View>
      <View className="flex-row items-center justify-between mb-2.5">
        <View>
          <AppText weight="black" className="text-base text-neutral-dark">
            Curated Meal Suggestions
          </AppText>
          <AppText weight="medium" className="text-xs text-neutral-muted">
            Healthy dishes tailored to your remaining budget
          </AppText>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(app)/(tabs)/meals")}
          className={`py-1 px-3 rounded-full bg-emerald-50 border border-emerald-200/60 ${
            Platform.OS === "web" ? "cursor-pointer" : ""
          }`}
          accessibilityRole="link"
          accessibilityLabel="View full culinary meal catalog"
        >
          <AppText weight="bold" className="text-xs text-emerald-800">
            Explore All
          </AppText>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-1 px-1"
      >
        {MOCK_RECIPES.slice(0, 4).map((meal) => (
          <View key={meal.id} className="mr-3 w-[240px] sm:w-[260px]">
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
  );

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#f8faf8]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: Platform.OS === "web" ? 56 : 112,
        }}
      >
        {/* 1. COMPACT REFINED MOBILE HEADER */}
        <View className="mb-4 pb-3 border-b border-[#e5ece7] flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center gap-1.5 mb-0.5">
              <View className="w-2 h-2 rounded-full bg-emerald-600" />
              <AppText weight="bold" className="text-[11px] text-emerald-800 uppercase tracking-wider">
                {formattedToday}
              </AppText>
            </View>
            <AppText weight="black" numberOfLines={1} className="text-xl sm:text-2xl text-neutral-dark tracking-tight">
              {greetingTime}, {user?.name?.split(" ")[0] || "Friend"}
            </AppText>
            <AppText weight="medium" numberOfLines={1} className="text-xs text-neutral-muted mt-0.5">
              {aggregates.remainingCalories > 0
                ? `${aggregates.remainingCalories} kcal left to reach daily target.`
                : "Daily calorie target reached."}
            </AppText>
          </View>

          {/* Quick Header Actions: Target Budget Chip & Profile Avatar */}
          <View className="flex-row items-center gap-2 flex-shrink-0">
            <View className="bg-emerald-50 px-2.5 py-1.5 rounded-full border border-emerald-200/80 hidden xs:flex flex-row items-center">
              <AppText
                weight="bold"
                className="text-xs text-emerald-800"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                Target: {aggregates.targetCalories} kcal
              </AppText>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/(app)/(tabs)/profile")}
              className={`w-11 h-11 rounded-full bg-white border border-[#e5ece7] items-center justify-center shadow-2xs active:scale-95 transition-all ${
                Platform.OS === "web" ? "cursor-pointer" : ""
              }`}
              accessibilityRole="button"
              accessibilityLabel="View profile settings"
            >
              <IconRenderer name="Profile" size={20} color="#15803d" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. ADAPTIVE CONTENT LAYOUT */}
        {isDesktop ? (
          /* DESKTOP 2-COLUMN VIEW */
          <View className="flex-row gap-6">
            {/* Left Column */}
            <View className="flex-1 flex-col gap-6">
              {renderCalorieOverviewCard()}
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
              {renderActivitySection()}
              {renderMealSuggestions()}
            </View>

            {/* Right Column: Today's Journal */}
            <View className="w-[400px] flex-col gap-4">
              {renderQuickFoodLoggingBar()}
              {renderTodaysJournalSection()}
            </View>
          </View>
        ) : (
          /* MOBILE PORTRAIT VIEW: STRICT CONTENT HIERARCHY */
          /* 1. Daily nutrition progress -> 2. Quick meal logging -> 3. Meals consumed today -> 4. Macronutrients -> 5. Activity & suggestions */
          <View className="flex-col gap-4">
            {/* 1. Daily nutrition progress */}
            {renderCalorieOverviewCard()}

            {/* 2. Quick meal logging */}
            {renderQuickFoodLoggingBar()}

            {/* 3. Meals consumed today */}
            {renderTodaysJournalSection()}

            {/* 4. Macronutrient balance */}
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

            {/* 5. Activity and secondary insights */}
            {renderActivitySection()}
            {renderMealSuggestions()}
          </View>
        )}
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

