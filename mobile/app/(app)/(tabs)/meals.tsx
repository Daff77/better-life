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
import { IconRenderer, CloseIconSvg, TagIconSvg, LightbulbIconSvg } from "@/constants/Assets";
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
    <ScreenWrapper maxWidth="full" noPadding className="flex-1 bg-[#faf9f5]">
      {/* ZONE 1: Compact Page Heading & Daily Journal Summary */}
      <View className="w-full bg-[#faf9f5] border-b border-[#eae8e1] px-4 sm:px-6 lg:px-8 pt-3 pb-3.5">
        <View className="max-w-[1280px] mx-auto w-full flex-col sm:flex-row sm:items-center justify-between gap-3">
          <View className="flex-1">
            <AppText weight="bold" className="text-xl sm:text-2xl text-neutral-dark tracking-tight">
              Daily Meals & Journal
            </AppText>
            <AppText
              weight="medium"
              className="text-xs text-neutral-muted mt-0.5 leading-relaxed"
            >
              Browse dishes, explore ingredients, and track nutrition into your daily journal.
            </AppText>
          </View>

          {/* Quiet Daily Journal Progress Chip */}
          <View
            className="self-start sm:self-center h-8 px-3.5 rounded-full bg-secondary-soft border border-secondary flex-row items-center gap-2"
            accessibilityRole="summary"
            accessibilityLabel={`Today's log: ${aggregates.entryCount} meals, ${aggregates.totalConsumed} of ${aggregates.targetCalories || 2582} calories`}
          >
            <View className="w-2 h-2 rounded-full bg-primary" />
            <AppText
              weight="bold"
              className="text-xs text-neutral-dark"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {aggregates.entryCount} Logged
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-muted">
              ·
            </AppText>
            <AppText
              weight="bold"
              className="text-xs text-primary"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {aggregates.totalConsumed} / {aggregates.targetCalories || 2582} kcal
            </AppText>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-[#faf9f5]"
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 56 : 112 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ZONE 2: One Cohesive Search and Filter Area */}
        <View className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-2">
          {/* Integrated Search Input */}
          <View className="flex-row items-center bg-[#f4f3ed] border border-[#eae8e1] rounded-xl px-3.5 py-1 min-h-[44px] transition-colors focus:border-primary">
            <View className="mr-2.5">
              <IconRenderer name="Search" size={16} color="#788079" />
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search dishes (e.g. Chicken, Rice, Tempeh, Oatmeal, Salad)..."
              placeholderTextColor="#8a928b"
              className="flex-1 text-sm text-neutral-dark font-medium"
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
                className="w-6 h-6 rounded-full bg-[#e2e0d8] items-center justify-center ml-1"
                accessibilityRole="button"
                accessibilityLabel="Clear search text"
              >
                <CloseIconSvg size={12} color="#5a625b" />
              </TouchableOpacity>
            )}
          </View>

          {/* Unified Horizontal Filter Strip (Categories & Budgets) */}
          <View className="mt-3">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, alignItems: "center" }}
              className="flex-row"
            >
              {/* Category Pills */}
              {SLOTS.map((slot) => {
                const isSelected = selectedSlot === slot;
                return (
                  <Pressable
                    key={slot}
                    onPress={() => setSelectedSlot(slot)}
                    className={`min-h-[38px] px-4 py-1.5 rounded-full flex-row items-center justify-center transition-all duration-150 active:scale-[0.97] ${
                      isSelected
                        ? "bg-primary shadow-xs"
                        : "bg-white border border-[#eae8e1] active:bg-[#f2f1eb]"
                    } ${Platform.OS === "web" ? "cursor-pointer hover:border-[#dcdfd9]" : ""}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Filter by ${slot}`}
                  >
                    <AppText
                      weight={isSelected ? "bold" : "medium"}
                      className={`text-xs ${
                        isSelected ? "text-white" : "text-neutral-dark"
                      }`}
                    >
                      {slot}
                    </AppText>
                  </Pressable>
                );
              })}

              {/* Subtle Vertical Divider between categories and budgets */}
              <View className="w-[1px] h-5 bg-[#e2dfd7] mx-1" />

              {/* Budget Filter Pills */}
              {BUDGET_FILTERS.map((budget) => {
                const isSelected = selectedBudget === budget;
                return (
                  <Pressable
                    key={budget}
                    onPress={() => setSelectedBudget(budget)}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-full flex-row items-center justify-center transition-all duration-150 active:scale-[0.97] ${
                      isSelected
                        ? "bg-[#52796f] shadow-xs"
                        : "bg-[#edf3ef] border border-[#d6e3db] active:bg-[#e4ede7]"
                    } ${Platform.OS === "web" ? "cursor-pointer hover:border-[#b8cfc2]" : ""}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Filter budget: ${budget}`}
                  >
                    <TagIconSvg
                      size={11}
                      color={isSelected ? "#ffffff" : "#3a564f"}
                      style={{ marginRight: 4 }}
                    />
                    <AppText
                      weight={isSelected ? "bold" : "medium"}
                      className={`text-xs ${
                        isSelected ? "text-white" : "text-[#2d463f]"
                      }`}
                    >
                      {budget}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* ZONE 3: Well-Aligned Recipe Catalogue (Primary Content) */}
        <View className="px-4 sm:px-6 lg:px-8 pt-3 max-w-[1280px] mx-auto w-full">
          {filteredMeals.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center justify-center border border-[#eae8e1] my-4 w-full">
              <View className="w-12 h-12 rounded-xl bg-secondary-soft items-center justify-center mb-3">
                <IconRenderer name="Cook" size={24} color="#153e28" />
              </View>
              <AppText weight="bold" className="text-base text-neutral-dark mb-1 text-center">
                No matching meals found
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted text-center max-w-xs mb-4 leading-relaxed">
                {searchQuery
                  ? `No dishes matching "${searchQuery}". Try a different keyword or reset filters.`
                  : "No dishes matching the active slot and budget filter."}
              </AppText>
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setSelectedSlot("All");
                  setSelectedBudget("All Budgets");
                }}
                className="px-5 py-2.5 rounded-xl bg-primary active:bg-primary-dark transition-colors min-h-[40px] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Reset all filters and search"
              >
                <AppText weight="bold" className="text-xs text-white">
                  Reset Search & Filters
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            /* Responsive Grid: 4 columns on desktop, 3 on tablet, 2 on small tablet, 1 on narrow phone */
            <View className="flex-row flex-wrap -mx-2">
              {filteredMeals.map((meal) => (
                <View
                  key={meal.id}
                  className="mb-4 px-2 w-full sm:w-1/2 md:w-1/3 lg:w-1/4"
                >
                  <MealCard
                    title={meal.title}
                    mealType={meal.category}
                    calories={meal.calories}
                    description={meal.description}
                    prepTimeMinutes={meal.prepTimeMinutes}
                    estimatedCostIdr={meal.estimatedCostIdr}
                    imageUrl={meal.imageUrl}
                    showLogButton={true}
                    onLogMeal={() => handleOpenLogModal(meal)}
                    onPress={() => handleOpenDetail(meal.id)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ZONE 4: Restrained Affordability Information Section */}
        <View className="px-4 sm:px-6 lg:px-8 pt-4 pb-6 max-w-[1280px] mx-auto w-full">
          <View className="bg-[#f5f4ee] rounded-xl p-4 border border-[#e8e6df] flex-row items-start">
            <View className="w-7 h-7 rounded-lg bg-[#e8ede7] items-center justify-center mr-3 mt-0.5">
              <LightbulbIconSvg size={15} color="#153e28" />
            </View>
            <View className="flex-1">
              <AppText weight="bold" className="text-xs text-neutral-dark mb-0.5">
                Affordability & Local Price Estimates
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted leading-relaxed">
                Estimated ingredient costs reflect average local Indonesian market prices (crowdsourced estimates) to help you plan balanced, realistic nutrition within budget.
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
