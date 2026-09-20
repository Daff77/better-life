import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, Button, Header, NutritionCard, MealLogModal } from "@/components/ui";
import { MOCK_RECIPES } from "@/data/mockRecipes";
import { IconRenderer } from "@/constants/Assets";
import { useRecipe } from "@/hooks/useRecipesQuery";

export default function RecipeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: queriedRecipe, isLoading } = useRecipe(id || "");

  const [activeTab, setActiveTab] = useState<"instructions" | "ingredients">("instructions");
  const [isLogModalVisible, setIsLogModalVisible] = useState<boolean>(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  // Resolve recipe from query cache or mock recipes fallback
  const recipe =
    queriedRecipe ||
    MOCK_RECIPES.find((r) => r.id === id) ||
    (id ? null : MOCK_RECIPES[0]);

  if (isLoading && !recipe) {
    return (
      <ScreenWrapper maxWidth="mobile" className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#22c55e" />
        <AppText weight="medium" className="text-sm text-neutral-muted mt-3">
          Loading recipe details...
        </AppText>
      </ScreenWrapper>
    );
  }

  if (!recipe) {
    return (
      <ScreenWrapper maxWidth="mobile" className="flex-1 bg-white">
        <Header onBack={() => router.back()} title="Recipe Not Found" />
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-16 h-16 rounded-full bg-status-error/10 items-center justify-center mb-4">
            <AppText weight="bold" className="text-2xl text-status-error">
              !
            </AppText>
          </View>
          <AppText weight="extrabold" className="text-xl text-neutral-dark mb-1 text-center">
            Recipe Unavailable
          </AppText>
          <AppText weight="medium" className="text-sm text-neutral-muted text-center mb-6 max-w-xs">
            The requested recipe could not be found.
          </AppText>
          <Button
            title="Browse All Recipes"
            variant="primary"
            onPress={() => router.replace("/(app)/(tabs)/recipes")}
          />
        </View>
      </ScreenWrapper>
    );
  }

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleStep = (stepNumber: number) => {
    setCompletedSteps((prev) => ({ ...prev, [stepNumber]: !prev[stepNumber] }));
  };

  return (
    <ScreenWrapper maxWidth="mobile" className="flex-1 bg-white">
      {/* Header */}
      <Header
        onBack={() => router.back()}
        title={recipe.title}
        subtitle={`${recipe.category} • ${recipe.prepTimeMinutes} min • ${recipe.difficulty}`}
      />

      <ScrollView
        className="flex-1 px-5 pt-2 pb-12"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Artwork Box */}
        <View className="w-full h-52 bg-secondary-soft rounded-3xl items-center justify-center my-3 overflow-hidden border border-secondary shadow-xs">
          <IconRenderer name={recipe.svgIcon} size={150} />
        </View>

        {/* Nutritional Breakdown Card */}
        <NutritionCard
          proteinGrams={recipe.nutrition.proteinGrams}
          carbsGrams={recipe.nutrition.carbsGrams}
          fatGrams={recipe.nutrition.fatGrams}
          fiberGrams={recipe.nutrition.fiberGrams}
          totalCalories={recipe.calories}
          className="mb-4"
        />

        {/* Two-Tab Navigation: Instructions vs Ingredients */}
        <View className="flex-row bg-neutral-surface rounded-2xl p-1 mb-4 border border-neutral-border-light">
          <TouchableOpacity
            onPress={() => setActiveTab("instructions")}
            className={`flex-1 py-2 items-center justify-center rounded-xl transition-all ${
              activeTab === "instructions"
                ? "bg-white shadow-xs border border-neutral-border-light/60"
                : ""
            }`}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "instructions" }}
          >
            <AppText
              weight={activeTab === "instructions" ? "black" : "semibold"}
              className={`text-xs ${
                activeTab === "instructions" ? "text-primary" : "text-neutral-muted"
              }`}
            >
              How to Cook ({recipe.instructions.length} steps)
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("ingredients")}
            className={`flex-1 py-2 items-center justify-center rounded-xl transition-all ${
              activeTab === "ingredients"
                ? "bg-white shadow-xs border border-neutral-border-light/60"
                : ""
            }`}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "ingredients" }}
          >
            <AppText
              weight={activeTab === "ingredients" ? "black" : "semibold"}
              className={`text-xs ${
                activeTab === "ingredients" ? "text-primary" : "text-neutral-muted"
              }`}
            >
              Ingredients ({recipe.ingredients.length})
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Tab Content: Instructions */}
        {activeTab === "instructions" && (
          <View className="gap-y-3 mb-6">
            {recipe.instructions.map((step) => {
              const isCompleted = !!completedSteps[step.step];
              return (
                <TouchableOpacity
                  key={step.step}
                  activeOpacity={0.8}
                  onPress={() => toggleStep(step.step)}
                  className={`flex-row items-start p-3.5 rounded-2xl border transition-all ${
                    isCompleted
                      ? "bg-emerald-50/60 border-emerald-200 opacity-70"
                      : "bg-neutral-surface/60 border-neutral-border-light/70"
                  }`}
                >
                  <View
                    className={`w-6 h-6 rounded-full items-center justify-center mr-3 mt-0.5 shadow-2xs ${
                      isCompleted ? "bg-primary" : "bg-neutral-muted/30"
                    }`}
                  >
                    <AppText weight="bold" className="text-[11px] text-white">
                      {isCompleted ? "✓" : step.step}
                    </AppText>
                  </View>

                  <View className="flex-1">
                    <AppText
                      weight="medium"
                      className={`text-xs leading-relaxed ${
                        isCompleted
                          ? "line-through text-neutral-muted"
                          : "text-neutral-dark"
                      }`}
                    >
                      {step.text}
                    </AppText>

                    {step.timerMinutes && (
                      <View className="flex-row items-center mt-2 bg-secondary-soft px-2.5 py-0.5 rounded-full self-start border border-secondary">
                        <IconRenderer name="Clock" size={12} className="mr-1" />
                        <AppText weight="bold" className="text-[10px] text-primary">
                          Timer: {step.timerMinutes}:00 min
                        </AppText>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Tab Content: Ingredients */}
        {activeTab === "ingredients" && (
          <View className="gap-y-2.5 mb-6">
            {recipe.ingredients.map((ing, idx) => {
              const isChecked = !!checkedIngredients[idx];
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  onPress={() => toggleIngredient(idx)}
                  className={`flex-row items-center justify-between p-3 rounded-xl border ${
                    isChecked
                      ? "bg-emerald-50/60 border-emerald-200 opacity-70"
                      : "bg-neutral-surface/60 border-neutral-border-light/70"
                  }`}
                >
                  <View className="flex-row items-center gap-x-2.5">
                    <View
                      className={`w-4 h-4 rounded-md border items-center justify-center ${
                        isChecked
                          ? "bg-primary border-primary"
                          : "bg-white border-neutral-border"
                      }`}
                    >
                      {isChecked && (
                        <AppText weight="black" className="text-[10px] text-white">
                          ✓
                        </AppText>
                      )}
                    </View>
                    <AppText
                      weight="bold"
                      className={`text-xs ${
                        isChecked ? "line-through text-neutral-muted" : "text-neutral-dark"
                      }`}
                    >
                      {ing.name}
                    </AppText>
                  </View>
                  <AppText weight="semibold" className="text-xs text-primary">
                    {ing.amount}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Sticky Action CTA */}
        <View className="mt-1 mb-8">
          <Button
            title={`+ Log to Journal (${recipe.calories} kcal)`}
            variant="primary"
            onPress={() => setIsLogModalVisible(true)}
            accessibilityLabel={`Open log sheet for ${recipe.title}`}
          />
        </View>
      </ScrollView>

      {/* Shared MealLogModal */}
      <MealLogModal
        visible={isLogModalVisible}
        meal={recipe}
        onClose={() => setIsLogModalVisible(false)}
      />
    </ScreenWrapper>
  );
}
