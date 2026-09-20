import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, RecipeCard } from "@/components/ui";
import { useRecipes } from "@/hooks/useRecipesQuery";

const CATEGORIES = ["All", "Breakfast", "Lunch", "Dinner", "Snack", "Drink"] as const;

export default function RecipesScreen() {
  const router = useRouter();
  const { data: recipes = [] } = useRecipes();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesCategory =
      selectedCategory === "All" || recipe.category === selectedCategory;

    const matchesSearch =
      searchQuery.trim().length === 0 ||
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <ScreenWrapper maxWidth="mobile" className="flex-1 bg-[#f7faf8]">
      {/* Header */}
      <View className="px-5 pt-4 pb-3 bg-white border-b border-neutral-border-light/80 shadow-2xs">
        <View className="mb-2">
          <AppText weight="black" className="text-2xl text-neutral-dark">
            Healthy Recipes
          </AppText>
          <AppText weight="medium" className="text-xs text-neutral-muted">
            Nutritious culinary inspiration for your goals
          </AppText>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-neutral-surface border border-neutral-border rounded-xl px-3 py-1.5">
          <AppText className="text-sm mr-2 text-neutral-muted">🔍</AppText>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search recipes, ingredients..."
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
        {/* Category Horizontal Filter Chips */}
        <View className="pt-3 pb-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            className="flex-row"
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  className={`min-h-[34px] px-3.5 py-1.5 rounded-full mr-2 flex-row items-center justify-center transition-all duration-150 active:scale-95 ${
                    isSelected
                      ? "bg-primary shadow-xs"
                      : "bg-white border border-neutral-border-light hover:bg-neutral-surface"
                  }`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <AppText
                    weight={isSelected ? "black" : "semibold"}
                    className={`text-xs ${
                      isSelected ? "text-white" : "text-neutral-dark"
                    }`}
                  >
                    {cat}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Recipe Cards List */}
        <View className="px-4 pt-1">
          {filteredRecipes.length === 0 ? (
            <View className="py-10 px-6 items-center justify-center bg-white rounded-2xl border border-neutral-border-light my-4">
              <View className="w-12 h-12 rounded-full bg-secondary-soft items-center justify-center mb-3 border border-secondary">
                <AppText weight="bold" className="text-2xl">
                  🍲
                </AppText>
              </View>
              <AppText weight="extrabold" className="text-base text-neutral-dark mb-1 text-center">
                No recipes found
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted text-center max-w-xs mb-4 leading-relaxed">
                {searchQuery
                  ? `No recipes matching "${searchQuery}".`
                  : `No recipes found in category "${selectedCategory}".`}
              </AppText>
              <TouchableOpacity
                onPress={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                }}
                className="px-4 py-2 rounded-full bg-primary active:opacity-90"
              >
                <AppText weight="bold" className="text-xs text-white">
                  Show All Recipes
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-y-3.5">
              {filteredRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  title={recipe.title}
                  category={recipe.category}
                  calories={recipe.calories}
                  prepTimeMinutes={recipe.prepTimeMinutes}
                  difficulty={recipe.difficulty}
                  svgName={recipe.svgIcon}
                  onPress={() => router.push(`/(app)/recipe-detail?id=${recipe.id}`)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
