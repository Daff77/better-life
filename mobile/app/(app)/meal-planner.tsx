import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, Card, Badge, Button } from "@/components/ui";
import { useMealPlannerStore } from "@/stores/useMealPlannerStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  MealSlot,
  MealPlanRecord,
  DIETARY_RESTRICTION_OPTIONS,
  COMMON_ALLERGENS,
  DEFAULT_MEAL_SLOTS,
  formatIdr,
} from "@/lib/mealPlannerDomain";
import {
  CrownIconSvg,
  CheckIconSvg,
  CloseIconSvg,
  ChevronLeftIconSvg,
  ChevronRightIconSvg,
  EditIconSvg,
  LeafIconSvg,
} from "@/constants/Assets";

export default function MealPlannerScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const user = useAuthStore((state) => state.user);

  const {
    activePlan,
    selectedDayIndex,
    preferences,
    isLoading,
    isGenerating,
    isSaving,
    hasUnsavedChanges,
    error,
    checkedShoppingItemIds,
    preferenceModalOpen,
    substitutionModal,
    setSelectedDayIndex,
    setPreferenceModalOpen,
    updatePreferences,
    loadSavedPlan,
    generatePlan,
    savePlan,
    openSubstitutionModal,
    closeSubstitutionModal,
    replaceMeal,
    toggleShoppingItem,
    clearCheckedShoppingItems,
  } = useMealPlannerStore();

  const [activeTab, setActiveTab] = useState<"schedule" | "shopping">("schedule");

  // Local preferences form state
  const [calorieInput, setCalorieInput] = useState<string>(
    String(preferences.dailyCalorieTarget || 2000)
  );
  const [budgetInput, setBudgetInput] = useState<string>(
    String(preferences.dailyBudgetIdr || 50000)
  );
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>(
    preferences.dietaryRestrictions || []
  );
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(
    preferences.allergies || []
  );
  const [selectedSlots, setSelectedSlots] = useState<MealSlot[]>(
    preferences.preferredMealSlots || DEFAULT_MEAL_SLOTS
  );
  const [pantryInput, setPantryInput] = useState<string>(
    (preferences.availableIngredients || []).join(", ")
  );

  // Initialize and load saved plan on mount if user is premium
  useEffect(() => {
    if (isPremium) {
      loadSavedPlan();
    }
  }, [isPremium]);

  // Handle plan generation submit
  const handleGenerateSubmit = async () => {
    const cals = parseInt(calorieInput, 10) || 2000;
    const budget = parseInt(budgetInput, 10) || 50000;
    const pantry = pantryInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    updatePreferences({
      dailyCalorieTarget: cals,
      dailyBudgetIdr: budget,
      dietaryRestrictions: selectedRestrictions,
      allergies: selectedAllergies,
      preferredMealSlots: selectedSlots,
      availableIngredients: pantry,
      mealsPerDay: selectedSlots.length,
    });

    try {
      await generatePlan();
      Alert.alert(
        "Meal Plan Ready",
        "Your personalized 7-day schedule has been generated according to your exact nutritional requirements."
      );
    } catch (err: any) {
      Alert.alert("Generation Failed", err.message || "Failed to generate plan.");
    }
  };

  const handleSavePlan = async () => {
    try {
      await savePlan();
      Alert.alert("Plan Saved", "Your personalized meal plan has been saved to your account.");
    } catch (err: any) {
      Alert.alert("Save Failed", err.message || "Unable to save meal plan.");
    }
  };

  const currentDay = activePlan?.days?.[selectedDayIndex] || null;

  // Render Free Teaser / Preview View
  if (!isPremium) {
    return (
      <ScreenWrapper maxWidth="full" noPadding className="flex-1 bg-[#faf9f5]">
        {/* Header */}
        <View className="w-full bg-[#faf9f5] border-b border-[#eae8e1] px-4 sm:px-6 lg:px-8 pt-3 pb-3.5 flex-row justify-between items-center">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-[#eef4f0] border border-[#d6e4db] items-center justify-center active:scale-95"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ChevronLeftIconSvg size={18} color="#153e28" />
            </TouchableOpacity>
            <View>
              <View className="flex-row items-center gap-2">
                <AppText weight="bold" className="text-xl sm:text-2xl text-neutral-dark tracking-tight">
                  Personalized Meal Planner
                </AppText>
                <Badge label="Premium" variant="primary" />
              </View>
              <AppText weight="medium" className="text-xs text-neutral-muted">
                Weekly clinical meal schedules, allergen filters, and grocery budget optimization
              </AppText>
            </View>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-4 sm:px-6 lg:px-8 pt-5 bg-[#faf9f5]"
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="max-w-[920px] mx-auto w-full">
            {/* Value Proposition Hero Card */}
            <View className="bg-white rounded-3xl p-6 sm:p-8 border border-[#eae8e1] shadow-xs mb-6 overflow-hidden">
              <View className="flex-row items-center gap-3 mb-3">
                <View className="w-12 h-12 rounded-2xl bg-[#eaf5ef] border border-[#d6e4db] items-center justify-center">
                  <CrownIconSvg size={24} color="#b45309" />
                </View>
                <View className="flex-1">
                  <AppText weight="bold" className="text-lg sm:text-xl text-neutral-dark">
                    Intelligent Whole-Food Nutrition, Calibrated for You
                  </AppText>
                  <AppText weight="medium" className="text-xs text-neutral-muted">
                    No guesswork. Every meal calculated with verified calories, exact macronutrients, and estimated grocery costs.
                  </AppText>
                </View>
              </View>

              <View className="my-5 p-4 bg-[#faf9f5] rounded-2xl border border-[#eae8e1]">
                <AppText weight="bold" className="text-xs text-neutral-dark mb-3">
                  Sample 1-Day Clinical Meal Schedule Preview:
                </AppText>

                <View className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <View className="p-3 bg-white rounded-xl border border-[#eae8e1]">
                    <AppText weight="bold" className="text-[11px] text-primary uppercase">
                      Breakfast (320 kcal)
                    </AppText>
                    <AppText weight="bold" className="text-sm text-neutral-dark mt-0.5">
                      Greek Yogurt Berry Bowl
                    </AppText>
                    <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
                      Protein 22g • Carbs 38g • Fat 6g • Rp 28.000
                    </AppText>
                  </View>

                  <View className="p-3 bg-white rounded-xl border border-[#eae8e1]">
                    <AppText weight="bold" className="text-[11px] text-primary uppercase">
                      Lunch (580 kcal)
                    </AppText>
                    <AppText weight="bold" className="text-sm text-neutral-dark mt-0.5">
                      Mediterranean Herb Chicken Bowl
                    </AppText>
                    <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
                      Protein 48g • Carbs 45g • Fat 18g • Rp 24.000
                    </AppText>
                  </View>

                  <View className="p-3 bg-white rounded-xl border border-[#eae8e1]">
                    <AppText weight="bold" className="text-[11px] text-primary uppercase">
                      Dinner (480 kcal)
                    </AppText>
                    <AppText weight="bold" className="text-sm text-neutral-dark mt-0.5">
                      Turmeric Coconut Tofu & Veg Curry
                    </AppText>
                    <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
                      Protein 24g • Carbs 52g • Fat 18g • Rp 22.000
                    </AppText>
                  </View>

                  <View className="p-3 bg-white rounded-xl border border-[#eae8e1]">
                    <AppText weight="bold" className="text-[11px] text-primary uppercase">
                      Snack (160 kcal)
                    </AppText>
                    <AppText weight="bold" className="text-sm text-neutral-dark mt-0.5">
                      Cucumber Spears & Garlic Hummus
                    </AppText>
                    <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
                      Protein 6g • Carbs 16g • Fat 8g • Rp 9.000
                    </AppText>
                  </View>
                </View>

                {/* Day Summary Total Bar */}
                <View className="mt-4 pt-3 border-t border-[#eae8e1] flex-row justify-between items-center">
                  <AppText weight="bold" className="text-xs text-neutral-dark">
                    Daily Total: 1.540 kcal • Protein 100g (26%)
                  </AppText>
                  <AppText
                    weight="bold"
                    className="text-xs text-primary"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    Est. Cost: Rp 83.000
                  </AppText>
                </View>
              </View>

              {/* Capabilities checklist */}
              <View className="flex-col gap-2.5 mb-6">
                {[
                  "Complete 7-day varied schedules with zero repetitive meal fatigue",
                  "Strict automated allergen exclusions (Dairy, Eggs, Seafood, Nuts, Gluten, Soy)",
                  "Dietary adherence (Vegetarian, Vegan, Pescatarian, Halal, Keto, Gluten-Free)",
                  "Custom regional Indonesian grocery budget optimization",
                  "One-tap recipe substitutions with live calorie and budget deltas",
                  "Consolidated pantry shopping list with interactive checklist",
                ].map((item, idx) => (
                  <View key={idx} className="flex-row items-center gap-2.5">
                    <CheckIconSvg size={15} color="#1b7a53" />
                    <AppText weight="medium" className="text-xs text-neutral-dark">
                      {item}
                    </AppText>
                  </View>
                ))}
              </View>

              {/* Upgrade CTA */}
              <Button
                variant="primary"
                size="lg"
                title="Upgrade to Premium to Unlock Meal Planner"
                onPress={() => router.push("/(app)/upgrade")}
                className="w-full min-h-[52px] rounded-2xl"
              />
              <AppText weight="medium" className="text-center text-[11px] text-neutral-muted mt-2.5">
                Plans start at Rp 33.250 / month. Cancel anytime with full access through billing period.
              </AppText>
            </View>
          </View>
        </ScrollView>
      </ScreenWrapper>
    );
  }

  // Render PREMIUM User Full Interactive Experience
  return (
    <ScreenWrapper maxWidth="full" noPadding className="flex-1 bg-[#faf9f5]">
      {/* Top Header */}
      <View className="w-full bg-[#faf9f5] border-b border-[#eae8e1] px-4 sm:px-6 lg:px-8 pt-3 pb-3.5 flex-row justify-between items-center">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-[#eef4f0] border border-[#d6e4db] items-center justify-center active:scale-95"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeftIconSvg size={18} color="#153e28" />
          </TouchableOpacity>
          <View>
            <View className="flex-row items-center gap-2">
              <AppText weight="bold" className="text-xl sm:text-2xl text-neutral-dark tracking-tight">
                Meal Planner
              </AppText>
              {hasUnsavedChanges && (
                <Badge label="Unsaved Changes" variant="secondary" />
              )}
            </View>
            <AppText weight="medium" className="text-xs text-neutral-muted">
              Weekly clinical schedule tailored to your health goals
            </AppText>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => setPreferenceModalOpen(true)}
            className="px-3.5 py-2 rounded-full bg-white border border-[#eae8e1] flex-row items-center gap-1.5 active:bg-[#f4f2ec]"
            accessibilityRole="button"
            accessibilityLabel="Preferences"
          >
            <EditIconSvg size={14} color="#1b7a53" />
            <AppText weight="bold" className="text-xs text-neutral-dark">
              Preferences
            </AppText>
          </TouchableOpacity>

          {activePlan && (
            <TouchableOpacity
              onPress={handleSavePlan}
              disabled={isSaving}
              className={`px-4 py-2 rounded-full flex-row items-center gap-1.5 active:scale-95 ${
                hasUnsavedChanges ? "bg-primary" : "bg-[#eaf5ef] border border-[#d6e4db]"
              }`}
              accessibilityRole="button"
              accessibilityLabel="Save plan"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={hasUnsavedChanges ? "#fff" : "#1b7a53"} />
              ) : (
                <AppText
                  weight="bold"
                  className={`text-xs ${hasUnsavedChanges ? "text-white" : "text-primary"}`}
                >
                  Save Plan
                </AppText>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 sm:px-6 lg:px-8 pt-4 bg-[#faf9f5]"
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="max-w-[960px] mx-auto w-full">
          {/* If no plan generated yet, show prompt to generate */}
          {!activePlan && !isLoading && (
            <View className="bg-white rounded-3xl p-8 border border-[#eae8e1] items-center text-center my-6">
              <View className="w-14 h-14 rounded-2xl bg-[#eaf5ef] items-center justify-center mb-4">
                <LeafIconSvg size={28} color="#1b7a53" />
              </View>
              <AppText weight="bold" className="text-xl text-neutral-dark text-center mb-1">
                Create Your 7-Day Personalized Schedule
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted text-center max-w-[480px] mb-6">
                Our clinical nutrition engine will balance recipes against your calorie targets ({preferences.dailyCalorieTarget} kcal), dietary restrictions, and budget.
              </AppText>
              <Button
                variant="primary"
                size="lg"
                title={isGenerating ? "Generating Schedule..." : "Generate 7-Day Plan"}
                loading={isGenerating}
                onPress={handleGenerateSubmit}
                className="w-full max-w-[320px] rounded-2xl"
              />
            </View>
          )}

          {activePlan && (
            <>
              {/* Tab Selector: Schedule vs Shopping List */}
              <View className="flex-row bg-[#edebe4] p-1 rounded-2xl mb-4 max-w-[340px] self-start">
                <TouchableOpacity
                  onPress={() => setActiveTab("schedule")}
                  className={`flex-1 py-1.5 px-4 rounded-xl items-center justify-center ${
                    activeTab === "schedule" ? "bg-white shadow-xs" : ""
                  }`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeTab === "schedule" }}
                >
                  <AppText
                    weight={activeTab === "schedule" ? "bold" : "medium"}
                    className={`text-xs ${
                      activeTab === "schedule" ? "text-neutral-dark" : "text-neutral-muted"
                    }`}
                  >
                    7-Day Schedule
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab("shopping")}
                  className={`flex-1 py-1.5 px-4 rounded-xl items-center justify-center ${
                    activeTab === "shopping" ? "bg-white shadow-xs" : ""
                  }`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activeTab === "shopping" }}
                >
                  <AppText
                    weight={activeTab === "shopping" ? "bold" : "medium"}
                    className={`text-xs ${
                      activeTab === "shopping" ? "text-neutral-dark" : "text-neutral-muted"
                    }`}
                  >
                    Shopping List ({activePlan.shoppingList.reduce((sum, c) => sum + c.items.length, 0)})
                  </AppText>
                </TouchableOpacity>
              </View>

              {activeTab === "schedule" ? (
                <>
                  {/* Horizontal 7-Day Strip */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mb-4 -mx-1"
                  >
                    <View className="flex-row gap-2 px-1">
                      {activePlan.days.map((day, idx) => {
                        const isSelected = selectedDayIndex === idx;
                        return (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => setSelectedDayIndex(idx)}
                            className={`px-3.5 py-2.5 rounded-2xl border transition-all ${
                              isSelected
                                ? "bg-primary border-primary shadow-xs"
                                : "bg-white border-[#eae8e1]"
                            }`}
                            accessibilityRole="button"
                            accessibilityLabel={`Select ${day.day}`}
                          >
                            <AppText
                              weight="bold"
                              className={`text-xs ${isSelected ? "text-white" : "text-neutral-dark"}`}
                            >
                              {day.day.slice(0, 3)}
                            </AppText>
                            <AppText
                              weight="bold"
                              className={`text-[11px] mt-0.5 ${
                                isSelected ? "text-emerald-100" : "text-neutral-muted"
                              }`}
                              style={{ fontVariant: ["tabular-nums"] }}
                            >
                              {day.totals.calories} kcal
                            </AppText>
                            <AppText
                              weight="medium"
                              className={`text-[10px] ${
                                isSelected ? "text-emerald-100" : "text-primary"
                              }`}
                              style={{ fontVariant: ["tabular-nums"] }}
                            >
                              {formatIdr(day.totals.estimatedCostIdr)}
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>

                  {/* Day Nutrition Metrics Card */}
                  {currentDay && (
                    <View className="bg-white rounded-3xl p-5 border border-[#eae8e1] shadow-xs mb-5">
                      <View className="flex-row justify-between items-center mb-3">
                        <View>
                          <AppText weight="bold" className="text-base text-neutral-dark">
                            {currentDay.day} Nutrition & Budget Target
                          </AppText>
                          <AppText weight="medium" className="text-xs text-neutral-muted">
                            Caloric Target: {preferences.dailyCalorieTarget} kcal • Daily Budget: {formatIdr(preferences.dailyBudgetIdr)}
                          </AppText>
                        </View>
                        <View className="items-end">
                          <AppText
                            weight="bold"
                            className="text-base text-primary"
                            style={{ fontVariant: ["tabular-nums"] }}
                          >
                            {currentDay.totals.calories} kcal
                          </AppText>
                          <AppText
                            weight="bold"
                            className="text-xs text-neutral-dark"
                            style={{ fontVariant: ["tabular-nums"] }}
                          >
                            {formatIdr(currentDay.totals.estimatedCostIdr)}
                          </AppText>
                        </View>
                      </View>

                      {/* Macro Split Pills */}
                      <View className="flex-row gap-2 pt-2 border-t border-[#f2f0ea]">
                        <View className="flex-1 bg-[#f9faf7] p-2.5 rounded-xl border border-[#eceae3]">
                          <AppText weight="bold" className="text-[10px] text-neutral-muted uppercase">
                            Protein
                          </AppText>
                          <AppText weight="bold" className="text-xs text-neutral-dark mt-0.5">
                            {currentDay.totals.proteinGrams}g
                          </AppText>
                        </View>
                        <View className="flex-1 bg-[#f9faf7] p-2.5 rounded-xl border border-[#eceae3]">
                          <AppText weight="bold" className="text-[10px] text-neutral-muted uppercase">
                            Carbohydrates
                          </AppText>
                          <AppText weight="bold" className="text-xs text-neutral-dark mt-0.5">
                            {currentDay.totals.carbsGrams}g
                          </AppText>
                        </View>
                        <View className="flex-1 bg-[#f9faf7] p-2.5 rounded-xl border border-[#eceae3]">
                          <AppText weight="bold" className="text-[10px] text-neutral-muted uppercase">
                            Healthy Fats
                          </AppText>
                          <AppText weight="bold" className="text-xs text-neutral-dark mt-0.5">
                            {currentDay.totals.fatGrams}g
                          </AppText>
                        </View>
                        <View className="flex-1 bg-[#f9faf7] p-2.5 rounded-xl border border-[#eceae3]">
                          <AppText weight="bold" className="text-[10px] text-neutral-muted uppercase">
                            Dietary Fiber
                          </AppText>
                          <AppText weight="bold" className="text-xs text-neutral-dark mt-0.5">
                            {currentDay.totals.fiberGrams}g
                          </AppText>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Meal Slot Cards for Active Day */}
                  {currentDay && (
                    <View className="flex-col gap-3.5 mb-6">
                      {currentDay.meals.map((item, idx) => (
                        <View
                          key={idx}
                          className="bg-white rounded-2xl border border-[#eae8e1] p-4 shadow-xs flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <TouchableOpacity
                            onPress={() =>
                              router.push({
                                pathname: "/(app)/recipe-detail",
                                params: { id: item.recipe.id },
                              })
                            }
                            className="flex-row items-center gap-3.5 flex-1"
                            accessibilityRole="button"
                            accessibilityLabel={`View recipe ${item.recipe.title}`}
                          >
                            {item.recipe.imageUrl ? (
                              <Image
                                source={{ uri: item.recipe.imageUrl }}
                                className="w-16 h-16 rounded-xl bg-neutral-surface"
                                resizeMode="cover"
                              />
                            ) : (
                              <View className="w-16 h-16 rounded-xl bg-[#eaf5ef] items-center justify-center">
                                <LeafIconSvg size={22} color="#1b7a53" />
                              </View>
                            )}

                            <View className="flex-1">
                              <View className="flex-row items-center gap-2">
                                <Badge label={item.slot} variant="outline" size="sm" />
                                {item.recipe.isPremium && (
                                  <Badge label="Chef Collection" variant="primary" size="sm" />
                                )}
                              </View>
                              <AppText weight="bold" className="text-sm text-neutral-dark mt-1">
                                {item.recipe.title}
                              </AppText>
                              <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
                                {item.recipe.calories} kcal • {item.recipe.prepTimeMinutes}m prep •{" "}
                                {formatIdr(item.recipe.estimatedCostIdr || 0)}
                              </AppText>
                            </View>
                          </TouchableOpacity>

                          {/* Replace / Swap Button */}
                          <TouchableOpacity
                            onPress={() =>
                              openSubstitutionModal(
                                selectedDayIndex,
                                item.slot,
                                item.recipe.id
                              )
                            }
                            className="self-end sm:self-center px-3.5 py-2 rounded-xl bg-[#eef4f0] border border-[#d6e4db] active:bg-[#e4ede7] flex-row items-center gap-1.5"
                            accessibilityRole="button"
                            accessibilityLabel={`Replace ${item.slot}`}
                          >
                            <AppText weight="bold" className="text-xs text-[#153e28]">
                              Replace Meal
                            </AppText>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Trade-Off Notes & Wellness Disclaimers */}
                  <View className="p-4 bg-[#f4f3ed] rounded-2xl border border-[#eae8e1] mb-6">
                    <AppText weight="bold" className="text-xs text-neutral-dark mb-1">
                      Nutritional Guidance & Solver Notes:
                    </AppText>
                    {activePlan.summary.tradeOffNotes.map((note, idx) => (
                      <AppText key={idx} weight="medium" className="text-[11px] text-neutral-muted leading-relaxed mt-1">
                        • {note}
                      </AppText>
                    ))}
                    <AppText weight="medium" className="text-[11px] text-neutral-muted leading-relaxed mt-2 pt-2 border-t border-[#e5e3dc]">
                      {activePlan.summary.disclaimer}
                    </AppText>
                  </View>
                </>
              ) : (
                /* Shopping List Mode */
                <View className="bg-white rounded-3xl p-5 sm:p-6 border border-[#eae8e1] shadow-xs mb-6">
                  <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-[#f2f0ea]">
                    <View>
                      <AppText weight="bold" className="text-base text-neutral-dark">
                        Consolidated Grocery Checklist
                      </AppText>
                      <AppText weight="medium" className="text-xs text-neutral-muted">
                        Aggregated ingredients for your 7-day meal plan
                      </AppText>
                    </View>

                    {checkedShoppingItemIds.length > 0 && (
                      <TouchableOpacity
                        onPress={clearCheckedShoppingItems}
                        className="px-3 py-1.5 rounded-full bg-neutral-surface border border-neutral-border"
                      >
                        <AppText weight="bold" className="text-[11px] text-neutral-dark">
                          Clear Checked ({checkedShoppingItemIds.length})
                        </AppText>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View className="flex-col gap-6">
                    {activePlan.shoppingList.map((cat, catIdx) => (
                      <View key={catIdx}>
                        <AppText weight="bold" className="text-xs text-primary uppercase tracking-wide mb-2.5">
                          {cat.category}
                        </AppText>
                        <View className="divide-y divide-[#f2f0ea] bg-[#faf9f5] rounded-2xl border border-[#eae8e1] overflow-hidden">
                          {cat.items.map((item) => {
                            const isChecked = checkedShoppingItemIds.includes(item.id);
                            return (
                              <TouchableOpacity
                                key={item.id}
                                onPress={() => toggleShoppingItem(item.id)}
                                className="px-4 py-3 flex-row items-center justify-between active:bg-[#f2efe6]"
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: isChecked }}
                              >
                                <View className="flex-row items-center gap-3 flex-1">
                                  <View
                                    className={`w-5 h-5 rounded-md border items-center justify-center ${
                                      isChecked
                                        ? "bg-primary border-primary"
                                        : "bg-white border-[#cfccc0]"
                                    }`}
                                  >
                                    {isChecked && <CheckIconSvg size={13} color="#fff" />}
                                  </View>
                                  <AppText
                                    weight="medium"
                                    className={`text-xs ${
                                      isChecked
                                        ? "text-neutral-muted line-through"
                                        : "text-neutral-dark"
                                    }`}
                                  >
                                    {item.name}
                                  </AppText>
                                </View>
                                <AppText
                                  weight="bold"
                                  className={`text-xs ${
                                    isChecked ? "text-neutral-muted" : "text-primary"
                                  }`}
                                >
                                  {item.amount}
                                </AppText>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Preferences Configuration Modal */}
      {preferenceModalOpen && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center px-4 py-8 z-50">
          <View className="w-full max-w-[500px] bg-white rounded-3xl p-6 shadow-2xl max-h-[90%] flex-col">
            <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-[#eae8e1]">
              <AppText weight="bold" className="text-lg text-neutral-dark">
                Meal Plan Preferences
              </AppText>
              <TouchableOpacity
                onPress={() => setPreferenceModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#f2f0ea] items-center justify-center"
              >
                <CloseIconSvg size={14} color="#153e28" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1 pr-1">
              {/* Daily Calorie Target */}
              <View className="mb-4">
                <AppText weight="bold" className="text-xs text-neutral-dark mb-1">
                  Daily Calorie Target (kcal)
                </AppText>
                <TextInput
                  value={calorieInput}
                  onChangeText={setCalorieInput}
                  keyboardType="numeric"
                  className="w-full h-11 px-3.5 bg-[#faf9f5] border border-[#d6e4db] rounded-xl text-neutral-dark text-sm font-semibold"
                  placeholder="e.g. 2000"
                />
              </View>

              {/* Daily Budget Target */}
              <View className="mb-4">
                <AppText weight="bold" className="text-xs text-neutral-dark mb-1">
                  Daily Grocery Budget (IDR)
                </AppText>
                <TextInput
                  value={budgetInput}
                  onChangeText={setBudgetInput}
                  keyboardType="numeric"
                  className="w-full h-11 px-3.5 bg-[#faf9f5] border border-[#d6e4db] rounded-xl text-neutral-dark text-sm font-semibold"
                  placeholder="e.g. 50000"
                />
              </View>

              {/* Dietary Restrictions */}
              <View className="mb-4">
                <AppText weight="bold" className="text-xs text-neutral-dark mb-1.5">
                  Dietary Restrictions
                </AppText>
                <View className="flex-row flex-wrap gap-1.5">
                  {DIETARY_RESTRICTION_OPTIONS.map((opt) => {
                    const isSelected = selectedRestrictions.includes(opt);
                    return (
                      <TouchableOpacity
                        key={opt}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedRestrictions(selectedRestrictions.filter((r) => r !== opt));
                          } else {
                            setSelectedRestrictions([...selectedRestrictions, opt]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full border ${
                          isSelected
                            ? "bg-primary border-primary"
                            : "bg-[#faf9f5] border-[#eae8e1]"
                        }`}
                      >
                        <AppText
                          weight="semibold"
                          className={`text-xs ${isSelected ? "text-white" : "text-neutral-dark"}`}
                        >
                          {opt}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Allergens */}
              <View className="mb-4">
                <AppText weight="bold" className="text-xs text-neutral-dark mb-1.5">
                  Allergies to Exclude
                </AppText>
                <View className="flex-row flex-wrap gap-1.5">
                  {COMMON_ALLERGENS.map((allergen) => {
                    const isSelected = selectedAllergies.includes(allergen);
                    return (
                      <TouchableOpacity
                        key={allergen}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedAllergies(selectedAllergies.filter((a) => a !== allergen));
                          } else {
                            setSelectedAllergies([...selectedAllergies, allergen]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full border ${
                          isSelected
                            ? "bg-[#b45309] border-[#b45309]"
                            : "bg-[#faf9f5] border-[#eae8e1]"
                        }`}
                      >
                        <AppText
                          weight="semibold"
                          className={`text-xs ${isSelected ? "text-white" : "text-neutral-dark"}`}
                        >
                          {allergen}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Available Pantry Ingredients */}
              <View className="mb-6">
                <AppText weight="bold" className="text-xs text-neutral-dark mb-1">
                  Pantry Ingredients to Prioritize (comma separated)
                </AppText>
                <TextInput
                  value={pantryInput}
                  onChangeText={setPantryInput}
                  className="w-full h-11 px-3.5 bg-[#faf9f5] border border-[#d6e4db] rounded-xl text-neutral-dark text-sm"
                  placeholder="e.g. Avocado, Quinoa, Eggs, Tempeh"
                />
              </View>
            </ScrollView>

            <View className="pt-4 border-t border-[#eae8e1] flex-row gap-3">
              <TouchableOpacity
                onPress={() => setPreferenceModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-neutral-surface border border-neutral-border items-center justify-center"
              >
                <AppText weight="bold" className="text-xs text-neutral-dark">
                  Cancel
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleGenerateSubmit}
                disabled={isGenerating}
                className="flex-1 py-3 rounded-xl bg-primary items-center justify-center"
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <AppText weight="bold" className="text-xs text-white">
                    Generate Plan
                  </AppText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Substitution Drawer / Modal */}
      {substitutionModal.isOpen && (
        <View className="absolute inset-0 bg-black/50 items-center justify-center px-4 py-8 z-50">
          <View className="w-full max-w-[480px] bg-white rounded-3xl p-6 shadow-2xl max-h-[85%] flex-col">
            <View className="flex-row justify-between items-center mb-3 pb-3 border-b border-[#eae8e1]">
              <View>
                <AppText weight="bold" className="text-base text-neutral-dark">
                  Substitute {substitutionModal.slot}
                </AppText>
                <AppText weight="medium" className="text-xs text-neutral-muted">
                  Choose an alternative dish fitting your nutritional constraints
                </AppText>
              </View>
              <TouchableOpacity
                onPress={closeSubstitutionModal}
                className="w-8 h-8 rounded-full bg-[#f2f0ea] items-center justify-center"
              >
                <CloseIconSvg size={14} color="#153e28" />
              </TouchableOpacity>
            </View>

            {substitutionModal.isLoading ? (
              <View className="py-12 items-center justify-center">
                <ActivityIndicator size="large" color="#1b7a53" />
                <AppText weight="medium" className="text-xs text-neutral-muted mt-2">
                  Finding matching recipes...
                </AppText>
              </View>
            ) : substitutionModal.candidates.length === 0 ? (
              <View className="py-10 items-center">
                <AppText weight="medium" className="text-xs text-neutral-muted text-center">
                  No alternative recipes currently match your strict allergy and dietary criteria for this slot.
                </AppText>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} className="flex-1 divide-y divide-[#f2f0ea]">
                {substitutionModal.candidates.map((cand, idx) => (
                  <View key={idx} className="py-3 flex-row items-center justify-between gap-3">
                    <View className="flex-1">
                      <AppText weight="bold" className="text-xs text-neutral-dark">
                        {cand.recipe.title}
                      </AppText>
                      <AppText weight="medium" className="text-[11px] text-neutral-muted mt-0.5">
                        {cand.recipe.calories} kcal • {formatIdr(cand.recipe.estimatedCostIdr || 0)}
                      </AppText>
                      <View className="flex-row items-center gap-2 mt-1">
                        <AppText
                          weight="bold"
                          className={`text-[10px] ${
                            cand.calorieDiff > 0 ? "text-amber-700" : "text-emerald-700"
                          }`}
                        >
                          {cand.calorieDiff > 0 ? `+${cand.calorieDiff}` : cand.calorieDiff} kcal
                        </AppText>
                        <AppText weight="medium" className="text-[10px] text-neutral-muted">
                          {cand.costDiffIdr > 0 ? `+${formatIdr(cand.costDiffIdr)}` : formatIdr(cand.costDiffIdr)}
                        </AppText>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => replaceMeal(cand.recipe.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-primary active:opacity-90"
                    >
                      <AppText weight="bold" className="text-xs text-white">
                        Select Dish
                      </AppText>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      )}
    </ScreenWrapper>
  );
}
