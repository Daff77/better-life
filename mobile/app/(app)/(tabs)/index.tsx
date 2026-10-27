import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  Platform,
  Image,
  TextInput,
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
import {
  IconRenderer,
  CloseIconSvg,
  CalendarIconSvg,
  LeafIconSvg,
  BowlIconSvg,
  ChefHatIconSvg,
  ZapIconSvg,
  UtensilsIconSvg,
  BookOpenIconSvg,
  BellIconSvg,
  SearchIconSvg,
  ChevronRightIconSvg,
} from "@/constants/Assets";
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

  // Derived user initials for avatar
  const userInitials = useMemo(() => {
    if (!user?.name) return "DA";
    const parts = user.name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.name.slice(0, 2).toUpperCase();
  }, [user?.name]);

  // Search input state
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      router.push({
        pathname: "/(app)/(tabs)/meals",
        params: { search: searchQuery.trim() },
      });
    } else {
      router.push("/(app)/(tabs)/meals");
    }
  };

  // Dynamic greeting based on current local hour
  const currentHour = new Date().getHours();
  const greetingTime =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
      ? "Good afternoon"
      : "Good evening";

  // Formatted date string (e.g. "Tue, Oct 27, 2026")
  const formattedToday = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
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

  /* Render Quick Actions Card (Matching screenshot) */
  const renderQuickFoodLoggingBar = () => (
    <View className="bg-white rounded-3xl border border-[#e5ece7] p-5 shadow-2xs">
      <View className="flex-row items-center gap-2 mb-3.5">
        <ZapIconSvg size={16} color="#f59e0b" fill="#f59e0b" />
        <AppText weight="black" className="text-sm sm:text-base text-neutral-dark">
          Quick Actions
        </AppText>
      </View>

      <View className="flex-col gap-2.5">
        {/* Log Food Button (Solid Dark Forest Green) */}
        <TouchableOpacity
          onPress={() => router.push("/(app)/(tabs)/meals")}
          className={`w-full min-h-[48px] rounded-2xl bg-[#166534] active:bg-[#14532d] px-4 py-3.5 flex-row items-center justify-between shadow-xs transition-all ${
            Platform.OS === "web" ? "cursor-pointer hover:bg-[#14532d]" : ""
          }`}
          accessibilityRole="button"
          accessibilityLabel="Log Food"
        >
          <View className="flex-row items-center gap-2.5">
            <UtensilsIconSvg size={17} color="#ffffff" />
            <AppText weight="extrabold" className="text-white text-sm">
              Log Food
            </AppText>
          </View>
          <ChevronRightIconSvg size={15} color="#ffffff" />
        </TouchableOpacity>

        {/* Browse Recipes Button (White with subtle border) */}
        <TouchableOpacity
          onPress={() => router.push("/(app)/(tabs)/recipes")}
          className={`w-full min-h-[48px] rounded-2xl bg-white active:bg-neutral-50 border border-[#e5ece7] px-4 py-3.5 flex-row items-center justify-between transition-all ${
            Platform.OS === "web" ? "cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/20" : ""
          }`}
          accessibilityRole="button"
          accessibilityLabel="Browse Recipes"
        >
          <View className="flex-row items-center gap-2.5">
            <BookOpenIconSvg size={17} color="#166534" />
            <AppText weight="extrabold" className="text-neutral-dark text-sm">
              Browse Recipes
            </AppText>
          </View>
          <ChevronRightIconSvg size={15} color="#166534" />
        </TouchableOpacity>
      </View>
    </View>
  );

  /* Render Today's Journal Section Component */
  const renderTodaysJournalSection = () => (
    <View className="bg-white rounded-3xl border border-[#e5ece7] p-5 shadow-2xs">
      {/* Journal Header */}
      <View className="flex-row items-center justify-between pb-1">
        <View className="flex-row items-center gap-2.5">
          <View className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 items-center justify-center">
            <BowlIconSvg size={18} color="#166534" />
          </View>
          <AppText weight="black" className="text-base text-neutral-dark">
            Today's Meals
          </AppText>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(app)/(tabs)/meals")}
          className={`flex-row items-center gap-1 ${Platform.OS === "web" ? "cursor-pointer" : ""}`}
          accessibilityRole="link"
          accessibilityLabel="View all today's meals"
        >
          <AppText weight="bold" className="text-xs text-emerald-800">
            View All
          </AppText>
          <ChevronRightIconSvg size={12} color="#166534" />
        </TouchableOpacity>
      </View>

      <AppText weight="medium" className="text-xs text-neutral-muted mt-1 mb-3">
        {aggregates.entryCount} meals logged · Real-time diary
      </AppText>

      {/* Journal Empty State (When 0 total meals logged today) */}
      {aggregates.entryCount === 0 ? (
        <View className="py-6 px-4 items-center justify-center">
          <View className="w-14 h-14 rounded-full bg-[#dcf3e6] items-center justify-center mb-3">
            <BowlIconSvg size={26} color="#166534" />
          </View>
          <AppText weight="black" className="text-sm sm:text-base text-neutral-dark mb-1 text-center">
            No meals logged yet today
          </AppText>
          <AppText weight="medium" className="text-xs text-neutral-muted text-center max-w-[240px] mb-4 leading-relaxed">
            Start tracking your breakfast, lunch, dinner or snacks to stay on your plan.
          </AppText>
          <TouchableOpacity
            onPress={() => router.push("/(app)/(tabs)/meals")}
            className={`py-3 px-6 rounded-xl bg-[#166534] active:bg-[#14532d] shadow-xs ${
              Platform.OS === "web" ? "cursor-pointer hover:bg-[#14532d]" : ""
            }`}
            accessibilityRole="button"
            accessibilityLabel="Log First Meal"
          >
            <AppText weight="black" className="text-xs text-white">
              + Log First Meal
            </AppText>
          </TouchableOpacity>
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

                {/* Slot Entries List */}
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

  /* Render Daily Calorie Budget Card (Matching reference screenshot) */
  const renderCalorieOverviewCard = () => (
    <View className="bg-white rounded-3xl border border-[#e5ece7] p-5 sm:p-6 shadow-2xs">
      {/* Card Header: Leaf Icon + Title + Remaining pill */}
      <View className="flex-row items-center justify-between pb-3 mb-3 border-b border-[#f0f4f1]">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 items-center justify-center">
            <LeafIconSvg size={20} color="#166534" />
          </View>
          <View>
            <AppText weight="black" className="text-base sm:text-lg text-neutral-dark tracking-tight">
              Daily Calorie Budget
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
              Real-time intake vs your personalized plan
            </AppText>
          </View>
        </View>

        {/* Top-Right Badge: Remaining kcal */}
        <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80">
          <LeafIconSvg size={13} color="#059669" />
          <AppText weight="extrabold" className="text-xs text-emerald-800">
            {aggregates.remainingCalories.toLocaleString()} kcal left
          </AppText>
        </View>
      </View>

      {/* Middle Row: ProgressRing on left + 3 Stats on right */}
      <View className="flex-row items-center justify-between py-2 sm:py-3 gap-6">
        {/* Left: Circular Ring with 0% and of 2,582 kcal */}
        <View className="items-center justify-center flex-shrink-0">
          <ProgressRing
            progress={progressPercent}
            size={isNarrowMobile ? 96 : 116}
            strokeWidth={11}
            color="#10b981"
            backgroundColor="#dcf5e7"
            label={`of ${aggregates.targetCalories.toLocaleString()} kcal`}
          />
        </View>

        {/* Right: 3 Stats (Consumed, Remaining, Target) */}
        <View className="flex-1 flex-row items-center justify-around sm:justify-evenly">
          {/* Consumed */}
          <View className="items-center sm:items-start">
            <AppText weight="black" className="text-2xl sm:text-3xl text-neutral-dark tracking-tight leading-none">
              {aggregates.totalConsumed.toLocaleString()}
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-muted mt-1.5">
              Consumed
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-muted leading-tight">
              kcal
            </AppText>
          </View>

          {/* Remaining (Bold Green) */}
          <View className="items-center sm:items-start">
            <AppText weight="black" className="text-2xl sm:text-3xl text-emerald-700 tracking-tight leading-none">
              {aggregates.remainingCalories.toLocaleString()}
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-muted mt-1.5">
              Remaining
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-muted leading-tight">
              kcal
            </AppText>
          </View>

          {/* Target */}
          <View className="items-center sm:items-start">
            <AppText weight="black" className="text-2xl sm:text-3xl text-neutral-dark tracking-tight leading-none">
              {aggregates.targetCalories.toLocaleString()}
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-muted mt-1.5">
              Target
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-muted leading-tight">
              kcal
            </AppText>
          </View>
        </View>
      </View>

      {/* Bottom Progress Bar with consumed / target on left and percent on right */}
      <View className="mt-3 pt-3 border-t border-[#f0f4f1]">
        <ProgressBar
          progress={progressPercent}
          height={7}
          color="#10b981"
          backgroundColor="#dcf5e7"
        />
        <View className="flex-row items-center justify-between mt-2">
          <AppText weight="semibold" className="text-xs text-neutral-muted">
            {aggregates.totalConsumed.toLocaleString()} / {aggregates.targetCalories.toLocaleString()} kcal
          </AppText>
          <AppText weight="bold" className="text-xs text-neutral-muted">
            {progressPercent}%
          </AppText>
        </View>
      </View>
    </View>
  );

  /* Render Physical Activity Section (Matching reference screenshot) */
  const renderActivitySection = () => (
    <View className="bg-white rounded-3xl border border-[#e5ece7] p-5 sm:p-6 shadow-2xs">
      {/* Header: Running Shoe icon in circle + Title + Subtitle */}
      <View className="flex-row items-center gap-3 pb-3 mb-4 border-b border-[#f0f4f1]">
        <View className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 items-center justify-center">
          <IconRenderer name="Shoe" size={20} color="#166534" />
        </View>
        <View>
          <AppText weight="black" className="text-base sm:text-lg text-neutral-dark tracking-tight">
            Physical Activity
          </AppText>
          <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
            Movement & active calories burned
          </AppText>
        </View>
      </View>

      <View className="flex-col sm:flex-row gap-4">
        {/* Steps Card */}
        <View className="flex-1 bg-[#fbfdfb] p-4 rounded-2xl border border-[#e5ece7] justify-between">
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <IconRenderer name="Shoe" size={17} color="#0d9488" />
                <AppText weight="extrabold" className="text-xs text-neutral-dark">
                  Daily Steps
                </AppText>
              </View>
              <View className="bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200/70">
                <AppText weight="extrabold" className="text-[10px] text-teal-800">
                  Pedometer
                </AppText>
              </View>
            </View>

            <View className="flex-row items-baseline justify-between mb-2.5">
              <View className="flex-row items-baseline">
                <AnimatedNumber
                  value={activity?.steps ?? 3420}
                  weight="black"
                  className="text-2xl text-neutral-dark tracking-tight"
                />
                <AppText weight="semibold" className="text-xs text-neutral-muted ml-1">
                  / {(activity?.stepGoal ?? 6000).toLocaleString()}
                </AppText>
              </View>
              <AppText weight="bold" className="text-xs text-neutral-muted">
                {Math.round(activity ? (activity.steps / activity.stepGoal) * 100 : 57)}%
              </AppText>
            </View>

            <ProgressBar
              progress={activity ? (activity.steps / activity.stepGoal) * 100 : 57}
              color="#0d9488"
              backgroundColor="#ccfbf1"
              height={6}
            />
          </View>

          <TouchableOpacity
            onPress={() => addStepsMutation.mutate(500)}
            disabled={addStepsMutation.isPending}
            className={`mt-4 py-2.5 px-4 rounded-xl bg-[#e8f8ee] border border-emerald-200/70 items-center justify-center flex-row active:scale-98 transition-all ${
              Platform.OS === "web" ? "cursor-pointer hover:bg-emerald-100/60" : ""
            }`}
            accessibilityRole="button"
            accessibilityLabel="Add 500 walking steps"
          >
            <AppText weight="extrabold" className="text-xs text-emerald-800">
              +500 Steps
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Active Energy Card */}
        <View className="flex-1 bg-[#fbfdfb] p-4 rounded-2xl border border-[#e5ece7] justify-between">
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <IconRenderer name="Fire" size={17} color="#f59e0b" />
                <AppText weight="extrabold" className="text-xs text-neutral-dark">
                  Active Energy
                </AppText>
              </View>
              <View className="bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/70">
                <AppText weight="extrabold" className="text-[10px] text-amber-800">
                  Workout
                </AppText>
              </View>
            </View>

            <View className="flex-row items-baseline mb-2">
              <AnimatedNumber
                value={activity?.exerciseCalories ?? 240}
                weight="black"
                className="text-2xl text-neutral-dark tracking-tight mr-1.5"
              />
              <AppText weight="medium" className="text-xs text-neutral-muted">
                kcal burned
              </AppText>
            </View>
          </View>

          <View className="flex-row items-center pt-3 border-t border-[#f0f4f1] mt-3">
            <IconRenderer name="Clock" size={15} color="#f59e0b" className="mr-2" />
            <AppText weight="semibold" className="text-xs text-neutral-dark">
              {activity?.exerciseDurationMinutes ?? 35} mins active duration
            </AppText>
          </View>
        </View>
      </View>
    </View>
  );

  /* Render Curated Meal Suggestions (Matching reference screenshot) */
  const renderMealSuggestions = () => (
    <View className="bg-white rounded-3xl border border-[#e5ece7] p-5 sm:p-6 shadow-2xs relative">
      <View className="flex-row items-center justify-between pb-3 mb-4 border-b border-[#f0f4f1]">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 items-center justify-center">
            <ChefHatIconSvg size={20} color="#166534" />
          </View>
          <View>
            <AppText weight="black" className="text-base sm:text-lg text-neutral-dark tracking-tight">
              Curated Meal Suggestions
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
              Healthy dishes tailored to your remaining budget
            </AppText>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(app)/(tabs)/recipes")}
          className={`flex-row items-center gap-1 ${Platform.OS === "web" ? "cursor-pointer" : ""}`}
          accessibilityRole="link"
          accessibilityLabel="Explore all curated recipes"
        >
          <AppText weight="extrabold" className="text-xs text-emerald-800">
            Explore All
          </AppText>
          <ChevronRightIconSvg size={12} color="#166534" />
        </TouchableOpacity>
      </View>

      <View className="relative">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-1 px-1"
          contentContainerStyle={{ gap: 14 }}
        >
          {MOCK_RECIPES.slice(0, 4).map((meal) => (
            <View key={meal.id} className="w-[200px] sm:w-[220px]">
              <MealCard
                title={meal.title}
                mealType={meal.category}
                calories={meal.calories}
                description={meal.description}
                prepTimeMinutes={meal.prepTimeMinutes}
                estimatedCostIdr={meal.estimatedCostIdr}
                imageUrl={meal.imageUrl}
                showLogButton={false}
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

        {/* Floating Right Navigation Chevron */}
        <TouchableOpacity
          onPress={() => router.push("/(app)/(tabs)/recipes")}
          className={`absolute right-0 top-1/2 -mt-4 w-8 h-8 rounded-full bg-white border border-[#e5ece7] shadow-md items-center justify-center z-10 ${
            Platform.OS === "web" ? "cursor-pointer hover:bg-neutral-50" : ""
          }`}
          accessibilityRole="button"
          accessibilityLabel="Scroll next recipes"
        >
          <ChevronRightIconSvg size={15} color="#374151" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#f8faf8]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: Platform.OS === "web" ? 56 : 112,
        }}
      >
        {/* TOP HEADER: Date, Greeting, Search Bar, Notification, Avatar */}
        <View className="mb-6 flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Date + Greeting + Subtitle */}
          <View>
            <View className="flex-row items-center gap-1.5 mb-1">
              <CalendarIconSvg size={15} color="#166534" />
              <AppText weight="bold" className="text-xs text-emerald-800">
                {formattedToday}
              </AppText>
            </View>
            <AppText
              weight="black"
              className="text-2xl sm:text-3xl text-neutral-dark tracking-tight"
            >
              {greetingTime}, {user?.name?.split(" ")[0] || "Daffa"} 👋
            </AppText>
            <AppText weight="medium" className="text-xs sm:text-sm text-neutral-muted mt-0.5">
              Let's keep going toward your daily goals.
            </AppText>
          </View>

          {/* Right: Search Bar + Bell + Avatar */}
          <View className="flex-row items-center gap-3">
            {/* Search Input */}
            <View className="flex-row items-center bg-[#eef3f0] rounded-full px-4 py-2.5 w-full sm:w-[280px] lg:w-[320px]">
              <SearchIconSvg size={16} color="#6b7280" />
              <TextInput
                placeholder="Search food, recipes, or anything..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                className="ml-2 flex-1 text-xs text-neutral-dark font-medium"
              />
            </View>

            {/* Notification Bell Button */}
            <TouchableOpacity
              onPress={() =>
                Alert.alert("Notifications", "You're all caught up! No unread notifications.")
              }
              className={`w-10 h-10 rounded-full bg-white border border-[#e5ece7] items-center justify-center shadow-2xs relative ${
                Platform.OS === "web" ? "cursor-pointer hover:bg-neutral-50" : ""
              }`}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <BellIconSvg size={18} color="#374151" />
              <View className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-600" />
            </TouchableOpacity>

            {/* User Profile Avatar */}
            <TouchableOpacity
              onPress={() => router.push("/(app)/(tabs)/profile")}
              className={`w-10 h-10 rounded-full bg-[#a7f3d0] items-center justify-center border border-emerald-300 ${
                Platform.OS === "web" ? "cursor-pointer hover:opacity-90" : ""
              }`}
              accessibilityRole="button"
              accessibilityLabel="View profile settings"
            >
              <AppText weight="black" className="text-xs text-emerald-900 tracking-wider">
                {userInitials}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2-COLUMN DESKTOP / 1-COLUMN MOBILE LAYOUT */}
        {isDesktop ? (
          <View className="flex-row gap-6 items-start">
            {/* Left Column (Main Stats & Suggestions) */}
            <View className="flex-1 flex-col gap-6 min-w-0">
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

            {/* Right Column (Quick Actions & Today's Meals) */}
            <View className="w-[340px] lg:w-[380px] flex-col gap-6 flex-shrink-0">
              {renderQuickFoodLoggingBar()}
              {renderTodaysJournalSection()}
            </View>
          </View>
        ) : (
          /* Mobile Stacked View */
          <View className="flex-col gap-4">
            {renderCalorieOverviewCard()}
            {renderQuickFoodLoggingBar()}
            {renderTodaysJournalSection()}
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

