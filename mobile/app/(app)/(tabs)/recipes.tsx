import React, { useState, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, RecipeCard } from "@/components/ui";
import { useRecipes } from "@/hooks/useRecipesQuery";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { Entitlement } from "@/lib/subscriptionDomain";
import { IconRenderer, CloseIconSvg } from "@/constants/Assets";

const CATEGORIES = ["Semua", "Breakfast", "Lunch", "Dinner", "Snack", "Drink"] as const;

export default function RecipesScreen() {
  const router = useRouter();
  const { data: recipes = [] } = useRecipes();
  const hasEntitlement = useSubscriptionStore((state) => state.hasEntitlement);
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredRecipes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return recipes.filter((r) => {
      const matchCat =
        selectedCategory === "Semua" || r.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [recipes, selectedCategory, searchQuery]);

  return (
    <ScreenWrapper maxWidth="full" noPadding className="flex-1 bg-[#fafaf9]">
      {/* Header */}
      <View
        className="w-full border-b border-[#eaeaea] px-4 sm:px-6 lg:px-8 pt-4 pb-4 z-20"
        style={
          Platform.OS === "web"
            ? ({
                backgroundColor: "rgba(255, 255, 255, 0.92)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                position: "sticky",
                top: 0,
              } as any)
            : { backgroundColor: "#ffffff" }
        }
      >
        <View className="max-w-[1280px] mx-auto w-full">
          <View className="flex-row items-center justify-between">
            <View>
              <AppText weight="bold" className="text-xl sm:text-2xl text-[#18181b] tracking-tight">
                Resep Sehat Terkurasi
              </AppText>
              <AppText weight="medium" className="text-xs text-[#71717a] mt-0.5 leading-relaxed">
                Ide kuliner bergizi dan seimbang kalori untuk menemani perjalanan hidup sehat Anda.
              </AppText>
            </View>
            <View className="hidden sm:flex px-3 py-1 rounded-full bg-[#f4f4f5] border border-[#e4e4e7]">
              <AppText weight="bold" className="text-xs text-[#52525b]">
                {recipes.length} Resep Teruji
              </AppText>
            </View>
          </View>

          {/* Search Input */}
          <View className="flex-row items-center bg-white border border-[#eaeaea] rounded-xl px-4 py-1.5 min-h-[44px] mt-3.5">
            <View className="mr-2.5">
              <IconRenderer name="Search" size={15} color="#71717a" />
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cari resep sehat (misal: Salad, Sup, Salmon, Ayam, Oatmeal)..."
              placeholderTextColor="#a1a1aa"
              className="flex-1 text-sm text-[#18181b] font-medium"
              style={{
                fontFamily: "Akatab-Medium",
                includeFontPadding: false,
                ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
              }}
              accessibilityLabel="Cari resep"
              returnKeyType="search"
            />
            {Boolean(searchQuery) && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="w-5 h-5 rounded-full bg-[#f4f4f5] items-center justify-center ml-1"
                accessibilityRole="button"
                accessibilityLabel="Hapus pencarian resep"
              >
                <CloseIconSvg size={10} color="#71717a" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-[#fafaf9]"
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 56 : 112 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Horizontal Filter Chips */}
        <View className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-2">
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
                  className={`min-h-[34px] px-3.5 py-1.5 rounded-lg flex-row items-center justify-center ${
                    isSelected
                      ? "bg-[#18181b] border border-[#18181b]"
                      : "bg-white border border-[#eaeaea]"
                  }`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Filter ${cat}`}
                >
                  <AppText
                    weight={isSelected ? "bold" : "medium"}
                    className={`text-xs ${
                      isSelected ? "text-white" : "text-[#52525b]"
                    }`}
                  >
                    {cat}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Recipe Cards Responsive Grid */}
        <View className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-2">
          {filteredRecipes.length === 0 ? (
            <View className="w-full py-12 px-6 items-center justify-center bg-white rounded-2xl border border-[#eaeaea] my-4">
              <View className="w-12 h-12 rounded-xl bg-[#f4f4f5] border border-[#e4e4e7] items-center justify-center mb-3">
                <IconRenderer name="Cook" size={24} color="#71717a" />
              </View>
              <AppText weight="bold" className="text-base text-[#18181b] mb-1 text-center">
                Resep tidak ditemukan
              </AppText>
              <AppText weight="medium" className="text-xs text-[#71717a] text-center max-w-xs mb-4 leading-relaxed">
                {searchQuery
                  ? `Tidak ada resep yang cocok dengan "${searchQuery}". Coba kata kunci lain atau reset filter.`
                  : `Belum ada resep dalam kategori "${selectedCategory}". Pilih kategori lain.`}
              </AppText>
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setSelectedCategory("Semua");
                }}
                className="px-5 py-2.5 rounded-lg bg-[#18181b] min-h-[40px] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Tampilkan semua resep"
              >
                <AppText weight="bold" className="text-xs text-white">
                  Lihat Semua Resep
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-row flex-wrap -mx-2">
              {filteredRecipes.map((recipe) => {
                const isPremiumRecipe = Boolean((recipe as any).isPremium);
                const isLocked = isPremiumRecipe && !hasEntitlement(Entitlement.PREMIUM_RECIPES);

                const handlePress = () => {
                  if (isLocked) {
                    Alert.alert(
                      "Koleksi Chef Premium",
                      `"${recipe.title}" adalah resep eksklusif terkalibrasi nutrisi klinis dengan panduan memasak presisi.\n\nUpgrade ke Better Life Premium untuk membuka semua koleksi chef.`,
                      [
                        { text: "Nanti", style: "cancel" },
                        {
                          text: "Upgrade Paket",
                          onPress: () => router.push("/(app)/upgrade"),
                        },
                      ]
                    );
                    return;
                  }

                  router.push({
                    pathname: "/(app)/recipe-detail",
                    params: { id: recipe.id },
                  });
                };

                return (
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
                      isPremium={isPremiumRecipe}
                      isLocked={isLocked}
                      onPress={handlePress}
                    />
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
