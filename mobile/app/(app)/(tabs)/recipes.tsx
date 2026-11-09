import React, { useState, useMemo } from "react";
import { View, ScrollView, Image, Platform, Alert, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AppText,
  RecipeCard,
  FadeInView,
  FilterChip,
  SearchField,
  PageHead,
  Surface,
  PillButton,
  LineIcon,
  PressableScale,
  CreateRecipeModal,
  RingButton,
} from "@/components/ui";
import { useRecipes } from "@/hooks/useRecipesQuery";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { useCustomRecipesStore } from "@/stores/useCustomRecipesStore";
import { Entitlement } from "@/lib/subscriptionDomain";
import { NAV_DESKTOP_BREAKPOINT } from "@/components/layout/ResponsiveTabBar";
import { mealLabel } from "@/constants/MealLabels";
import { MealIllustrations } from "@/constants/Assets";
import { horizontalScrollTouchProps } from "@/lib/tabSwipeGuard";
import { FoodItem } from "@/data/mockRecipes";
import { confirmDestructive } from "@/lib/confirm";

const ILLUSTRATED_CATEGORIES = [
  { id: "Breakfast", label: "Sarapan", image: MealIllustrations.Breakfast },
  { id: "Lunch", label: "Makan Siang", image: MealIllustrations.Lunch },
  { id: "Dinner", label: "Makan Malam", image: MealIllustrations.Dinner },
  { id: "Snack", label: "Camilan", image: MealIllustrations.Snacks },
  { id: "Drink", label: "Minuman", image: MealIllustrations.Drinks },
] as const;

