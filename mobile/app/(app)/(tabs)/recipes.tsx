import React, { useState, useMemo } from "react";
import { View, ScrollView, Platform, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AppText,
  RecipeCard,
  PressableScale,
  FadeInView,
  FilterChip,
  SearchField,
} from "@/components/ui";
import { useRecipes } from "@/hooks/useRecipesQuery";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { Entitlement } from "@/lib/subscriptionDomain";
import { IconRenderer } from "@/constants/Assets";
import { mealLabel } from "@/constants/MealLabels";

const CATEGORIES = ["Semua", "Breakfast", "Lunch", "Dinner", "Snack", "Drink"] as const;

export default function RecipesScreen() {
  const router = useRouter();
  const { data: recipes = [], isLoading, isError, refetch } = useRecipes();
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
        mealLabel(r.category).toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [recipes, selectedCategory, searchQuery]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("Semua");
  };

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#faf9f5]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: Platform.OS === "web" ? 64 : 110 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FadeInView index={0} className="flex-row items-end justify-between mb-4">
          <View className="flex-1 min-w-0 mr-3">
            <AppText weight="black" className="text-[26px] text-neutral-dark" style={{ letterSpacing: -0.6 }}>
              Resep sehat
            </AppText>
            <AppText weight="medium" className="text-[13px] text-neutral-muted mt-0.5">
              Takaran bahan jelas dan kalori terhitung per porsi
            </AppText>
          </View>
          {!isLoading && (
            <AppText weight="bold" className="text-xs text-primary" style={{ fontVariant: ["tabular-nums"] }}>
              {recipes.length} resep
            </AppText>
          )}
        </FadeInView>

        <FadeInView index={1}>
          <SearchField
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari resep, misal salad, sup, atau salmon"
            accessibilityLabel="Cari resep sehat"
          />
        </FadeInView>

        <FadeInView index={2} className="mt-3 -mx-4 sm:mx-0">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16, alignItems: "center" }}
          >
            {CATEGORIES.map((cat) => (
              <FilterChip
                key={cat}
                label={mealLabel(cat)}
                selected={selectedCategory === cat}
                onPress={() => setSelectedCategory(cat)}
              />
            ))}
          </ScrollView>
        </FadeInView>

        <View className="mt-5">
          {isLoading ? (
            <AppText weight="medium" className="text-sm text-neutral-muted py-10 text-center">
              Memuat koleksi resep...
            </AppText>
          ) : isError ? (
            <View className="items-center py-10">
              <AppText weight="bold" className="text-base text-neutral-dark">
                Resep belum bisa dimuat
              </AppText>
              <AppText weight="medium" className="text-[13px] text-neutral-muted mt-1 mb-4 text-center">
                Periksa koneksi Anda, lalu coba muat ulang.
              </AppText>
              <PressableScale onPress={() => refetch()} className="h-11 px-5 rounded-full bg-primary justify-center">
                <AppText weight="bold" className="text-sm text-white">
                  Muat ulang
                </AppText>
              </PressableScale>
            </View>
          ) : filteredRecipes.length === 0 ? (
            <View className="items-center py-10 px-6">
              <View className="w-12 h-12 rounded-2xl bg-primary-light items-center justify-center mb-3">
                <IconRenderer name="Cook" size={22} color="#153e28" />
              </View>
              <AppText weight="bold" className="text-base text-neutral-dark text-center">
                Resep tidak ditemukan
              </AppText>
              <AppText weight="medium" className="text-[13px] text-neutral-muted text-center max-w-xs mt-1 mb-4">
                {searchQuery
                  ? `Tidak ada resep untuk "${searchQuery}". Coba kata kunci lain atau hapus filter.`
                  : `Belum ada resep pada kategori "${mealLabel(selectedCategory)}".`}
              </AppText>
              <PressableScale
                onPress={resetFilters}
                className="h-11 px-5 rounded-full border border-[#dfe6e0] justify-center"
              >
                <AppText weight="bold" className="text-sm text-primary">
                  Tampilkan semua resep
                </AppText>
              </PressableScale>
            </View>
          ) : (
            <View className="flex-row flex-wrap -mx-2">
              {filteredRecipes.map((recipe, i) => {
                const isPremiumRecipe = Boolean((recipe as any).isPremium);
                const isLocked = isPremiumRecipe && !hasEntitlement(Entitlement.PREMIUM_RECIPES);

                const handlePress = () => {
                  if (isLocked) {
                    if (Platform.OS === "web") {
                      router.push("/(app)/upgrade");
                      return;
                    }
                    Alert.alert(
                      "Koleksi Resep Premium",
                      `"${recipe.title}" termasuk koleksi resep terkalibrasi nutrisi dengan takaran lengkap.\n\nAktifkan Better Life Premium untuk membuka semua resep.`,
                      [
                        { text: "Nanti", style: "cancel" },
                        { text: "Lihat Paket", onPress: () => router.push("/(app)/upgrade") },
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
                  <FadeInView
                    key={recipe.id}
                    index={Math.min(i, 8)}
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
                  </FadeInView>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
