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
import { IconRenderer, CloseIconSvg } from "@/constants/Assets";

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
    <ScreenWrapper maxWidth="full" noPadding className="flex-1 bg-[#faf9f5]">
      {/* Header: Edge-to-edge with seamless top integration */}
      <View className="w-full bg-[#faf9f5] border-b border-[#eae8e1] px-4 sm:px-6 lg:px-8 pt-3 pb-3.5">
        <View className="max-w-[1280px] mx-auto w-full">
          <AppText weight="bold" className="text-xl sm:text-2xl text-neutral-dark tracking-tight">
            Curated Healthy Recipes
          </AppText>
          <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5 leading-relaxed">
            Nutritious, calorie-calibrated culinary ideas to support your health journey.
          </AppText>

          {/* Recipe Search Input */}
          <View className="flex-row items-center bg-[#f4f3ed] border border-[#eae8e1] rounded-xl px-3.5 py-1 min-h-[44px] mt-3 transition-colors focus:border-primary">
            <View className="mr-2.5">
              <IconRenderer name="Search" size={16} color="#788079" />
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search recipes (e.g. Salad, Soup, Chicken, Toast, Smoothie)..."
              placeholderTextColor="#8a928b"
              className="flex-1 text-sm text-neutral-dark font-medium"
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
                className="w-6 h-6 rounded-full bg-[#e2e0d8] items-center justify-center ml-1"
                accessibilityRole="button"
                accessibilityLabel="Clear recipe search text"
              >
                <CloseIconSvg size={12} color="#5a625b" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-[#faf9f5]"
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 56 : 112 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Horizontal Filter Chips */}
        <View className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-3 pb-2">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, alignItems: "center" }}
            className="flex-row"
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  className={`min-h-[38px] px-4 py-1.5 rounded-full flex-row items-center justify-center transition-all duration-150 active:scale-[0.97] ${
                    isSelected
                      ? "bg-primary shadow-xs"
                      : "bg-white border border-[#eae8e1] active:bg-[#f2f1eb]"
                  } ${Platform.OS === "web" ? "cursor-pointer hover:border-[#dcdfd9]" : ""}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Filter by ${cat}`}
                >
                  <AppText
                    weight={isSelected ? "bold" : "medium"}
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

        {/* Recipe Cards Responsive 4-Column Grid */}
        <View className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-2">
          {filteredRecipes.length === 0 ? (
            <View className="w-full py-10 px-6 items-center justify-center bg-white rounded-2xl border border-[#eae8e1] my-4">
              <View className="w-12 h-12 rounded-xl bg-secondary-soft items-center justify-center mb-3">
                <IconRenderer name="Cook" size={24} color="#153e28" />
              </View>
              <AppText weight="bold" className="text-base text-neutral-dark mb-1 text-center">
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
                className="px-5 py-2.5 rounded-xl bg-primary active:bg-primary-dark transition-colors min-h-[40px] items-center justify-center"
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
                  className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 px-2 mb-4"
                >
                  <RecipeCard
                    title={recipe.title}
                    category={recipe.category}
                    calories={recipe.calories}
                    prepTimeMinutes={recipe.prepTimeMinutes}
                    difficulty={recipe.difficulty}
                    imageUrl={recipe.imageUrl}
                    svgName={recipe.svgIcon}
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/recipe-detail",
                        params: { id: recipe.id },
                      })
                    }
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