export default function RecipesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const hasDesktopNav = width >= NAV_DESKTOP_BREAKPOINT;
  const isMobileStack = width < 640;

  const { data: recipes = [], isLoading, isError, refetch } = useRecipes();
  const removeCustomRecipe = useCustomRecipesStore((state) => state.removeCustomRecipe);
  const hasEntitlement = useSubscriptionStore((state) => state.hasEntitlement);

  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  const filteredRecipes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return recipes.filter((r) => {
      const matchCat =
        selectedCategory === "Semua" || r.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        mealLabel(r.category).toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.ingredients?.some((ing) => ing.name.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [recipes, selectedCategory, searchQuery]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("Semua");
  };

  const handleDeleteCustomRecipe = (recipe: FoodItem) => {
    confirmDestructive(
      "Hapus Resep Saya",
      `Hapus resep "${recipe.title}" dari koleksi Anda?`,
      "Hapus",
      () => {
        removeCustomRecipe(recipe.id);
      }
    );
  };

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-canvas">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: hasDesktopNav ? 8 : 16, paddingBottom: hasDesktopNav ? 56 : 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FadeInView index={0}>
          <PageHead
            title="Resep"
            right={
              <PressableScale
                onPress={() => setIsCreateModalVisible(true)}
                pressedScale={0.93}
                className="w-10 h-10 rounded-full bg-primary items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Tambah resep"
              >
                <LineIcon name="plus" size={18} color="#ffffff" strokeWidth={2.3} />
              </PressableScale>
            }
          />
        </FadeInView>

        <FadeInView index={1}>
          <SearchField
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari resep, misal salad, sup, atau salmon"
            accessibilityLabel="Cari resep sehat"
          />
        </FadeInView>

        <FadeInView index={2} className="mt-3.5">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingRight: 16 }}
            {...horizontalScrollTouchProps}
          >
            {ILLUSTRATED_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <PressableScale
                  key={cat.id}
                  onPress={() => setSelectedCategory(isSelected ? "Semua" : cat.id)}
                  pressedScale={0.97}
                  className={`w-[114px] rounded-[18px] overflow-hidden border ${
                    isSelected ? "bg-block-ink border-block-ink" : "bg-card border-line"
                  }`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Filter resep ${cat.label}`}
                >
                  <View className="w-full h-[64px] bg-card-2 overflow-hidden">
                    <Image
                      source={cat.image}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  </View>
                  <View className="px-2.5 py-2 items-center">
                    <AppText
                      weight="semibold"
                      numberOfLines={1}
                      className={`text-[12.5px] ${isSelected ? "text-white" : "text-ink"}`}
                    >
                      {cat.label}
                    </AppText>
                  </View>
                </PressableScale>
              );
            })}
          </ScrollView>

          {selectedCategory !== "Semua" && (
            <View className="flex-row items-center justify-between mt-3 px-0.5">
              <AppText weight="semibold" className="text-[13px] text-muted">
                Menampilkan kategori:{" "}
                <AppText weight="bold" className="text-ink">
                  {mealLabel(selectedCategory)}
                </AppText>
              </AppText>
              <FilterChip
                label="Tampilkan semua"
                selected={false}
                onPress={() => setSelectedCategory("Semua")}
              />
            </View>
          )}
        </FadeInView>

        <View className="mt-5">
          {isLoading ? (
            <Surface className="items-center py-10">
              <AppText weight="medium" className="text-sm text-muted">
                Memuat koleksi resep...
              </AppText>
            </Surface>
          ) : isError ? (
            <Surface className="items-center py-10">
              <AppText weight="semibold" className="text-base text-ink">
                Resep belum bisa dimuat
              </AppText>
              <AppText weight="medium" className="text-[13px] text-muted mt-1 mb-4 text-center">
                Periksa koneksi Anda, lalu coba muat ulang.
              </AppText>
              <PillButton label="Muat ulang" variant="primary" icon="refresh" onPress={() => refetch()} />
            </Surface>
          ) : filteredRecipes.length === 0 ? (
            <Surface className="items-center py-10 px-6">
              <View className="w-12 h-12 rounded-full bg-primary-light items-center justify-center mb-3">
                <LineIcon name="book" size={20} color="#0e7a52" />
              </View>
              <AppText weight="semibold" className="text-base text-ink text-center">
                Resep tidak ditemukan
              </AppText>
              <AppText weight="medium" className="text-[13px] text-muted text-center max-w-xs mt-1 mb-4">
                {searchQuery
                  ? `Tidak ada resep untuk "${searchQuery}". Coba kata kunci lain atau buat resep baru.`
                  : `Belum ada resep pada kategori "${mealLabel(selectedCategory)}".`}
              </AppText>
              <View className="flex-row items-center gap-2">
                <PillButton label="Tampilkan semua" size="sm" onPress={resetFilters} />
                <PillButton
                  label="Tambah resep"
                  size="sm"
                  variant="primary"
                  icon="plus"
                  onPress={() => setIsCreateModalVisible(true)}
                />
              </View>
            </Surface>
          ) : (
            <View className={isMobileStack ? "gap-3.5" : "flex-row flex-wrap -mx-2"}>
              {filteredRecipes.map((recipe, i) => {
                const isCustom = recipe.id.startsWith("custom-recipe-");
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
                    className={isMobileStack ? "w-full relative" : "w-1/2 md:w-1/3 lg:w-1/4 px-2 mb-4 relative"}
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
                    {isCustom && (
                      <View className="absolute top-3 left-4 flex-row items-center gap-1.5">
                        <View className="px-2.5 py-1 rounded-full bg-primary">
                          <AppText weight="bold" className="text-[10.5px] text-white">
                            Resep Saya
                          </AppText>
                        </View>
                        <RingButton
                          icon="trash"
                          size="sm"
                          variant="solid"
                          accessibilityLabel={`Hapus ${recipe.title}`}
                          onPress={() => handleDeleteCustomRecipe(recipe as FoodItem)}
                        />
                      </View>
                    )}
                  </FadeInView>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <CreateRecipeModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onRecipeCreated={(newRecipe) => {
          router.push({ pathname: "/(app)/recipe-detail", params: { id: newRecipe.id } });
        }}
      />
    </ScreenWrapper>
  );
}
