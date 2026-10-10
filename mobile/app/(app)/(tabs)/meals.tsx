import React, { useState, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, MealCard, MealLogModal } from "@/components/ui";
import { useRecipes } from "@/hooks/useRecipesQuery";
import { useJournalStore, getTodayDateKey, computeJournalAggregates } from "@/stores/useJournalStore";
import { IconRenderer } from "@/constants/Assets";
import { FoodItem } from "@/data/mockRecipes";

const SLOTS = ["All", "Breakfast", "Lunch", "Dinner", "Snack", "Drink"] as const;

export default function MealsScreen() {
  const router = useRouter();
  const { data: recipes = [] } = useRecipes();
  const [selectedSlot, setSelectedSlot] = useState<string>("All");

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

  const filteredMeals =
    selectedSlot === "All"
      ? recipes
      : recipes.filter((m) => m.category.toLowerCase() === selectedSlot.toLowerCase());

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
      {/* Polished Header with Hierarchy & Live Journal Aggregates */}
      <View
        className="px-5 pt-4 pb-3.5 bg-white border-b border-neutral-border-light flex-row items-center justify-between shadow-2xs"
      >
        <View className="flex-1 mr-3 max-w-[1120px] mx-auto flex-row items-center justify-between w-full">
          <View>
            <AppText weight="black" className="text-2xl text-neutral-dark tracking-tight">
              Daily Meals
            </AppText>
            <AppText
              weight="medium"
              className="text-xs text-neutral-muted mt-0.5 leading-4"
            >
              Plan, log, and track your breakfast, lunch, dinner, and snacks
            </AppText>
          </View>

          {/* Live Journal Tracker Status Chip */}
          <View
            className="h-9 px-3.5 rounded-full bg-secondary-soft border border-secondary flex-row items-center justify-center"
            accessibilityRole="summary"
            accessibilityLabel={`Today's log: ${aggregates.entryCount} meals, ${aggregates.totalConsumed} calories consumed`}
          >
            <View className="w-2 h-2 rounded-full bg-primary mr-1.5" />
            <AppText weight="extrabold" className="text-xs text-primary">
              {aggregates.entryCount} Logged • {aggregates.totalConsumed} kcal
            </AppText>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Filter Pills */}
        <View
          className="pt-4 pb-2 max-w-[1120px] mx-auto w-full"
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            className="flex-row"
          >
            {SLOTS.map((slot) => {
              const isSelected = selectedSlot === slot;
              return (
                <View
                  key={slot}
                >
                  <Pressable
                    onPress={() => setSelectedSlot(slot)}
                    className={`min-h-[38px] px-4 py-2 rounded-full mr-2.5 flex-row items-center justify-center transition-all duration-150 active:scale-95 ${
                      isSelected
                        ? "bg-primary shadow-xs"
                        : "bg-white border border-neutral-border-light hover:bg-neutral-surface cursor-pointer hover:border-neutral-border"
                    }`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Filter by ${slot}`}
                  >
                    <AppText
                      weight={isSelected ? "black" : "semibold"}
                      className={`text-[13px] transition-colors duration-150 ${
                        isSelected ? "text-white" : "text-neutral-dark"
                      }`}
                    >
                      {slot}
                    </AppText>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Meal Cards Display (Responsive Grid: 1 col on mobile, 2 col on tablet, 3 col on desktop) */}
        <View
          className="px-4 pt-2 max-w-[1120px] mx-auto w-full"
        >
          {filteredMeals.length === 0 ? (
            <View className="bg-white rounded-2xl p-10 items-center justify-center border border-neutral-border-light my-4 w-full">
              <View className="w-14 h-14 rounded-2xl bg-secondary-soft items-center justify-center mb-3 border border-secondary">
                <IconRenderer name="Cook" size={28} />
              </View>
              <AppText weight="extrabold" className="text-base text-neutral-dark mb-1 text-center">
                No meals found for "{selectedSlot}"
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted text-center max-w-xs mb-4 leading-relaxed">
                We couldn't find any meal items in this slot. Switch back to all meals or explore other categories.
              </AppText>
              <TouchableOpacity
                onPress={() => setSelectedSlot("All")}
                className="px-4 py-2 rounded-full bg-primary hover:bg-primary-dark transition-colors"
                accessibilityRole="button"
                accessibilityLabel="Reset slot to All"
              >
                <AppText weight="bold" className="text-xs text-white">
                  Show All Meals
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-row flex-wrap -mx-2">
              {filteredMeals.map((meal) => (
                <View
                  key={meal.id}
                  className="mb-4 px-2 w-full md:w-1/2 lg:w-1/3"
                >
                  <MealCard
                    title={meal.title}
                    mealType={meal.category}
                    calories={meal.calories}
                    description={meal.description}
                    prepTimeMinutes={meal.prepTimeMinutes}
                    svgElement={<IconRenderer name={meal.svgIcon} size={88} />}
                    onLogMeal={() => handleOpenLogModal(meal)}
                    onPress={() => handleOpenDetail(meal.id)}
                  />
                </View>
              ))}
            </View>
          )}
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
