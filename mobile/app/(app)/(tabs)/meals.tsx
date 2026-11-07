import React, { useState, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import { AppText, MealCard, MealLogModal, Badge } from "@/components/ui";
import { useRecipes } from "@/hooks/useRecipesQuery";
import { useJournalStore, getTodayDateKey, computeJournalAggregates } from "@/stores/useJournalStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { IconRenderer, CloseIconSvg, TagIconSvg, LightbulbIconSvg, CrownIconSvg } from "@/constants/Assets";
import { FoodItem } from "@/data/mockRecipes";

const SLOTS = ["Semua", "Breakfast", "Lunch", "Dinner", "Snack", "Drink"] as const;
const BUDGET_FILTERS = ["Semua Budget", "Di bawah Rp 20k", "Di bawah Rp 35k"] as const;

export default function MealsScreen() {
  const router = useRouter();
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const { data: recipes = [] } = useRecipes();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("Semua");
  const [selectedBudget, setSelectedBudget] = useState<string>("Semua Budget");

  // Logging modal states
  const [selectedMealForLog, setSelectedMealForLog] = useState<FoodItem | null>(null);
  const [isLogModalVisible, setIsLogModalVisible] = useState<boolean>(false);

  // Derive aggregates directly from single source of truth
  const todayDate = getTodayDateKey();
  const todayJournal = useJournalStore((state) => state.journals[todayDate]);
  const aggregates = useMemo(
    () => computeJournalAggregates(todayJournal),
    [todayJournal]
  );

  const filteredMeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return recipes.filter((m) => {
      const matchSearch =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q);

      const matchSlot =
        selectedSlot === "Semua" ||
        m.category.toLowerCase() === selectedSlot.toLowerCase();

      const cost = m.estimatedCostIdr ?? 0;
      let matchBudget = true;
      if (selectedBudget === "Di bawah Rp 20k") {
        matchBudget = cost > 0 && cost <= 20000;
      } else if (selectedBudget === "Di bawah Rp 35k") {
        matchBudget = cost > 0 && cost <= 35000;
      }

      return matchSearch && matchSlot && matchBudget;
    });
  }, [recipes, searchQuery, selectedSlot, selectedBudget]);

  const handleOpenLogModal = (meal: FoodItem) => {
    setSelectedMealForLog(meal);
    setIsLogModalVisible(true);
  };

  const handleOpenDetail = (mealId: string) => {
    router.push({
      pathname: "/(app)/recipe-detail",
      params: { id: mealId },
    });
  };

  return (
    <ScreenWrapper maxWidth="full" noPadding className="flex-1 bg-[#f7faf7]">
      {/* Header Bar: Apple Translucent Frosted Glass Header */}
      <View
        className="w-full border-b border-[#e5ece7] px-4 sm:px-6 lg:px-8 pt-4 pb-4 z-20"
        style={
          Platform.OS === "web"
            ? ({
                backgroundColor: "rgba(255, 255, 255, 0.88)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                position: "sticky",
                top: 0,
              } as any)
            : { backgroundColor: "#ffffff" }
        }
      >
        <View className="max-w-[1280px] mx-auto w-full flex-col sm:flex-row sm:items-center justify-between gap-3">
          <View className="flex-1">
            <AppText weight="black" className="text-xl sm:text-2xl text-[#14261c] tracking-tight">
              Jurnal Makan & Menu Harian
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5 leading-relaxed">
              Pilih hidangan bergizi dan catat kalori langsung ke jurnal harian Anda.
            </AppText>
          </View>

          {/* Daily Journal Progress Chip */}
          <View
            className="self-start sm:self-center h-8 px-3.5 rounded-full bg-[#eaf4ed] border border-[#d2e7d7] flex-row items-center gap-2"
            accessibilityRole="summary"
            accessibilityLabel={`Tercatat: ${aggregates.entryCount} makanan, ${aggregates.totalConsumed} dari ${aggregates.targetCalories || 2582} kalori`}
          >
            <View className="w-2 h-2 rounded-full bg-[#1b5e37]" />
            <AppText weight="bold" className="text-xs text-[#14261c]" style={{ fontVariant: ["tabular-nums"] }}>
              {aggregates.entryCount} Tercatat
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-muted">
              ·
            </AppText>
            <AppText weight="bold" className="text-xs text-[#1b5e37]" style={{ fontVariant: ["tabular-nums"] }}>
              {aggregates.totalConsumed.toLocaleString("id-ID")} / {(aggregates.targetCalories || 2582).toLocaleString("id-ID")} kcal
            </AppText>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-[#f7faf7]"
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 56 : 112 }}
        showsVerticalScrollIndicator={false}
      >
        {/* PREMIUM MEAL PLANNER DISCOVERY BANNER */}
        <View className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-1">
          <TouchableOpacity
            onPress={() => router.push("/(app)/meal-planner")}
            className="w-full bg-white rounded-[20px] p-4 border border-[#e5ece7] shadow-[0_2px_10px_rgba(20,50,25,0.03)] flex-col sm:flex-row sm:items-center justify-between gap-3 active:scale-[0.99] transition-transform"
            accessibilityRole="button"
            accessibilityLabel="Buka Personalized Meal Planner"
          >
            <View className="flex-row items-center gap-3.5">
              <View className="w-10 h-10 rounded-xl bg-[#fdf6e7] border border-[#f5e3ba] items-center justify-center">
                <CrownIconSvg size={20} color="#b45309" />
              </View>
              <View>
                <View className="flex-row items-center gap-2">
                  <AppText weight="bold" className="text-sm text-[#14261c]">
                    Personalized Weekly Meal Planner
                  </AppText>
                  <Badge label={isPremium ? "Aktif" : "Premium"} variant={isPremium ? "primary" : "outline"} size="sm" />
                </View>
                <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
                  Jadwal makan 7 hari otomatis sesuai kalori, alergi makanan, dan budget belanja pasar.
                </AppText>
              </View>
            </View>

            <View className="self-end sm:self-center px-3.5 py-1.5 rounded-full bg-[#eaf4ed] border border-[#d2e7d7]">
              <AppText weight="bold" className="text-xs text-[#1b5e37]">
                {isPremium ? "Buka Jadwal" : "Lihat Fitur"}
              </AppText>
            </View>
          </TouchableOpacity>
        </View>

        {/* SEARCH AND FILTERS */}
        <View className="max-w-[1280px] mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-2">
          {/* Integrated Search Input */}
          <View className="flex-row items-center bg-white border border-[#e2eae4] rounded-2xl px-4 py-1.5 min-h-[46px] shadow-2xs">
            <View className="mr-2.5">
              <IconRenderer name="Search" size={16} color="#607065" />
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cari makanan (misal: Ayam panggang, Tempe, Oatmeal, Salmon)..."
              placeholderTextColor="#8a9a8f"
              className="flex-1 text-sm text-[#14261c] font-medium"
              style={{
                fontFamily: "Akatab-Medium",
                includeFontPadding: false,
                ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
              }}
              accessibilityLabel="Cari makanan"
              returnKeyType="search"
            />
            {Boolean(searchQuery) && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="w-6 h-6 rounded-full bg-[#ebf0ec] items-center justify-center ml-1"
                accessibilityRole="button"
                accessibilityLabel="Hapus pencarian"
              >
                <CloseIconSvg size={12} color="#5a625b" />
              </TouchableOpacity>
            )}
          </View>

          {/* Unified Horizontal Filter Strip */}
          <View className="mt-3">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, alignItems: "center" }}
              className="flex-row"
            >
              {/* Category Pills */}
              {SLOTS.map((slot) => {
                const isSelected = selectedSlot === slot;
                return (
                  <Pressable
                    key={slot}
                    onPress={() => setSelectedSlot(slot)}
                    className={`min-h-[38px] px-4 py-1.5 rounded-full flex-row items-center justify-center transition-all duration-150 active:scale-[0.97] ${
                      isSelected
                        ? "bg-[#1b5e37] shadow-xs"
                        : "bg-white border border-[#e5ece7] active:bg-[#f2f7f4]"
                    } ${Platform.OS === "web" ? "cursor-pointer" : ""}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Filter ${slot}`}
                  >
                    <AppText
                      weight={isSelected ? "bold" : "medium"}
                      className={`text-xs ${
                        isSelected ? "text-white" : "text-[#14261c]"
                      }`}
                    >
                      {slot}
                    </AppText>
                  </Pressable>
                );
              })}

              <View className="w-[1px] h-5 bg-[#e2eae4] mx-1" />

              {/* Budget Filter Pills */}
              {BUDGET_FILTERS.map((budget) => {
                const isSelected = selectedBudget === budget;
                return (
                  <Pressable
                    key={budget}
                    onPress={() => setSelectedBudget(budget)}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-full flex-row items-center justify-center transition-all duration-150 active:scale-[0.97] ${
                      isSelected
                        ? "bg-[#1b5e37] shadow-xs"
                        : "bg-white border border-[#e5ece7] active:bg-[#f2f7f4]"
                    } ${Platform.OS === "web" ? "cursor-pointer" : ""}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Filter budget: ${budget}`}
                  >
                    <TagIconSvg
                      size={11}
                      color={isSelected ? "#ffffff" : "#1b5e37"}
                      style={{ marginRight: 4 }}
                    />
                    <AppText
                      weight={isSelected ? "bold" : "medium"}
                      className={`text-xs ${
                        isSelected ? "text-white" : "text-[#14261c]"
                      }`}
                    >
                      {budget}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* RECIPE CATALOGUE GRID */}
        <View className="px-4 sm:px-6 lg:px-8 pt-3 max-w-[1280px] mx-auto w-full">
          {filteredMeals.length === 0 ? (
            <View className="bg-white rounded-[24px] p-8 items-center justify-center border border-[#e5ece7] my-4 w-full shadow-xs">
              <View className="w-12 h-12 rounded-xl bg-[#eaf4ed] items-center justify-center mb-3">
                <IconRenderer name="Cook" size={24} color="#1b5e37" />
              </View>
              <AppText weight="bold" className="text-base text-[#14261c] mb-1 text-center">
                Tidak ada menu yang sesuai
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted text-center max-w-xs mb-4 leading-relaxed">
                {searchQuery
                  ? `Tidak ditemukan menu dengan kata kunci "${searchQuery}". Coba kata kunci lain atau ubah filter.`
                  : "Tidak ada menu yang sesuai dengan kategori dan filter budget yang dipilih."}
              </AppText>
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery("");
                  setSelectedSlot("Semua");
                  setSelectedBudget("Semua Budget");
                }}
                className="px-5 py-2.5 rounded-xl bg-[#1b5e37] active:bg-[#154a2b] transition-colors min-h-[40px] items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Reset pencarian dan filter"
              >
                <AppText weight="bold" className="text-xs text-white">
                  Reset Filter & Pencarian
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-row flex-wrap -mx-2">
              {filteredMeals.map((meal) => (
                <View
                  key={meal.id}
                  className="mb-4 px-2 w-full sm:w-1/2 md:w-1/3 lg:w-1/4"
                >
                  <MealCard
                    title={meal.title}
                    mealType={meal.category}
                    calories={meal.calories}
                    description={meal.description}
                    prepTimeMinutes={meal.prepTimeMinutes}
                    estimatedCostIdr={meal.estimatedCostIdr}
                    imageUrl={meal.imageUrl}
                    showLogButton={true}
                    onLogMeal={() => handleOpenLogModal(meal)}
                    onPress={() => handleOpenDetail(meal.id)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* AFFORDABILITY FOOTER NOTE */}
        <View className="px-4 sm:px-6 lg:px-8 pt-2 pb-6 max-w-[1280px] mx-auto w-full">
          <View className="bg-white rounded-2xl p-4 border border-[#e5ece7] flex-row items-start shadow-2xs">
            <View className="w-7 h-7 rounded-lg bg-[#eaf4ed] items-center justify-center mr-3 mt-0.5">
              <LightbulbIconSvg size={15} color="#1b5e37" />
            </View>
            <View className="flex-1">
              <AppText weight="bold" className="text-xs text-[#14261c] mb-0.5">
                Estimasi Biaya Bahan Pasar Indonesia
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted leading-relaxed">
                Harga dihitung berdasarkan rata-rata harga pasar lokal untuk membantu Anda merencanakan nutrisi seimbang yang realistis dan hemat budget harian.
              </AppText>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Structured Meal Log Modal */}
      <MealLogModal
        visible={isLogModalVisible}
        meal={selectedMealForLog}
        onClose={() => setIsLogModalVisible(false)}
      />
    </ScreenWrapper>
  );
}
