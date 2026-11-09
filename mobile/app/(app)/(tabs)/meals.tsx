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
} from "@/components/ui";
import { useRecipes } from "@/hooks/useRecipesQuery";
import { useJournalStore, getTodayDateKey, computeJournalAggregates } from "@/stores/useJournalStore";
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
  const [budgetId, setBudgetId] = useState<string>("all");

  const [selectedMealForLog, setSelectedMealForLog] = useState<FoodItem | null>(null);
  const [isLogModalVisible, setIsLogModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  const todayDate = getTodayDateKey();
  const todayJournal = useJournalStore((state) => state.journals[todayDate]);
  const aggregates = useMemo(() => computeJournalAggregates(todayJournal), [todayJournal]);
  const target = aggregates.targetCalories || 2253;

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
    const baseMatches = recipes.filter((m) => {
      const matchSearch =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        mealLabel(m.category).toLowerCase().includes(q);
      const matchSlot = selectedSlot === "Semua" || m.category.toLowerCase() === selectedSlot.toLowerCase();
      const cost = m.estimatedCostIdr ?? 0;
      const matchBudget = budget.max === Infinity || (cost > 0 && cost <= budget.max);
      return matchSearch && matchSlot && matchBudget;
    });
    return [...baseMatches, ...ingredientAsMeals];
  }, [recipes, searchQuery, selectedSlot, budgetId, ingredientAsMeals]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedSlot("Semua");
    setBudgetId("all");
  };

  const handleOpenLogModal = (meal: FoodItem) => {
    setSelectedMealForLog(meal);
    setIsLogModalVisible(true);
  };

  const renderList = () => {
    if (isLoading) {
      return (
        <Surface className="items-center py-10">
          <AppText weight="medium" className="text-sm text-muted">
            Memuat daftar menu...
          </AppText>
        </Surface>
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
            <LineIcon name="utensils" size={20} color="#0e7a52" />
          </View>
          <AppText weight="semibold" className="text-base text-ink text-center">
            Tidak ada menu yang cocok
          </AppText>
          <AppText weight="medium" className="text-[13px] text-muted text-center mt-1 mb-4 max-w-xs">
            {searchQuery
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
                  label={`${Math.max(0, target - aggregates.totalConsumed).toLocaleString("id-ID")} kcal`}
                  tone="accent"
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

          {/* Secondary Filter Strip: Semua + Budgets */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 16, alignItems: "center", marginTop: 10 }}
            {...horizontalScrollTouchProps}
          >
            <FilterChip
              label="Semua waktu"
              selected={selectedSlot === "Semua"}
              onPress={() => setSelectedSlot("Semua")}
            />
            <View className="w-px h-5 bg-line-2 mx-1" />
            {BUDGETS.map((b) => (
              <FilterChip key={b.id} label={b.label} selected={budgetId === b.id} onPress={() => setBudgetId(b.id)} />
            ))}
          </ScrollView>
        </FadeInView>

        <FadeInView index={3} className="mt-4">
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
              <AppText weight="medium" numberOfLines={1} className="text-[12px] text-muted">
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
            {selectedSlot === "Semua" ? "Semua menu" : mealLabel(selectedSlot)}
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
