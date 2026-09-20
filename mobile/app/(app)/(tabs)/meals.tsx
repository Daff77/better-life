import React, { useState, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, MealCard, MealLogModal } from "@/components/ui";
import { useRecipes } from "@/hooks/useRecipesQuery";
import {
  useJournalStore,
  getTodayDateKey,
  computeJournalAggregates,
} from "@/stores/useJournalStore";
import { IconRenderer } from "@/constants/Assets";
import { FoodItem } from "@/data/mockRecipes";
import { JournalCategory } from "@/lib/schemas";

const SLOTS = ["All", "Breakfast", "Lunch", "Dinner", "Snack", "Drink"] as const;

export default function MealsScreen() {
  const router = useRouter();
  const { data: recipes = [] } = useRecipes();
  const [selectedSlot, setSelectedSlot] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Logging modal states
  const [selectedMealForLog, setSelectedMealForLog] = useState<FoodItem | null>(null);
  const [isCustomLogMode, setIsCustomLogMode] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<JournalCategory>("Breakfast");
  const [isLogModalVisible, setIsLogModalVisible] = useState<boolean>(false);

  // Journal aggregates
  const todayDate = getTodayDateKey();
  const todayJournal = useJournalStore((state) => state.journals[todayDate]);
  const aggregates = useMemo(
    () => computeJournalAggregates(todayJournal),
    [todayJournal]
  );

  const filteredMeals = recipes.filter((meal) => {
    const matchesSlot =
      selectedSlot === "All" ||
      meal.category.toLowerCase() === selectedSlot.toLowerCase();

    const matchesSearch =
      searchQuery.trim().length === 0 ||
      meal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meal.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSlot && matchesSearch;
  });

  const handleOpenLogModal = (meal: FoodItem) => {
    setSelectedMealForLog(meal);
    setSelectedCategory((meal.category as JournalCategory) || "Breakfast");
    setIsCustomLogMode(false);
    setIsLogModalVisible(true);
  };

  const handleOpenCustomLog = () => {
    setSelectedMealForLog(null);
    setSelectedCategory(
      selectedSlot !== "All" && selectedSlot !== "Drink"
        ? (selectedSlot as JournalCategory)
        : "Breakfast"
    );
    setIsCustomLogMode(true);
    setIsLogModalVisible(true);
  };

  const handleOpenDetail = (mealId: string) => {
    router.push({
      pathname: "/(app)/recipe-detail",
      params: { id: mealId },
    });
  };

  return (
    <ScreenWrapper maxWidth="mobile" className="flex-1 bg-[#f7faf8]">
      {/* Header */}
      <View className="px-5 pt-4 pb-3 bg-white border-b border-neutral-border-light/80 shadow-2xs">
        <View className="flex-row items-center justify-between mb-2">
          <View>
            <AppText weight="black" className="text-2xl text-neutral-dark">
              Daily Meals
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-muted">
              Discover, plan & log your nutrition
            </AppText>
          </View>

          {/* Live Status Pill */}
          <View className="h-8 px-3 rounded-full bg-secondary-soft border border-secondary flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-primary mr-1.5" />
            <AppText weight="extrabold" className="text-xs text-primary">
              {aggregates.totalConsumed} kcal
            </AppText>
          </View>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-neutral-surface border border-neutral-border rounded-xl px-3 py-1.5">
          <AppText className="text-sm mr-2 text-neutral-muted">🔍</AppText>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search healthy food, salad, bowl..."
            placeholderTextColor="#94a3b8"
            className="flex-1 text-sm text-neutral-dark font-medium"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} className="p-1">
              <AppText weight="bold" className="text-xs text-neutral-muted">
                ✕
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Filter Pills */}
        <View className="pt-3 pb-2">
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
                  className={`min-h-[34px] px-3.5 py-1.5 rounded-full mr-2 flex-row items-center justify-center transition-all duration-150 active:scale-95 ${
                    isSelected
                      ? "bg-primary shadow-xs"
                      : "bg-white border border-neutral-border-light hover:bg-neutral-surface"
                  }`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Filter by ${slot}`}
                >
                  <AppText
                    weight={isSelected ? "black" : "semibold"}
                    className={`text-xs ${
                      isSelected ? "text-white" : "text-neutral-dark"
                    }`}
                  >
                    {slot}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Custom Food Action Banner */}
        <View className="px-4 mb-3">
          <TouchableOpacity
            onPress={handleOpenCustomLog}
            activeOpacity={0.8}
            className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex-row items-center justify-between shadow-2xs"
          >
            <View className="flex-row items-center gap-2.5">
              <View className="w-8 h-8 rounded-xl bg-primary items-center justify-center">
                <AppText weight="black" className="text-white text-base">
                  +
                </AppText>
              </View>
              <View>
                <AppText weight="extrabold" className="text-xs text-emerald-900">
                  Can't find your food?
                </AppText>
                <AppText weight="medium" className="text-[10px] text-emerald-700">
                  Log a custom dish with calories & macros
                </AppText>
              </View>
            </View>

            <View className="px-2.5 py-1 rounded-lg bg-primary">
              <AppText weight="bold" className="text-xs text-white">
                Log Custom
              </AppText>
            </View>
          </TouchableOpacity>
        </View>

        {/* Meals Grid / Feed */}
        <View className="px-4">
          {filteredMeals.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center justify-center border border-neutral-border-light my-4">
              <View className="w-12 h-12 rounded-2xl bg-secondary-soft items-center justify-center mb-3 border border-secondary">
                <IconRenderer name="Cook" size={24} />
              </View>
              <AppText weight="extrabold" className="text-sm text-neutral-dark mb-1 text-center">
                No meals found
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted text-center max-w-xs mb-4 leading-relaxed">
                {searchQuery
                  ? `No results matching "${searchQuery}". Try different keywords.`
                  : `No meals listed under "${selectedSlot}".`}
              </AppText>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => {
                    setSelectedSlot("All");
                    setSearchQuery("");
                  }}
                  className="px-3.5 py-2 rounded-xl bg-neutral-surface border border-neutral-border"
                >
                  <AppText weight="bold" className="text-xs text-neutral-dark">
                    Reset Filters
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleOpenCustomLog}
                  className="px-3.5 py-2 rounded-xl bg-primary"
                >
                  <AppText weight="bold" className="text-xs text-white">
                    + Log Custom
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View className="gap-y-3.5">
              {filteredMeals.map((meal) => (
                <MealCard
                  key={meal.id}
                  title={meal.title}
                  mealType={meal.category}
                  calories={meal.calories}
                  description={meal.description}
                  prepTimeMinutes={meal.prepTimeMinutes}
                  svgElement={<IconRenderer name={meal.svgIcon} size={80} />}
                  onLogMeal={() => handleOpenLogModal(meal)}
                  onPress={() => handleOpenDetail(meal.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* MealLogModal */}
      <MealLogModal
        visible={isLogModalVisible}
        meal={selectedMealForLog}
        initialCategory={selectedCategory}
        customMode={isCustomLogMode}
        onClose={() => setIsLogModalVisible(false)}
      />
    </ScreenWrapper>
  );
}
