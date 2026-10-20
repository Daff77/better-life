import React, { useState, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, MealCard, MealLogModal } from "@/components/ui";
import { useRecipes } from "@/hooks/useRecipesQuery";
import { useJournalStore, getTodayDateKey, computeJournalAggregates } from "@/stores/useJournalStore";
import { IconRenderer } from "@/constants/Assets";
import { FoodItem } from "@/data/mockRecipes";

const SLOTS = ["All", "Breakfast", "Lunch", "Dinner", "Snack", "Drink"] as const;
const BUDGET_FILTERS = ["All Budgets", "Under Rp 20k", "Under Rp 35k"] as const;

export default function MealsScreen() {
  const router = useRouter();
  const { data: recipes = [] } = useRecipes();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("All");
  const [selectedBudget, setSelectedBudget] = useState<string>("All Budgets");

  // Logging modal states
  const [selectedMealForLog, setSelectedMealForLog] = useState<FoodItem | null>(null);
  const [isLogModalVisible, setIsLogModalVisible] = useState<boolean>(false);

  // Derive aggregates directly from single source of truth with stable selector
  const todayDate = getTodayDateKey();
  const todayJournal = useJournalStore((state) => state.journals[todayDate]);
  const aggregates = useMemo(
    () => computeJournalAggregates(todayJournal),
    [todayJournal]
  );

  const filteredMeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return recipes.filter((m) => {
      const matchSearch =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q);

      const matchSlot =
        selectedSlot === "All" ||
        m.category.toLowerCase() === selectedSlot.toLowerCase();

      const cost = m.estimatedCostIdr ?? 0;
      let matchBudget = true;
      if (selectedBudget === "Under Rp 20k") {
        matchBudget = cost > 0 && cost <= 20000;
      } else if (selectedBudget === "Under Rp 35k") {
        matchBudget = cost > 0 && cost <= 35000;
      }

      return matchSearch && matchSlot && matchBudget;
    });
  }, [recipes, searchQuery, selectedSlot, selectedBudget]);

  const handleOpenLogModal = (meal: FoodItem) => {
    setSelectedMealForLog(meal);
    setIsLogModalVisible(true);
  };

  const handleOpenDetail = (mealId: string) => {
    router.push({
      pathname: "/(app)/recipe-detail",
      params: { id: mealId },
    });
  };

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#f7faf8]">
      {/* Responsive Header with Live Journal Aggregates */}
      <View className="px-4 sm:px-6 pt-3.5 pb-3 bg-white border-b border-[#e5ece7] shadow-2xs">
        <View className="max-w-[1240px] mx-auto w-full flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <View className="flex-1">
            <AppText weight="black" className="text-xl sm:text-2xl text-neutral-dark tracking-tight">
              Daily Meals & Logging
            </AppText>
            <AppText
              weight="medium"
              className="text-xs text-neutral-muted mt-0.5 leading-4"
            >
              Browse dishes, search foods, and track intake into your diary
            </AppText>
          </View>

          {/* Live Journal Tracker Status Chip */}
          <View
            className="self-start sm:self-center h-8 px-3 rounded-full bg-emerald-50 border border-emerald-200/80 flex-row items-center"
            accessibilityRole="summary"
            accessibilityLabel={`Today's log: ${aggregates.entryCount} meals, ${aggregates.totalConsumed} calories consumed`}
          >
            <View className="w-2 h-2 rounded-full bg-emerald-600 mr-1.5" />
            <AppText
              weight="extrabold"
              className="text-xs text-emerald-800"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {aggregates.entryCount} Logged • {aggregates.totalConsumed} kcal
            </AppText>
          </View>
        </View>

        {/* Real-Time Food Search Bar */}
        <View className="max-w-[1240px] mx-auto w-full mt-3">
          <View className="flex-row items-center bg-[#f2f8f4] border border-[#e5ece7] rounded-xl px-3 py-1.5 min-h-[44px]">
            <View className="mr-2">
              <IconRenderer name="Search" size={16} color="#9ca3af" />
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search dishes (e.g. Chicken, Rice, Tempeh, Oatmeal)..."
              placeholderTextColor="#9ca3af"
              className="flex-1 text-sm text-neutral-dark"
              style={{
                fontFamily: "Akatab-Medium",
                includeFontPadding: false,
                ...(Platform.OS === "web"
                  ? ({ outlineStyle: "none", boxShadow: "none" } as any)
                  : {}),
              }}
              accessibilityLabel="Search foods and meals"
              returnKeyType="search"
            />
            {Boolean(searchQuery) && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="w-6 h-6 rounded-full bg-neutral-200 items-center justify-center ml-1"
                accessibilityRole="button"
                accessibilityLabel="Clear search text"
              >
                <AppText weight="bold" className="text-xs text-neutral-600">
                  ✕
                </AppText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 56 : 112 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Filter Pills (44px Minimum Touch Targets) */}
        <View className="pt-3 pb-2 max-w-[1240px] mx-auto w-full">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            className="flex-row"
          >
            {SLOTS.map((slot) => {
              const isSelected = selectedSlot === slot;
              return (
                <Pressable
                  key={slot}
                  onPress={() => setSelectedSlot(slot)}
                  className={`min-h-[44px] px-4 sm:px-5 py-2 rounded-full mr-2 flex-row items-center justify-center transition-all duration-150 active:scale-[0.96] ${
                    isSelected
                      ? "bg-primary shadow-xs"
                      : "bg-white border border-[#e5ece7] active:bg-[#f2f8f4]"
                  } ${Platform.OS === "web" ? "cursor-pointer" : ""}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Filter by ${slot}`}
                >
                  <AppText
                    weight={isSelected ? "black" : "semibold"}
                    className={`text-xs sm:text-[13px] ${
                      isSelected ? "text-white" : "text-neutral-dark"
                    }`}
                  >
                    {slot}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Secondary Budget Tier Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            className="flex-row mt-2"
          >
            {BUDGET_FILTERS.map((budget) => {
              const isSelected = selectedBudget === budget;
              return (
                <Pressable
                  key={budget}
                  onPress={() => setSelectedBudget(budget)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-full mr-2 flex-row items-center justify-center active:scale-[0.96] ${
                    isSelected
                      ? "bg-emerald-700 shadow-xs"
                      : "bg-emerald-50/80 border border-emerald-200/60"
                  } ${Platform.OS === "web" ? "cursor-pointer" : ""}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Filter budget: ${budget}`}
                >
                  <AppText
                    weight={isSelected ? "bold" : "medium"}
                    className={`text-[11px] ${
                      isSelected ? "text-white" : "text-emerald-800"
                    }`}
                  >
                    🏷 {budget}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Meal Cards Display (Responsive Grid: 1 col on mobile, 2 col on tablet, 3 col on desktop) */}
        <View className="px-4 sm:px-5 pt-2 max-w-[1240px] mx-auto w-full">
          {filteredMeals.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center justify-center border border-neutral-border-light my-4 w-full">
              <View className="w-14 h-14 rounded-2xl bg-secondary-soft items-center justify-center mb-3 border border-secondary shadow-2xs">
                <IconRenderer name="Cook" size={28} />
              </View>
              <AppText weight="black" className="text-base text-neutral-dark mb-1 text-center">
                No matching meals found
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted text-center max-w-xs mb-4 leading-relaxed">
                {searchQuery
                  ? `No dishes matching "${searchQuery}". Try a different search term or reset filters.`
                  : "No dishes matching the active slot and budget filter."}
              </AppText>
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setSelectedSlot("All");
                  setSelectedBudget("All Budgets");
                }}
                className="px-5 py-2.5 rounded-full bg-primary active:bg-primary-dark transition-colors min-h-[44px] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Reset all filters and search"
              >
                <AppText weight="bold" className="text-xs text-white">
                  Reset Search & Filters
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-row flex-wrap -mx-2">
              {filteredMeals.map((meal) => (
                <View
                  key={meal.id}
                  className="mb-4 px-2 w-full sm:w-1/2 lg:w-1/3"
                >
                  <MealCard
                    title={meal.title}
                    mealType={meal.category}
                    calories={meal.calories}
                    description={meal.description}
                    prepTimeMinutes={meal.prepTimeMinutes}
                    estimatedCostIdr={meal.estimatedCostIdr}
                    imageUrl={meal.imageUrl}
                    svgElement={<IconRenderer name={meal.svgIcon} size={88} />}
                    onLogMeal={() => handleOpenLogModal(meal)}
                    onPress={() => handleOpenDetail(meal.id)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Budget-Aware Transparency Note */}
        <View className="px-4 sm:px-5 pt-3 pb-6 max-w-[1120px] mx-auto w-full">
          <View className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-100 flex-row items-start">
            <AppText className="text-base mr-3">💡</AppText>
            <View className="flex-1">
              <AppText weight="bold" className="text-xs text-emerald-900 mb-0.5">
                Budget-Aware Healthy Living
              </AppText>
              <AppText weight="medium" className="text-[11px] text-emerald-800/90 leading-4">
                Estimated ingredient costs reflect average local Indonesian market prices (crowdsourced estimates) to ensure balanced nutrition is realistic and affordable.
              </AppText>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Structured Meal Log Modal */}
      <MealLogModal
        visible={isLogModalVisible}
        meal={selectedMealForLog}
        onClose={() => setIsLogModalVisible(false)}
      />
    </ScreenWrapper>
  );
}
