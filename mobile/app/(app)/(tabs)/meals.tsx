import React, { useState, useMemo } from "react";
import { View, ScrollView, Image, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AppText,
  MealCard,
  MealLogModal,
  CreateRecipeModal,
  FadeInView,
  FilterChip,
  SearchField,
  PageHead,
  Surface,
  ListRow,
  RowIcon,
  StatusPill,
  PillButton,
  LineIcon,
  PressableScale,
  SkeletonPulse,
} from "@/components/ui";
import { useRecipes } from "@/hooks/useRecipesQuery";
import {
  useJournalStore,
  getTodayDateKey,
  computeJournalAggregates,
} from "@/stores/useJournalStore";
import { useFavoritesStore, favoriteToFoodItem } from "@/stores/useFavoritesStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { NAV_DESKTOP_BREAKPOINT } from "@/components/layout/ResponsiveTabBar";
import { mealLabel } from "@/constants/MealLabels";
import { MealIllustrations, getMealIllustration } from "@/constants/Assets";
import { FoodItem } from "@/data/mockRecipes";
import { INGREDIENTS_DATABASE, calculateIngredientNutrition } from "@/data/ingredientsDatabase";
import { horizontalScrollTouchProps } from "@/lib/tabSwipeGuard";

const ILLUSTRATED_SLOTS = [
  { id: "Breakfast", label: "Sarapan", subtitle: "Menu pagi", image: MealIllustrations.Breakfast },
  { id: "Lunch", label: "Makan Siang", subtitle: "Menu utama", image: MealIllustrations.Lunch },
  { id: "Dinner", label: "Makan Malam", subtitle: "Menu hangat", image: MealIllustrations.Dinner },
  { id: "Snack", label: "Camilan", subtitle: "Kudapan sehat", image: MealIllustrations.Snacks },
  { id: "Drink", label: "Minuman", subtitle: "Segar & hidrasi", image: MealIllustrations.Drinks },
] as const;

const BUDGETS = [
  { id: "all", label: "Semua harga", max: Infinity },
  { id: "20", label: "≤ Rp 20rb", max: 20000 },
  { id: "35", label: "≤ Rp 35rb", max: 35000 },
] as const;

const tnum = { fontVariant: ["tabular-nums" as const] };

