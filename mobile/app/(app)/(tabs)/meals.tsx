import React, { useState, useMemo } from "react";
import { View, ScrollView, Platform, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AppText,
  MealCard,
  MealLogModal,
  Badge,
  PressableScale,
  FadeInView,
  FilterChip,
  SearchField,
} from "@/components/ui";
import { useRecipes } from "@/hooks/useRecipesQuery";
import { useJournalStore, getTodayDateKey, computeJournalAggregates } from "@/stores/useJournalStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { CalendarIconSvg, ChevronRightIconSvg, IconRenderer } from "@/constants/Assets";
import { mealLabel } from "@/constants/MealLabels";
import { FoodItem } from "@/data/mockRecipes";

const SLOTS = ["Semua", "Breakfast", "Lunch", "Dinner", "Snack", "Drink"] as const;
const BUDGETS = [
  { id: "all", label: "Semua harga", max: Infinity },
  { id: "20", label: "≤ Rp 20rb", max: 20000 },
  { id: "35", label: "≤ Rp 35rb", max: 35000 },
] as const;

export default function MealsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const useRowCards = width < 640;
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const { data: recipes = [], isLoading, isError, refetch } = useRecipes();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string>("Semua");
  const [budgetId, setBudgetId] = useState<string>("all");

  const [selectedMealForLog, setSelectedMealForLog] = useState<FoodItem | null>(null);
  const [isLogModalVisible, setIsLogModalVisible] = useState(false);

  const todayDate = getTodayDateKey();
  const todayJournal = useJournalStore((state) => state.journals[todayDate]);
  const aggregates = useMemo(() => computeJournalAggregates(todayJournal), [todayJournal]);
  const target = aggregates.targetCalories || 2253;

  const filteredMeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const budget = BUDGETS.find((b) => b.id === budgetId) ?? BUDGETS[0];
    return recipes.filter((m) => {
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
  }, [recipes, searchQuery, selectedSlot, budgetId]);

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
        <AppText weight="medium" className="text-sm text-neutral-muted py-10 text-center">
          Memuat daftar menu...
        </AppText>
      );
    }
    if (isError) {
      return (
        <View className="items-center py-10">
          <AppText weight="bold" className="text-base text-neutral-dark">
            Menu belum bisa dimuat
          </AppText>
          <AppText weight="medium" className="text-[13px] text-neutral-muted mt-1 mb-4 text-center">
            Periksa koneksi, lalu muat ulang.
          </AppText>
          <PressableScale onPress={() => refetch()} className="h-11 px-5 rounded-full bg-primary justify-center">
            <AppText weight="bold" className="text-sm text-white">
              Muat ulang
            </AppText>
          </PressableScale>
        </View>
      );
    }
    if (filteredMeals.length === 0) {
      return (
        <View className="items-center py-10 px-6">
          <View className="w-12 h-12 rounded-2xl bg-primary-light items-center justify-center mb-3">
            <IconRenderer name="Cook" size={22} color="#153e28" />
          </View>
          <AppText weight="bold" className="text-base text-neutral-dark text-center">
            Tidak ada menu yang cocok
          </AppText>
          <AppText weight="medium" className="text-[13px] text-neutral-muted text-center mt-1 mb-4 max-w-xs">
            {searchQuery
              ? `Belum ada menu untuk "${searchQuery}". Coba kata lain atau hapus filter.`
              : "Kombinasi waktu makan dan harga ini belum punya menu."}
          </AppText>
          <PressableScale onPress={resetFilters} className="h-11 px-5 rounded-full border border-[#dfe6e0] justify-center">
            <AppText weight="bold" className="text-sm text-primary">
              Hapus semua filter
            </AppText>
          </PressableScale>
        </View>
      );
    }
    return (
      <View className={useRowCards ? "gap-2.5" : "flex-row flex-wrap -mx-2"}>
        {filteredMeals.map((meal, i) => (
          <FadeInView
            key={meal.id}
            index={Math.min(i, 8)}
            className={useRowCards ? "" : "mb-4 px-2 w-1/2 md:w-1/3 lg:w-1/4"}
          >
            <MealCard
              layout={useRowCards ? "row" : "stack"}
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
              Catat makan
            </AppText>
            <AppText weight="medium" className="text-[13px] text-neutral-muted mt-0.5" style={{ fontVariant: ["tabular-nums"] }}>
              {aggregates.totalConsumed.toLocaleString("id-ID")} dari {target.toLocaleString("id-ID")} kcal hari ini
            </AppText>
          </View>
        </FadeInView>

        <FadeInView index={1}>
          <SearchField
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari menu, misal tempe atau oatmeal"
            accessibilityLabel="Cari menu makanan"
          />
        </FadeInView>

        <FadeInView index={2} className="mt-3 -mx-4 sm:mx-0">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16, alignItems: "center" }}
          >
            {SLOTS.map((slot) => (
              <FilterChip
                key={slot}
                label={mealLabel(slot)}
                selected={selectedSlot === slot}
                onPress={() => setSelectedSlot(slot)}
              />
            ))}
            <View className="w-px h-5 bg-[#e3e1da] mx-1" />
            {BUDGETS.map((b) => (
              <FilterChip key={b.id} label={b.label} selected={budgetId === b.id} onPress={() => setBudgetId(b.id)} />
            ))}
          </ScrollView>
        </FadeInView>

        <FadeInView index={3} className="mt-4">
          <PressableScale
            onPress={() => router.push("/(app)/meal-planner")}
            pressedScale={0.985}
            className="flex-row items-center py-3 border-y border-[#ebe9e2]"
            accessibilityRole="link"
            accessibilityLabel="Buka rencana makan 7 hari"
          >
            <View className="w-10 h-10 rounded-xl bg-primary-light items-center justify-center">
              <CalendarIconSvg size={17} color="#153e28" />
            </View>
            <View className="flex-1 min-w-0 ml-3 mr-2">
              <View className="flex-row items-center gap-2">
                <AppText weight="bold" className="text-[15px] text-neutral-dark">
                  Rencana makan 7 hari
                </AppText>
                {!isPremium && <Badge label="Premium" variant="accent" size="sm" />}
              </View>
              <AppText weight="medium" numberOfLines={1} className="text-xs text-neutral-muted mt-0.5">
                Jadwal otomatis sesuai kalori, alergi, dan budget
              </AppText>
            </View>
            <ChevronRightIconSvg size={16} color="#8b938c" />
          </PressableScale>
        </FadeInView>

        <View className="flex-row items-center justify-between mt-5 mb-3 px-0.5">
          <AppText weight="bold" className="text-[17px] text-neutral-dark">
            {selectedSlot === "Semua" ? "Semua menu" : mealLabel(selectedSlot)}
          </AppText>
          {!isLoading && !isError && (
            <AppText weight="medium" className="text-xs text-neutral-muted" style={{ fontVariant: ["tabular-nums"] }}>
              {filteredMeals.length} menu
            </AppText>
          )}
        </View>

        {renderList()}

        <AppText weight="medium" className="text-xs text-neutral-muted leading-relaxed mt-6 px-0.5">
          Harga adalah perkiraan biaya bahan di pasar lokal, untuk membantu menyusun menu sesuai budget.
        </AppText>
      </ScrollView>

      <MealLogModal visible={isLogModalVisible} meal={selectedMealForLog} onClose={() => setIsLogModalVisible(false)} />
    </ScreenWrapper>
  );
}
