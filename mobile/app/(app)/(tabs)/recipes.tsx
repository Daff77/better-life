import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, RecipeCard, Badge } from "@/components/ui";
import { useRecipes } from "@/hooks/useRecipesQuery";
import { FoodItem } from "@/lib/schemas";

const CATEGORIES = ["All", "Breakfast", "Lunch", "Dinner", "Snack", "Drink"] as const;

export default function RecipesScreen() {
  const router = useRouter();
  const { data: recipes = [] } = useRecipes();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const filteredRecipes =
    selectedCategory === "All"
      ? recipes
      : recipes.filter((r) => r.category === selectedCategory);

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#f8faf8]">
      {/* Header */}
      <View className="px-6 pt-5 pb-4 bg-white border-b border-[#e5ece7]">
        <View className="max-w-[1240px] mx-auto w-full">
          <AppText weight="black" className="text-2xl text-neutral-dark">
            Healthy Recipes
          </AppText>
          <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
            Curated dishes tailored to your caloric goals
          </AppText>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 48 : 96 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Horizontal Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4 -mx-5 px-5"
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                className="mr-2 transition-transform hover:scale-105"
                activeOpacity={0.8}
              >
                <Badge
                  label={cat}
                  variant={isSelected ? "primary" : "secondary"}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Recipe Cards Grid */}
        <View className="flex-row flex-wrap -mx-2 mt-1">
          {filteredRecipes.map((recipe) => (
            <View
              key={recipe.id}
              className="w-full md:w-1/2 lg:w-1/3 px-2"
            >
              <RecipeCard
                title={recipe.title}
                category={recipe.category}
                calories={recipe.calories}
                prepTimeMinutes={recipe.prepTimeMinutes}
                difficulty={recipe.difficulty}
                imageUrl={recipe.imageUrl}
                svgName={recipe.svgIcon}
                onPress={() => router.push(`/(app)/recipe-detail?id=${recipe.id}`)}
              />
            </View>
          ))}
          {filteredRecipes.length === 0 && (
            <View className="w-full py-12 px-6 items-center justify-center bg-white rounded-2xl border border-neutral-border-light my-4">
              <View className="w-12 h-12 rounded-full bg-secondary-soft items-center justify-center mb-3 border border-secondary">
                <AppText weight="bold" className="text-2xl">
                  🍲
                </AppText>
              </View>
              <AppText weight="extrabold" className="text-base text-neutral-dark mb-1 text-center">
                No recipes for "{selectedCategory}"
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted text-center max-w-xs mb-4 leading-relaxed">
                We couldn't find any dishes in this category. Browse all curated recipes or pick another filter.
              </AppText>
              <TouchableOpacity
                onPress={() => setSelectedCategory("All")}
                className="px-4 py-2 rounded-full bg-primary hover:bg-primary-dark transition-colors"
                accessibilityRole="button"
                accessibilityLabel="Reset filter to All"
              >
                <AppText weight="bold" className="text-xs text-white">
                  Show All Recipes
                </AppText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
