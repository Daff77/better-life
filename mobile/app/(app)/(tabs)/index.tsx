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
  ProgressBar,
  ProgressRing,
  AnimatedNumber,
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
import { JournalCategory, JournalEntry } from "@/lib/schemas";

const MEAL_SLOTS: {
  category: JournalCategory;
  title: string;
  iconName: "Breakfast" | "Lunch" | "Dinner" | "Snacks";
  accentColor: string;
  bgLight: string;
  borderColor: string;
  textColor: string;
}[] = [
  {
    category: "Breakfast",
    title: "Breakfast",
    iconName: "Breakfast",
    accentColor: "#f59e0b",
    bgLight: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
  },
  {
    category: "Lunch",
    title: "Lunch",
    iconName: "Lunch",
    accentColor: "#10b981",
    bgLight: "bg-emerald-50",
    borderColor: "border-emerald-200",
    textColor: "text-emerald-700",
  },
  {
    category: "Dinner",
    title: "Dinner",
    iconName: "Dinner",
    accentColor: "#6366f1",
    bgLight: "bg-indigo-50",
    borderColor: "border-indigo-200",
    textColor: "text-indigo-700",
  },
  {
    category: "Snack",
    title: "Snacks & Drinks",
    iconName: "Snacks",
    accentColor: "#ec4899",
    bgLight: "bg-pink-50",
    borderColor: "border-pink-200",
    textColor: "text-pink-700",
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const personalization = useOnboardingStore((state) => state.personalization);

  // Central Journal Store
  const todayDate = getTodayDateKey();
  const todayJournal = useJournalStore((state) => state.journals[todayDate]);
  const aggregates = useMemo(
    () => computeJournalAggregates(todayJournal, personalization.targetCalories),
    [todayJournal, personalization.targetCalories]
  );

  // Activity stats
  const {
    data: activity = {
      steps: 3420,
      stepGoal: 6000,
      exerciseCalories: 240,
      exerciseDurationMinutes: 35,
    },
  } = useActivityStats();
  const addStepsMutation = useAddStepsMutation();

  // Logging modal state
  const [selectedMealForLog, setSelectedMealForLog] = useState<FoodItem | null>(null);
  const [selectedCategoryForLog, setSelectedCategoryForLog] = useState<JournalCategory>("Breakfast");
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [isLogModalVisible, setIsLogModalVisible] = useState<boolean>(false);

  // Sync profile target calories with active journal
  useEffect(() => {
    if (personalization.targetCalories && personalization.targetCalories > 0) {
      if (todayJournal && todayJournal.targetCalories !== personalization.targetCalories) {
        useJournalStore.getState().setTargetCalories(personalization.targetCalories, todayDate);
      }
    }
  }, [personalization.targetCalories, todayDate, todayJournal?.targetCalories]);

  const progressPercent = Math.min(100, Math.round(aggregates.progressRatio * 100));

  // Date and Greeting
  const now = new Date();
  const currentHour = now.getHours();
  const greetingSubtitle =
    currentHour < 12
      ? "Good morning,"
      : currentHour < 18
      ? "Good afternoon,"
      : "Good evening,";

  const formattedDate = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const handleOpenMealLog = (meal: FoodItem) => {
    setSelectedMealForLog(meal);
    setSelectedCategoryForLog(
      (meal.category as JournalCategory) || "Breakfast"
    );
    setIsCustomMode(false);
    setIsLogModalVisible(true);
  };

  const handleOpenSlotLog = (category: JournalCategory) => {
    setSelectedMealForLog(null);
    setSelectedCategoryForLog(category);
    setIsCustomMode(true);
    setIsLogModalVisible(true);
  };

  const handleRemoveEntry = (entryId: string, title: string) => {
    Alert.alert("Remove Meal", `Remove "${title}" from today's journal?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await useJournalStore.getState().removeEntry(entryId, todayDate);
        },
      },
    ]);
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

  // Group logged entries by meal slot
  const entries = todayJournal?.entries || [];
  const entriesBySlot: Record<JournalCategory, JournalEntry[]> = {
    Breakfast: entries.filter((e) => e.category === "Breakfast"),
    Lunch: entries.filter((e) => e.category === "Lunch"),
    Dinner: entries.filter((e) => e.category === "Dinner"),
    Snack: entries.filter((e) => e.category === "Snack"),
  };

  return (
    <ScreenWrapper maxWidth="mobile" className="flex-1 bg-[#f7faf8]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* 1. Curved Hero Header */}
        <View className="bg-primary pt-6 pb-12 px-5 rounded-b-[32px] shadow-sm">
          <View className="flex-row items-center justify-between">
            <View>
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <AppText weight="bold" className="text-xs text-white/80">
                  {formattedDate} •
                </AppText>
                <AppText weight="semibold" className="text-xs text-white/90">
                  {greetingSubtitle}
                </AppText>
              </View>
              <AppText weight="black" className="text-2xl text-white">
                {user?.name || "Healthy Champion"}
              </AppText>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/(app)/(tabs)/profile")}
              className="w-11 h-11 rounded-full bg-white/20 border border-white/40 items-center justify-center transition-all duration-150 active:scale-95"
              accessibilityRole="button"
              accessibilityLabel="View profile"
            >
              <IconRenderer name="Profile" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-4 -mt-8 gap-y-4">
          {/* 2. Main Calorie Progress Card */}
          <View className="p-5 rounded-3xl bg-white border border-neutral-border-light/90 shadow-md">
            <View className="flex-row items-center justify-between">
              {/* Left Side: Numbers */}
              <View className="flex-1 pr-2">
                <View className="bg-emerald-100/70 px-2.5 py-0.5 rounded-full self-start mb-2 border border-emerald-200/60">
                  <AppText weight="bold" className="text-[10px] text-emerald-800 uppercase tracking-wider">
                    Target • {aggregates.targetCalories} kcal
                  </AppText>
                </View>

                <AppText weight="extrabold" className="text-xs text-neutral-muted uppercase tracking-wider mb-0.5">
                  Consumed
                </AppText>
                <View className="flex-row items-baseline mb-2">
                  <AnimatedNumber
                    value={aggregates.totalConsumed}
                    decimals={0}
                    weight="black"
                    className="text-3xl text-neutral-dark leading-none"
                  />
                  <AppText weight="bold" className="text-sm text-neutral-muted ml-1.5">
                    kcal
                  </AppText>
                </View>

                <View className="pt-2 border-t border-neutral-border-light/60 flex-row items-baseline justify-between">
                  <View>
                    <AppText weight="medium" className="text-[11px] text-neutral-muted">
                      Remaining
                    </AppText>
                    <View className="flex-row items-baseline mt-0.5">
                      <AnimatedNumber
                        value={aggregates.remainingCalories}
                        decimals={0}
                        weight="black"
                        className="text-primary text-lg"
                      />
                      <AppText weight="bold" className="text-[10px] text-primary/80 ml-1">
                        kcal
                      </AppText>
                    </View>
                  </View>

                  <View className="items-end">
                    <AppText weight="medium" className="text-[11px] text-neutral-muted">
                      Status
                    </AppText>
                    <AppText weight="extrabold" className="text-xs text-neutral-dark mt-0.5">
                      {progressPercent}% logged
                    </AppText>
                  </View>
                </View>
              </View>

              {/* Right Side: Circular Gauge */}
              <View className="items-center justify-center pl-2">
                <ProgressRing
                  progress={progressPercent}
                  size={116}
                  strokeWidth={11}
                  color="#22c55e"
                  backgroundColor="#dcfce7"
                  label="Budget"
                />
              </View>
            </View>

            {/* Macro Distribution Bars */}
            <View className="mt-4 pt-3 border-t border-neutral-border-light/70">
              <View className="flex-row items-center justify-between mb-2">
                <AppText weight="bold" className="text-xs text-neutral-dark">
                  Daily Macronutrients
                </AppText>
                <AppText weight="medium" className="text-[10px] text-neutral-muted">
                  Carbs • Protein • Fat
                </AppText>
              </View>

              <View className="flex-row gap-2">
                {/* Protein */}
                <View className="flex-1 bg-rose-50/70 p-2 rounded-xl border border-rose-100">
                  <View className="flex-row justify-between items-center mb-1">
                    <AppText weight="bold" className="text-[10px] text-rose-700">
                      Protein
                    </AppText>
                    <AppText weight="extrabold" className="text-[10px] text-neutral-dark">
                      {aggregates.totalProtein}g
                    </AppText>
                  </View>
                  <ProgressBar
                    progress={
                      aggregates.targetProtein > 0
                        ? aggregates.totalProtein / aggregates.targetProtein
                        : 0
                    }
                    color="#f43f5e"
                    backgroundColor="#ffe4e6"
                    height={4}
                  />
                  <AppText weight="medium" className="text-[9px] text-neutral-muted mt-1">
                    Goal: {aggregates.targetProtein}g
                  </AppText>
                </View>

                {/* Carbs */}
                <View className="flex-1 bg-amber-50/70 p-2 rounded-xl border border-amber-100">
                  <View className="flex-row justify-between items-center mb-1">
                    <AppText weight="bold" className="text-[10px] text-amber-700">
                      Carbs
                    </AppText>
                    <AppText weight="extrabold" className="text-[10px] text-neutral-dark">
                      {aggregates.totalCarbs}g
                    </AppText>
                  </View>
                  <ProgressBar
                    progress={
                      aggregates.targetCarbs > 0
                        ? aggregates.totalCarbs / aggregates.targetCarbs
                        : 0
                    }
                    color="#f59e0b"
                    backgroundColor="#fef3c7"
                    height={4}
                  />
                  <AppText weight="medium" className="text-[9px] text-neutral-muted mt-1">
                    Goal: {aggregates.targetCarbs}g
                  </AppText>
                </View>

                {/* Fat */}
                <View className="flex-1 bg-sky-50/70 p-2 rounded-xl border border-sky-100">
                  <View className="flex-row justify-between items-center mb-1">
                    <AppText weight="bold" className="text-[10px] text-sky-700">
                      Fat
                    </AppText>
                    <AppText weight="extrabold" className="text-[10px] text-neutral-dark">
                      {aggregates.totalFat}g
                    </AppText>
                  </View>
                  <ProgressBar
                    progress={
                      aggregates.targetFat > 0
                        ? aggregates.totalFat / aggregates.targetFat
                        : 0
                    }
                    color="#0ea5e9"
                    backgroundColor="#e0f2fe"
                    height={4}
                  />
                  <AppText weight="medium" className="text-[9px] text-neutral-muted mt-1">
                    Goal: {aggregates.targetFat}g
                  </AppText>
                </View>
              </View>
            </View>
          </View>

          {/* 3. Tri-Metric Daily Wellness Row */}
          <View className="flex-row gap-2.5">
            {/* Steps Tracker */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => addStepsMutation.mutate(500)}
              className="flex-1 bg-teal-50/70 p-3 rounded-2xl border border-teal-100/90 shadow-2xs justify-between"
              accessibilityRole="button"
              accessibilityLabel="Add 500 steps"
            >
              <View>
                <View className="flex-row items-center justify-between mb-1">
                  <AppText weight="bold" className="text-xs text-neutral-dark">
                    Steps
                  </AppText>
                  <IconRenderer name="Shoe" size={16} />
                </View>
                <AnimatedNumber
                  value={activity.steps}
                  weight="black"
                  className="text-lg text-neutral-dark"
                />
                <AppText weight="medium" className="text-[10px] text-neutral-muted mb-2">
                  Goal: {activity.stepGoal.toLocaleString()}
                </AppText>
              </View>
              <ProgressBar
                progress={activity.steps / activity.stepGoal}
                color="#0d9488"
                backgroundColor="#ccfbf1"
                height={5}
              />
            </TouchableOpacity>

            {/* Exercise Burn */}
            <View className="flex-1 bg-amber-50/70 p-3 rounded-2xl border border-amber-100/90 shadow-2xs justify-between">
              <View>
                <View className="flex-row items-center justify-between mb-1">
                  <AppText weight="bold" className="text-xs text-neutral-dark">
                    Active Burn
                  </AppText>
                  <IconRenderer name="Fire" size={16} />
                </View>
                <View className="flex-row items-baseline mb-0.5">
                  <AnimatedNumber
                    value={activity.exerciseCalories}
                    weight="black"
                    className="text-lg text-neutral-dark mr-0.5"
                  />
                  <AppText weight="bold" className="text-[10px] text-neutral-muted">
                    kcal
                  </AppText>
                </View>
              </View>
              <View className="flex-row items-center pt-1.5 border-t border-amber-200/50">
                <IconRenderer name="Clock" size={12} className="mr-1" />
                <AppText weight="bold" className="text-[10px] text-neutral-dark">
                  0:{activity.exerciseDurationMinutes} hr active
                </AppText>
              </View>
            </View>

            {/* Water Tracker */}
            <View className="flex-1 bg-blue-50/70 p-3 rounded-2xl border border-blue-100/90 shadow-2xs justify-between">
              <View>
                <View className="flex-row items-center justify-between mb-1">
                  <AppText weight="bold" className="text-xs text-neutral-dark">
                    Water
                  </AppText>
                  <AppText weight="bold" className="text-xs text-blue-600">
                    💧
                  </AppText>
                </View>
                <View className="flex-row items-baseline mb-1">
                  <AppText weight="black" className="text-lg text-blue-700">
                    {aggregates.waterGlasses}
                  </AppText>
                  <AppText weight="bold" className="text-[10px] text-neutral-muted ml-0.5">
                    /{aggregates.waterGoalGlasses} gls
                  </AppText>
                </View>
              </View>

              <View className="flex-row items-center justify-between pt-1 border-t border-blue-200/50">
                <TouchableOpacity
                  onPress={() => useJournalStore.getState().removeWater(1, todayDate)}
                  disabled={aggregates.waterGlasses <= 0}
                  className="w-6 h-6 rounded-md bg-white border border-blue-200 items-center justify-center active:scale-95"
                  accessibilityRole="button"
                  accessibilityLabel="Decrease water intake"
                >
                  <AppText weight="black" className="text-xs text-blue-700">
                    −
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => useJournalStore.getState().addWater(1, todayDate)}
                  className="w-6 h-6 rounded-md bg-blue-500 items-center justify-center active:scale-95 shadow-xs"
                  accessibilityRole="button"
                  accessibilityLabel="Increase water intake"
                >
                  <AppText weight="black" className="text-xs text-white">
                    +
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 4. Calorie Journal: 4 Meal Slots */}
          <View className="mt-2">
            <View className="flex-row items-center justify-between mb-2.5">
              <View>
                <AppText weight="black" className="text-lg text-neutral-dark">
                  Meal Journal
                </AppText>
                <AppText weight="medium" className="text-xs text-neutral-muted">
                  Log your breakfast, lunch, dinner & snacks
                </AppText>
              </View>

              {entries.length > 0 && (
                <TouchableOpacity
                  onPress={handleResetDay}
                  className="py-1 px-2.5 rounded-full bg-status-error/10 border border-status-error/20"
                  accessibilityRole="button"
                  accessibilityLabel="Reset today's journal"
                >
                  <AppText weight="bold" className="text-[11px] text-status-error">
                    Clear Day
                  </AppText>
                </TouchableOpacity>
              )}
            </View>

            <View className="gap-y-3">
              {MEAL_SLOTS.map((slot) => {
                const slotEntries = entriesBySlot[slot.category] || [];
                const slotCalories = slotEntries.reduce(
                  (sum, e) => sum + (e.calories || 0),
                  0
                );

                return (
                  <View
                    key={slot.category}
                    className="bg-white rounded-2xl border border-neutral-border-light/90 shadow-xs overflow-hidden"
                  >
                    {/* Slot Header */}
                    <View className="flex-row items-center justify-between p-3.5 border-b border-neutral-border-light/50 bg-[#fafcfb]">
                      <View className="flex-row items-center gap-2.5">
                        <View className={`w-8 h-8 rounded-xl ${slot.bgLight} items-center justify-center border ${slot.borderColor}`}>
                          <IconRenderer name={slot.iconName} size={18} />
                        </View>
                        <View>
                          <AppText weight="extrabold" className="text-sm text-neutral-dark">
                            {slot.title}
                          </AppText>
                          <AppText weight="medium" className="text-[10px] text-neutral-muted">
                            {slotEntries.length > 0
                              ? `${slotEntries.length} items logged`
                              : "No food logged yet"}
                          </AppText>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-2">
                        {slotCalories > 0 && (
                          <View className="px-2 py-0.5 rounded-md bg-secondary-soft border border-secondary">
                            <AppText weight="black" className="text-xs text-primary">
                              {slotCalories} kcal
                            </AppText>
                          </View>
                        )}
                        <TouchableOpacity
                          onPress={() => handleOpenSlotLog(slot.category)}
                          className="w-7 h-7 rounded-lg bg-primary items-center justify-center active:scale-95 shadow-2xs"
                          accessibilityRole="button"
                          accessibilityLabel={`Log food for ${slot.title}`}
                        >
                          <AppText weight="black" className="text-sm text-white">
                            +
                          </AppText>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Slot Items List */}
                    {slotEntries.length > 0 ? (
                      <View className="divide-y divide-neutral-border-light/50">
                        {slotEntries.map((item) => (
                          <View
                            key={item.id}
                            className="p-3 flex-row items-center justify-between hover:bg-neutral-surface/40"
                          >
                            <View className="flex-1 mr-2">
                              <AppText weight="bold" numberOfLines={1} className="text-xs text-neutral-dark">
                                {item.title}
                              </AppText>
                              <View className="flex-row items-center gap-1.5 mt-0.5">
                                {item.quantity > 1 && (
                                  <AppText weight="medium" className="text-[10px] text-neutral-muted">
                                    {item.quantity} portions •
                                  </AppText>
                                )}
                                {(item.proteinGrams || 0) > 0 && (
                                  <AppText weight="semibold" className="text-[9px] text-rose-600">
                                    P: {item.proteinGrams}g
                                  </AppText>
                                )}
                                {(item.carbsGrams || 0) > 0 && (
                                  <AppText weight="semibold" className="text-[9px] text-amber-600">
                                    C: {item.carbsGrams}g
                                  </AppText>
                                )}
                                {(item.fatGrams || 0) > 0 && (
                                  <AppText weight="semibold" className="text-[9px] text-sky-600">
                                    F: {item.fatGrams}g
                                  </AppText>
                                )}
                              </View>
                            </View>

                            <View className="flex-row items-center gap-2">
                              <AppText weight="black" className="text-xs text-neutral-dark">
                                +{item.calories} kcal
                              </AppText>
                              <TouchableOpacity
                                onPress={() => handleRemoveEntry(item.id, item.title)}
                                className="w-5 h-5 rounded-full items-center justify-center bg-neutral-surface hover:bg-red-50"
                                accessibilityRole="button"
                                accessibilityLabel={`Delete ${item.title}`}
                              >
                                <AppText weight="bold" className="text-[10px] text-neutral-muted hover:text-red-500">
                                  ✕
                                </AppText>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleOpenSlotLog(slot.category)}
                        className="p-3 flex-row items-center justify-center gap-1.5 active:bg-neutral-surface"
                      >
                        <AppText weight="semibold" className="text-xs text-primary">
                          + Add to {slot.title}
                        </AppText>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* 5. Recommended Meal Suggestions */}
          <View className="mt-2">
            <View className="flex-row items-center justify-between mb-2">
              <View>
                <AppText weight="black" className="text-base text-neutral-dark">
                  Healthy Suggestions
                </AppText>
                <AppText weight="medium" className="text-[11px] text-neutral-muted">
                  Curated picks tailored to your day
                </AppText>
              </View>

              <TouchableOpacity
                onPress={() => router.push("/(app)/(tabs)/meals")}
                className="py-1 px-2.5 rounded-full bg-secondary-soft hover:bg-secondary"
                accessibilityRole="link"
                accessibilityLabel="View all daily meals"
              >
                <AppText weight="bold" className="text-xs text-primary">
                  View Catalog ›
                </AppText>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-mx-4 px-4 py-1"
            >
              {MOCK_RECIPES.slice(0, 4).map((meal) => (
                <View key={meal.id} className="mr-3 w-[240px]">
                  <MealCard
                    title={meal.title}
                    mealType={meal.category}
                    calories={meal.calories}
                    description={meal.description}
                    prepTimeMinutes={meal.prepTimeMinutes}
                    svgElement={<IconRenderer name={meal.svgIcon} size={76} />}
                    onLogMeal={() => handleOpenMealLog(meal)}
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
      </ScrollView>

      {/* Reusable MealLogModal */}
      <MealLogModal
        visible={isLogModalVisible}
        meal={selectedMealForLog}
        initialCategory={selectedCategoryForLog}
        customMode={isCustomMode}
        onClose={() => setIsLogModalVisible(false)}
      />
    </ScreenWrapper>
  );
}