export default function MealsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const hasDesktopNav = width >= NAV_DESKTOP_BREAKPOINT;
  const useRowCards = width < 640;
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const { data: recipes = [], isLoading, isError, refetch } = useRecipes();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string>("Semua");
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false);
  const [budgetId, setBudgetId] = useState<string>("all");
  const [quickNotice, setQuickNotice] = useState<string | null>(null);

  const [selectedMealForLog, setSelectedMealForLog] = useState<FoodItem | null>(null);
  const [isLogModalVisible, setIsLogModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  const todayDate = getTodayDateKey();
  const journals = useJournalStore((state) => state.journals);
  const getRecentLoggedMeals = useJournalStore((state) => state.getRecentLoggedMeals);
  const addJournalEntry = useJournalStore((state) => state.addEntry);
  const todayJournal = journals[todayDate];
  const aggregates = useMemo(() => computeJournalAggregates(todayJournal), [todayJournal]);
  const target = aggregates.targetCalories || 2253;

  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const favoriteIdSet = useMemo(() => new Set(favorites.map((f) => f.itemId)), [favorites]);

  const recentLoggedMeals = useMemo(() => getRecentLoggedMeals(6), [journals, getRecentLoggedMeals]);

  const ingredientAsMeals = useMemo<FoodItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return INGREDIENTS_DATABASE.filter(
      (ing) => ing.name.toLowerCase().includes(q) || ing.category.toLowerCase().includes(q)
    )
      .slice(0, 12)
      .map((ing) => {
        const calc = calculateIngredientNutrition(ing, ing.defaultServingGrams);
        return {
          id: `ing-meal-${ing.id}`,
          title: `${ing.name} (${ing.defaultServingGrams}g)`,
          category: ing.category === "Minuman" ? "Drink" : ing.category === "Buah" ? "Snack" : "Lunch",
          calories: calc.calories,
          prepTimeMinutes: 5,
          difficulty: "Easy",
          description: `${ing.servingLabel} · P ${calc.proteinGrams}g · K ${calc.carbsGrams}g · L ${calc.fatGrams}g`,
          svgIcon: ing.category === "Minuman" ? "Drinks" : ing.category === "Buah" ? "Snacks" : "Lunch",
          estimatedCostIdr: calc.estimatedCostIdr,
          nutrition: {
            proteinGrams: Math.round(calc.proteinGrams),
            carbsGrams: Math.round(calc.carbsGrams),
            fatGrams: Math.round(calc.fatGrams),
            fiberGrams: Math.round(calc.fiberGrams),
          },
          ingredients: [{ name: ing.name, amount: `${ing.defaultServingGrams} g` }],
          instructions: [{ step: 1, text: "Siapkan bahan sesuai takaran saji." }],
        };
      });
  }, [searchQuery]);

  const filteredMeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const budget = BUDGETS.find((b) => b.id === budgetId) ?? BUDGETS[0];

    // Include custom favorited items not present in base catalog when favorites filter is active
    const catalogIds = new Set(recipes.map((r) => r.id));
    const extraFavorites = favorites
      .filter((f) => !catalogIds.has(f.itemId))
      .map((f) => favoriteToFoodItem(f));
    const combinedCatalog = [...extraFavorites, ...recipes];

    const baseMatches = combinedCatalog.filter((m) => {
      if (favoritesOnly && !favoriteIdSet.has(m.id)) return false;
      const matchSearch =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        mealLabel(m.category).toLowerCase().includes(q);
      const matchSlot = selectedSlot === "Semua" || m.category.toLowerCase() === selectedSlot.toLowerCase();
      const cost = m.estimatedCostIdr ?? 0;
      const matchBudget = budget.max === Infinity || cost === 0 || cost <= budget.max;
      return matchSearch && matchSlot && matchBudget;
    });

    const filteredIngredients = favoritesOnly
      ? ingredientAsMeals.filter((m) => favoriteIdSet.has(m.id))
      : ingredientAsMeals;

    return [...baseMatches, ...filteredIngredients];
  }, [recipes, favorites, favoriteIdSet, favoritesOnly, searchQuery, selectedSlot, budgetId, ingredientAsMeals]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedSlot("Semua");
    setFavoritesOnly(false);
    setBudgetId("all");
  };

  const handleOpenLogModal = (meal: FoodItem) => {
    setSelectedMealForLog(meal);
    setIsLogModalVisible(true);
  };

  const handleQuickRelog = async (recent: (typeof recentLoggedMeals)[number]) => {
    const entry = await addJournalEntry({
      mealId: recent.mealId,
      title: recent.title,
      category: recent.category,
      calories: recent.calories,
      baseCalories: recent.baseCalories,
      quantity: recent.quantity || 1,
      proteinGrams: recent.proteinGrams,
      carbsGrams: recent.carbsGrams,
      fatGrams: recent.fatGrams,
      fiberGrams: recent.fiberGrams,
      estimatedCostIdr: recent.estimatedCostIdr ?? 0,
    });
    setQuickNotice(`${entry.title} (+${entry.calories} kcal) dicatat ulang ke jurnal hari ini.`);
    setTimeout(() => setQuickNotice(null), 3500);
  };

  const renderList = () => {
    if (isLoading) {
      if (useRowCards) {
        return (
          <View className="gap-2.5">
            {[0, 1, 2, 3].map((idx) => (
              <Surface key={idx} dense className="flex-row items-center gap-3 p-3">
                <SkeletonPulse width={64} height={64} borderRadius={13} />
                <View className="flex-1 gap-2">
                  <SkeletonPulse width="38%" height={11} borderRadius={6} />
                  <SkeletonPulse width="76%" height={15} borderRadius={7} />
                  <SkeletonPulse width="48%" height={12} borderRadius={6} />
                </View>
              </Surface>
            ))}
          </View>
        );
      }
      return (
        <View className="flex-row flex-wrap -mx-2">
          {[0, 1, 2, 3].map((idx) => (
            <View key={idx} className="mb-4 px-2 w-1/2 md:w-1/3 lg:w-1/4">
              <Surface noPadding className="overflow-hidden">
                <SkeletonPulse height={104} borderRadius={0} />
                <View className="p-3 gap-2">
                  <SkeletonPulse width="45%" height={11} borderRadius={6} />
                  <SkeletonPulse width="80%" height={15} borderRadius={7} />
                  <SkeletonPulse width="55%" height={12} borderRadius={6} />
                </View>
              </Surface>
            </View>
          ))}
        </View>
      );
    }
    if (isError) {
      return (
        <Surface className="items-center py-10">
          <AppText weight="semibold" className="text-base text-ink">
            Menu belum bisa dimuat
          </AppText>
          <AppText weight="medium" className="text-[13px] text-muted mt-1 mb-4 text-center">
            Periksa koneksi, lalu muat ulang.
          </AppText>
          <PillButton label="Muat ulang" variant="primary" icon="refresh" onPress={() => refetch()} />
        </Surface>
      );
    }
    if (filteredMeals.length === 0) {
      return (
        <Surface className="items-center py-10 px-6">
          <View className="w-12 h-12 rounded-full bg-primary-light items-center justify-center mb-3">
            <LineIcon name={favoritesOnly ? "heart" : "utensils"} size={20} color="#0e7a52" />
          </View>
          <AppText weight="semibold" className="text-base text-ink text-center">
            {favoritesOnly ? "Belum ada menu favorit yang cocok" : "Tidak ada menu yang cocok"}
          </AppText>
          <AppText weight="medium" className="text-[13px] text-muted text-center mt-1 mb-4 max-w-xs">
            {favoritesOnly
              ? "Ketuk ikon hati pada kartu menu atau halaman detail resep untuk menyimpannya sebagai favorit."
              : searchQuery
              ? `Belum ada menu untuk "${searchQuery}". Coba kata lain atau hapus filter.`
              : "Kombinasi waktu makan dan harga ini belum punya menu."}
          </AppText>
          <PillButton label="Hapus semua filter" size="sm" onPress={resetFilters} />
        </Surface>
      );
    }
    if (useRowCards) {
      return (
        <View className="gap-2.5">
          {filteredMeals.map((meal, i) => (
            <FadeInView key={meal.id} index={Math.min(i, 8)}>
              <MealCard
                layout="row"
                title={meal.title}
                mealType={meal.category}
                calories={meal.calories}
                description={meal.description}
                prepTimeMinutes={meal.prepTimeMinutes}
                estimatedCostIdr={meal.estimatedCostIdr}
                imageUrl={meal.imageUrl}
                isFavorite={favoriteIdSet.has(meal.id)}
                onToggleFavorite={() => void toggleFavorite(meal)}
                showLogButton
                onLogMeal={() => handleOpenLogModal(meal)}
                onPress={() => router.push({ pathname: "/(app)/recipe-detail", params: { id: meal.id } })}
              />
            </FadeInView>
          ))}
        </View>
      );
    }
    return (
      <View className="flex-row flex-wrap -mx-2">
        {filteredMeals.map((meal, i) => (
          <FadeInView
            key={meal.id}
            index={Math.min(i, 8)}
            className="mb-4 px-2 w-1/2 md:w-1/3 lg:w-1/4"
          >
            <MealCard
              layout="stack"
              title={meal.title}
              mealType={meal.category}
              calories={meal.calories}
              description={meal.description}
              prepTimeMinutes={meal.prepTimeMinutes}
              estimatedCostIdr={meal.estimatedCostIdr}
              imageUrl={meal.imageUrl}
              isFavorite={favoriteIdSet.has(meal.id)}
              onToggleFavorite={() => void toggleFavorite(meal)}
              showLogButton
              onLogMeal={() => handleOpenLogModal(meal)}
              onPress={() => router.push({ pathname: "/(app)/recipe-detail", params: { id: meal.id } })}
            />
          </FadeInView>
        ))}
      </View>
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
            title="Catat makan"
            right={
              <View className="flex-row items-center gap-2">
                <StatusPill
                  label={
                    aggregates.remainingCalories < 0
                      ? `Lewat ${Math.abs(aggregates.remainingCalories).toLocaleString("id-ID")} kcal`
                      : `${Math.max(0, target - aggregates.totalConsumed).toLocaleString("id-ID")} kcal`
                  }
                  tone={aggregates.remainingCalories < 0 ? "warn" : "accent"}
                />
                <PressableScale
                  onPress={() => setIsCreateModalVisible(true)}
                  pressedScale={0.93}
                  className="w-10 h-10 rounded-full bg-primary items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Tambah resep"
                >
                  <LineIcon name="plus" size={18} color="#ffffff" strokeWidth={2.3} />
                </PressableScale>
              </View>
            }
          />
        </FadeInView>

        {quickNotice && (
          <Surface className="mb-3 py-3 px-4 bg-[#e2f2ec] border-[#bfe0d2]">
            <View className="flex-row items-center gap-2">
              <LineIcon name="check" size={15} color="#0e7a52" />
              <AppText weight="semibold" className="text-xs text-[#0e7a52] flex-1">
                {quickNotice}
              </AppText>
            </View>
          </Surface>
        )}

        <FadeInView index={1}>
          <SearchField
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari menu, misal tempe atau oatmeal"
            accessibilityLabel="Cari menu makanan"
          />
        </FadeInView>

        <FadeInView index={2} className="mt-3.5">
          {/* Illustrated Category Cards Strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingRight: 16 }}
            {...horizontalScrollTouchProps}
          >
            {ILLUSTRATED_SLOTS.map((slot) => {
              const isSelected = selectedSlot === slot.id;
              return (
                <PressableScale
                  key={slot.id}
                  onPress={() => setSelectedSlot(isSelected ? "Semua" : slot.id)}
                  pressedScale={0.97}
                  className={`w-[118px] rounded-[18px] overflow-hidden border ${
                    isSelected ? "bg-block-ink border-block-ink" : "bg-card border-line"
                  }`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Filter kategori ${slot.label}`}
                >
                  <View className="w-full h-[68px] bg-card-2 overflow-hidden">
                    <Image
                      source={slot.image}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  </View>
                  <View className="px-2.5 py-2">
                    <AppText
                      weight="semibold"
                      numberOfLines={1}
                      className={`text-[13px] ${isSelected ? "text-white" : "text-ink"}`}
                    >
                      {slot.label}
                    </AppText>
                    <AppText
                      weight="medium"
                      numberOfLines={1}
                      className={`text-[10.5px] mt-0.5 ${
                        isSelected ? "text-white/75" : "text-muted"
                      }`}
                    >
                      {slot.subtitle}
                    </AppText>
                  </View>
                </PressableScale>
              );
            })}
          </ScrollView>

          {/* Secondary Filter Strip: Semua + Favorit + Budgets */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 16, alignItems: "center", marginTop: 10 }}
            {...horizontalScrollTouchProps}
          >
            <FilterChip
              label="Semua waktu"
              selected={selectedSlot === "Semua" && !favoritesOnly}
              onPress={() => {
                setSelectedSlot("Semua");
                setFavoritesOnly(false);
              }}
            />
            <FilterChip
              label={favorites.length > 0 ? `Favorit (${favorites.length})` : "Favorit"}
              selected={favoritesOnly}
              onPress={() => setFavoritesOnly((prev) => !prev)}
            />
            <View className="w-px h-5 bg-line-2 mx-1" />
            {BUDGETS.map((b) => (
              <FilterChip key={b.id} label={b.label} selected={budgetId === b.id} onPress={() => setBudgetId(b.id)} />
            ))}
          </ScrollView>
        </FadeInView>

        {/* Quick Re-log Recent Meals Strip */}
        {!searchQuery && recentLoggedMeals.length > 0 && (
          <FadeInView index={3} className="mt-4">
            <View className="flex-row items-center justify-between mb-2 px-0.5">
              <AppText weight="semibold" className="text-[15px] text-ink">
                Terakhir dicatat
              </AppText>
              <AppText weight="medium" className="text-[12px] text-muted">
                Ketuk Catat ulang untuk simpan instan
              </AppText>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 12 }}
              {...horizontalScrollTouchProps}
            >
              {recentLoggedMeals.map((rec) => (
                <View
                  key={`${rec.mealId}-${rec.title}`}
                  className="w-[216px] bg-card border border-line rounded-[18px] p-3 justify-between"
                >
                  <View>
                    <AppText weight="medium" className="text-[11px] text-muted">
                      {mealLabel(rec.category)} · {rec.quantity > 1 ? `${rec.quantity}x ` : "1x "}porsi
                    </AppText>
                    <AppText weight="semibold" numberOfLines={2} className="text-[14px] text-ink mt-0.5">
                      {rec.title}
                    </AppText>
                    <AppText weight="bold" className="text-[12.5px] text-primary-text mt-1" style={tnum}>
                      {rec.calories} kcal · P {Math.round(rec.proteinGrams)}g
                    </AppText>
                  </View>
                  <View className="flex-row items-center justify-between gap-2 mt-2.5 pt-2 border-t border-line">
                    <PressableScale
                      onPress={() => void handleQuickRelog(rec)}
                      className="flex-1 h-8 rounded-full bg-primary-light items-center justify-center flex-row gap-1"
                      accessibilityRole="button"
                      accessibilityLabel={`Catat ulang ${rec.title}`}
                    >
                      <LineIcon name="refresh" size={12} color="#0e7a52" />
                      <AppText weight="bold" className="text-[11.5px] text-primary-text">
                        Catat ulang
                      </AppText>
                    </PressableScale>
                  </View>
                </View>
              ))}
            </ScrollView>
          </FadeInView>
        )}

        <FadeInView index={4} className="mt-4">
          <Surface dense>
            <ListRow
              last
              onPress={() => router.push("/(app)/meal-planner")}
              accessibilityLabel="Buka rencana makan 7 hari"
              leading={<RowIcon icon="calendar" tone="accent" />}
              title="Rencana makan 7 hari"
              caption="Jadwal otomatis sesuai kalori, alergi, dan budget"
              trailing={
                <View className="flex-row items-center gap-2">
                  {!isPremium && <StatusPill label="Premium" tone="warn" dot={false} />}
                  <LineIcon name="chevronRight" size={18} color="#7d8781" />
                </View>
              }
            />
          </Surface>
        </FadeInView>

        {selectedSlot !== "Semua" && (
          <View className="mt-4 rounded-[20px] bg-card border border-line p-3 flex-row items-center gap-3">
            <View className="w-[84px] h-[64px] rounded-[14px] overflow-hidden bg-card-2 flex-shrink-0">
              <Image
                source={getMealIllustration(selectedSlot)}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </View>
            <View className="flex-1 min-w-0">
              <AppText weight="bold" className="text-[11px] uppercase tracking-wider text-primary-text">
                Kategori Aktif
              </AppText>
              <AppText weight="semibold" numberOfLines={1} className="text-[15.5px] text-ink mt-0.5">
                {mealLabel(selectedSlot)}
              </AppText>
              <AppText weight="medium" className="text-[12px] text-muted">
                {filteredMeals.length} pilihan menu tersedia
              </AppText>
            </View>
            <PillButton
              label="Semua"
              size="sm"
              variant="ghost"
              onPress={() => setSelectedSlot("Semua")}
            />
          </View>
        )}

        <View className="flex-row items-center justify-between mt-5 mb-3 px-0.5">
          <AppText weight="semibold" className="text-[17px] text-ink" style={{ letterSpacing: -0.2 }}>
            {favoritesOnly
              ? "Menu favorit"
              : selectedSlot === "Semua"
              ? "Semua menu"
              : mealLabel(selectedSlot)}
          </AppText>
          {!isLoading && !isError && (
            <AppText weight="semibold" className="text-[12.5px] text-muted" style={tnum}>
              {filteredMeals.length} menu
            </AppText>
          )}
        </View>

        {renderList()}
      </ScrollView>

      <MealLogModal visible={isLogModalVisible} meal={selectedMealForLog} onClose={() => setIsLogModalVisible(false)} />
      <CreateRecipeModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onRecipeCreated={(newRecipe) => {
          setSelectedMealForLog(newRecipe);
          setIsLogModalVisible(true);
        }}
      />
    </ScreenWrapper>
  );
}
