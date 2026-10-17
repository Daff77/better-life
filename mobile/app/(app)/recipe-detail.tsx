import React, { useState } from "react";
import { View, Image, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
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

  // Resolve recipe from query cache or mock recipes fallback
  const recipe = queriedRecipe || MOCK_RECIPES.find((r) => r.id === id) || (id ? null : MOCK_RECIPES[0]);

  if (isLoading && !recipe) {
    return (
      <ScreenWrapper className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#67c090" />
        <AppText weight="medium" className="text-sm text-neutral-muted mt-3">
          Loading recipe details...
        </AppText>
      </ScreenWrapper>
    );
  }

  // Graceful handling of invalid or missing recipe ID
  if (!recipe) {
    return (
      <ScreenWrapper className="flex-1 bg-white">
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
            The requested recipe could not be found or has an invalid reference.
          </AppText>
          <Button
            title="Browse All Recipes"
            variant="primary"
            onPress={() => router.replace("/(app)/(tabs)/recipes")}
            accessibilityLabel="Return to recipe catalog"
          />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-white">
      {/* Header */}
      <Header
        onBack={() => router.back()}
        title={recipe.title}
        subtitle={`${recipe.category} • ${recipe.prepTimeMinutes} min • ${recipe.difficulty}`}
      />

      <ScrollView
        className="flex-1 px-6 pt-2 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-col lg:flex-row lg:gap-8 mt-2">
          {/* Left Column: Hero Art + Nutrition + Primary Action */}
          <View className="w-full lg:w-5/12">
            {/* Hero Artwork Box */}
            <View className="w-full h-64 lg:h-80 bg-secondary-soft rounded-3xl items-center justify-center my-3 overflow-hidden border border-secondary shadow-sm relative">
              {recipe.imageUrl ? (
                <>
                  <Image
                    source={{ uri: recipe.imageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                  <View className="absolute inset-x-0 bottom-0 h-16 bg-black/25" />
                </>
              ) : (
                <IconRenderer name={recipe.svgIcon} size={180} />
              )}
            </View>

            {/* Estimated Ingredient Cost Banner */}
            {recipe.estimatedCostIdr !== undefined && (
              <View className="mb-4 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/70 flex-row items-center justify-between">
                <View>
                  <AppText weight="extrabold" className="text-xs text-emerald-900">
                    Est. Ingredient Cost
                  </AppText>
                  <AppText weight="medium" className="text-[10px] text-emerald-700/80">
                    Average local market price (IDR)
                  </AppText>
                </View>
                <View className="bg-white px-3 py-1 rounded-xl border border-emerald-200/60 shadow-xs">
                  <AppText weight="black" className="text-sm text-emerald-800">
                    Rp {recipe.estimatedCostIdr.toLocaleString("id-ID")}
                  </AppText>
                </View>
              </View>
            )}

            {/* Nutritional Breakdown Card */}
            <NutritionCard
              proteinGrams={recipe.nutrition.proteinGrams}
              carbsGrams={recipe.nutrition.carbsGrams}
              fatGrams={recipe.nutrition.fatGrams}
              fiberGrams={recipe.nutrition.fiberGrams}
              totalCalories={recipe.calories}
              className="mb-6"
            />

            {/* Structured Log to Journal Button (Desktop placement) */}
            <View className="hidden lg:flex mb-8">
              <Button
                title={`+ Log to Journal (${recipe.calories} kcal)`}
                variant="primary"
                onPress={() => setIsLogModalVisible(true)}
                accessibilityLabel={`Open log sheet for ${recipe.title}`}
              />
            </View>
          </View>

          {/* Right Column: Cooking Tabs, Steps, Ingredients */}
          <View className="w-full lg:w-7/12">
            {/* Two-Tab Navigation: Instructions vs Ingredients */}
            <View className="flex-row bg-neutral-surface rounded-2xl p-1 mb-6 border border-neutral-border-light">
              <TouchableOpacity
                onPress={() => setActiveTab("instructions")}
                className={`flex-1 py-2.5 items-center justify-center rounded-xl transition-all ${
                  activeTab === "instructions" ? "bg-white shadow-sm border border-neutral-border-light/60" : ""
                }`}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === "instructions" }}
              >
                <AppText
                  weight={activeTab === "instructions" ? "bold" : "medium"}
                  className={`text-sm ${
                    activeTab === "instructions" ? "text-primary" : "text-neutral-muted"
                  }`}
                >
                  How to Cook
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab("ingredients")}
                className={`flex-1 py-2.5 items-center justify-center rounded-xl transition-all ${
                  activeTab === "ingredients" ? "bg-white shadow-sm border border-neutral-border-light/60" : ""
                }`}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === "ingredients" }}
              >
                <AppText
                  weight={activeTab === "ingredients" ? "bold" : "medium"}
                  className={`text-sm ${
                    activeTab === "ingredients" ? "text-primary" : "text-neutral-muted"
                  }`}
                >
                  Ingredients ({recipe.ingredients.length})
                </AppText>
              </TouchableOpacity>
            </View>

            {/* Tab Content: Instructions */}
            {activeTab === "instructions" && (
              <View className="gap-y-4 mb-6">
                {recipe.instructions.map((step) => (
                  <View
                    key={step.step}
                    className="flex-row items-start bg-neutral-surface/60 p-4 rounded-2xl border border-neutral-border-light/60"
                  >
                    <View className="w-7 h-7 rounded-full bg-primary items-center justify-center mr-3.5 mt-0.5 shadow-sm">
                      <AppText weight="bold" className="text-xs text-white">
                        {step.step}
                      </AppText>
                    </View>

                    <View className="flex-1">
                      <AppText
                        weight="medium"
                        className="text-sm text-neutral-dark leading-relaxed"
                      >
                        {step.text}
                      </AppText>

                      {step.timerMinutes && (
                        <View className="flex-row items-center mt-2.5 bg-secondary-soft px-3 py-1 rounded-full self-start border border-secondary">
                          <IconRenderer name="Clock" size={14} className="mr-1.5" />
                          <AppText weight="bold" className="text-xs text-accent-teal">
                            Timer: {step.timerMinutes}:00 min
                          </AppText>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Tab Content: Ingredients */}
            {activeTab === "ingredients" && (
              <View className="gap-y-3 mb-6">
                {recipe.ingredients.map((ing, idx) => (
                  <View
                    key={idx}
                    className="flex-row items-center justify-between p-3.5 bg-neutral-surface/60 rounded-xl border border-neutral-border-light/60"
                  >
                    <View className="flex-row items-center gap-x-2.5">
                      <View className="w-2.5 h-2.5 rounded-full bg-primary" />
                      <AppText weight="bold" className="text-sm text-neutral-dark">
                        {ing.name}
                      </AppText>
                    </View>
                    <AppText weight="semibold" className="text-xs text-primary">
                      {ing.amount}
                    </AppText>
                  </View>
                ))}
              </View>
            )}

            {/* Structured Log to Journal Button (Mobile placement) */}
            <View className="lg:hidden mt-2 mb-8">
              <Button
                title={`+ Log to Journal (${recipe.calories} kcal)`}
                variant="primary"
                onPress={() => setIsLogModalVisible(true)}
                accessibilityLabel={`Open log sheet for ${recipe.title}`}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Shared MealLogModal for structured quantity and meal-type logging */}
      <MealLogModal
        visible={isLogModalVisible}
        meal={recipe}
        onClose={() => setIsLogModalVisible(false)}
      />
    </ScreenWrapper>
  );
}
