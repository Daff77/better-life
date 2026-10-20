import React, { useState, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Pressable,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, RecipeCard } from "@/components/ui";
import { useRecipes } from "@/hooks/useRecipesQuery";
import { IconRenderer } from "@/constants/Assets";

const CATEGORIES = ["All", "Breakfast", "Lunch", "Dinner", "Snack", "Drink"] as const;

export default function RecipesScreen() {
  const router = useRouter();
  const { data: recipes = [] } = useRecipes();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("" );

  const filteredRecipes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return recipes.filter((r) => {
      const matchCat =
        selectedCategory === "All" || r.category === selectedCategory;
      const matchSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [recipes, selectedCategory, searchQuery]);

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#f8faf8]">
      {/* Header */}
      <View className="px-4 sm:px-6 pt-4 pb-3.5 bg-white border-b border-[#e5ece7] shadow-2xs">
        <View className="max-w-[1240px] mx-auto w-full">
          <AppText weight="black" className="text-xl sm:text-2xl text-neutral-dark tracking-tight">
            Curated Healthy Recipes
          </AppText>
          <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5 leading-4">
            Nutritious, budget-friendly meal ideas calibrated to your caloric goals
          </AppText>

          {/* Recipe Search Input */}
          <View className="flex-row items-center bg-[#f2f8f4] border border-[#e5ece7] rounded-xl px-3 py-1.5 min-h-[44px] mt-3">
            <View className="mr-2">
              <IconRenderer name="Search" size={16} color="#9ca3af" />
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search recipes (e.g. Salad, Soup, Chicken, Curry)..."
              placeholderTextColor="#9ca3af"
              className="flex-1 text-sm text-neutral-dark"
              style={{
                fontFamily: "Akatab-Medium",
                includeFontPadding: false,
                ...(Platform.OS === "web"
                  ? ({ outlineStyle: "none", boxShadow: "none" } as any)
                  : {}),
              }}
              accessibilityLabel="Search recipes"
              returnKeyType="search"
            />
            {Boolean(searchQuery) && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="w-6 h-6 rounded-full bg-neutral-200 items-center justify-center ml-1"
                accessibilityRole="button"
                accessibilityLabel="Clear recipe search text"
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
        {/* Category Horizontal Filter Chips (44px Minimum Touch Targets) */}
        <View className="max-w-[1240px] mx-auto w-full pt-3 pb-2">
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
                  className={`min-h-[44px] px-4 sm:px-5 py-2 rounded-full mr-2 flex-row items-center justify-center transition-all duration-150 active:scale-[0.96] ${
                    isSelected
                      ? "bg-primary shadow-xs"
                      : "bg-white border border-[#e5ece7] active:bg-[#f2f8f4]"
                  } ${Platform.OS === "web" ? "cursor-pointer" : ""}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Filter by ${cat}`}
                >
                  <AppText
                    weight={isSelected ? "black" : "semibold"}
                    className={`text-xs sm:text-[13px] ${
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

        {/* Recipe Cards Grid */}
        <View className="max-w-[1240px] mx-auto w-full px-4 sm:px-5 pt-1">
          {filteredRecipes.length === 0 ? (
            <View className="w-full py-10 px-6 items-center justify-center bg-white rounded-2xl border border-neutral-border-light my-4">
              <View className="w-14 h-14 rounded-2xl bg-secondary-soft items-center justify-center mb-3 border border-secondary shadow-2xs">
                <AppText weight="bold" className="text-2xl">
                  🍲
                </AppText>
              </View>
              <AppText weight="black" className="text-base text-neutral-dark mb-1 text-center">
                No matching recipes found
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted text-center max-w-xs mb-4 leading-relaxed">
                {searchQuery
                  ? `No recipes found for "${searchQuery}". Try a different keyword or category.`
                  : `We couldn't find any dishes in "${selectedCategory}". Browse all recipes or pick another category.`}
              </AppText>
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
                className="px-5 py-2.5 rounded-full bg-primary active:bg-primary-dark transition-colors min-h-[44px] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Show all recipes"
              >
                <AppText weight="bold" className="text-xs text-white">
                  Show All Recipes
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-row flex-wrap -mx-2">
              {filteredRecipes.map((recipe) => (
                <View
                  key={recipe.id}
                  className="w-full sm:w-1/2 lg:w-1/3 px-2 mb-4"
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
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
