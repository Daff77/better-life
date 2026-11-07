import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AppText,
  ProgressRing,
  ProgressBar,
  AnimatedNumber,
  MealLogModal,
} from "@/components/ui";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import {
  useJournalStore,
  getTodayDateKey,
  computeJournalAggregates,
} from "@/stores/useJournalStore";
import { useActivityStats, useAddStepsMutation } from "@/hooks/useActivityQuery";
import {
  CloseIconSvg,
  SearchIconSvg,
} from "@/constants/Assets";
import { FoodItem } from "@/data/mockRecipes";

// Standard meal slot definitions for grouping journal entries
const MEAL_SLOTS = [
  {
    id: "Breakfast",
    label: "Sarapan",
    sublabel: "Morning Fuel",
    iconName: "Breakfast" as const,
    dotColor: "#eab308",
  },
  {
    id: "Lunch",
    label: "Makan siang",
    sublabel: "Midday Balance",
    iconName: "Lunch" as const,
    dotColor: "#10b981",
  },
  {
    id: "Dinner",
    label: "Makan malam",
    sublabel: "Evening Nourish",
    iconName: "Dinner" as const,
    dotColor: "#818cf8",
  },
  {
    id: "Snack",
    label: "Camilan & minum",
    sublabel: "Light Bites",
    iconName: "Snacks" as const,
    dotColor: "#ec4899",
  },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isNarrowMobile = width < 360;

  const user = useAuthStore((state) => state.user);
  const personalization = useOnboardingStore((state) => state.personalization);

  // Single Source of Truth: Central Journal Store
  const todayDate = getTodayDateKey();
  const todayJournal = useJournalStore((state) => state.journals[todayDate]);
  const aggregates = useMemo(
    () => computeJournalAggregates(todayJournal, personalization.targetCalories),
    [todayJournal, personalization.targetCalories]
  );

  // Activity stats query & mutation
  const { data: activity } = useActivityStats();
  const addStepsMutation = useAddStepsMutation();

  // Logging modal state
  const [selectedMealForLog, setSelectedMealForLog] = useState<FoodItem | null>(null);
  const [isLogModalVisible, setIsLogModalVisible] = useState<boolean>(false);

  // Target calories sync
  useEffect(() => {
    if (personalization.targetCalories && personalization.targetCalories > 0) {
      if (todayJournal && todayJournal.targetCalories !== personalization.targetCalories) {
        useJournalStore.getState().setTargetCalories(personalization.targetCalories, todayDate);
      }
    }
  }, [personalization.targetCalories, todayDate, todayJournal?.targetCalories]);

  // Derived progress percentage (0 - 100)
  const progressPercent = Math.min(
    100,
    Math.round(aggregates.progressRatio * 100)
  );

  // User initials for avatar
  const userInitials = useMemo(() => {
    if (!user?.name) return "DA";
    const parts = user.name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.name.slice(0, 2).toUpperCase();
  }, [user?.name]);

  // Indonesian / Localized formatted date
  const formattedToday = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, []);

  // Dynamic greeting based on current local hour
  const currentHour = new Date().getHours();
  const greetingTime =
    currentHour < 11
      ? "Selamat pagi"
      : currentHour < 15
      ? "Selamat siang"
      : currentHour < 18
      ? "Selamat sore"
      : "Selamat malam";

  // Group today's journal entries by slot
  const groupedJournal = useMemo(() => {
    const entries = todayJournal?.entries || [];
    return MEAL_SLOTS.map((slot) => {
      const slotEntries = entries.filter((e) => {
        if (slot.id === "Snack") {
          return e.category === "Snack" || (e as any).category === "Drink";
        }
        return e.category === slot.id;
      });
      const totalSlotCalories = slotEntries.reduce((sum, item) => sum + item.calories, 0);
      return {
        ...slot,
        entries: slotEntries,
        totalCalories: totalSlotCalories,
      };
    });
  }, [todayJournal?.entries]);

  const handleOpenSlotLog = (slotId: string, slotLabel: string) => {
    setSelectedMealForLog({
      id: `custom-${slotId.toLowerCase()}`,
      title: `Menu ${slotLabel}`,
      category: slotId === "Snack" ? "Snack" : (slotId as any),
      calories: 300,
      description: `Pencatatan menu makanan untuk ${slotLabel}`,
      svgIcon: (slotId === "Breakfast" ? "Breakfast" : slotId === "Lunch" ? "Lunch" : slotId === "Dinner" ? "Dinner" : "Snacks") as any,
      ingredients: [],
      instructions: [],
      nutrition: {
        proteinGrams: 20,
        carbsGrams: 35,
        fatGrams: 10,
        fiberGrams: 4,
      },
      prepTimeMinutes: 15,
      difficulty: "Easy",
    });
    setIsLogModalVisible(true);
  };

  const handleDeleteEntry = (entryId: string, title: string) => {
    Alert.alert(
      "Hapus Makanan",
      `Hapus "${title}" dari jurnal hari ini?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            await useJournalStore.getState().removeEntry(entryId, todayDate);
          },
        },
      ]
    );
  };

  // Macro calculation & percentage ratios
  const targetCalories = aggregates.targetCalories || 2253;
  const targetProtein = aggregates.targetProteinGrams || 141;
  const targetCarbs = aggregates.targetCarbsGrams || 282;
  const targetFat = aggregates.targetFatGrams || 63;

  const proteinPct = Math.min(100, Math.round((aggregates.totalProteinGrams / targetProtein) * 100));
  const carbsPct = Math.min(100, Math.round((aggregates.totalCarbsGrams / targetCarbs) * 100));
  const fatPct = Math.min(100, Math.round((aggregates.totalFatGrams / targetFat) * 100));

  /* -------------------------------------------------------------
     1. HERO: The Simplified Dark Calorie & Macro Equilibrium Hub
     ------------------------------------------------------------- */
  const renderUnifiedEnergyHub = () => (
    <View className="bg-[#14221a] rounded-[24px] border border-[#1e3327] p-5 shadow-sm">
      {/* Upper row: Ring Gauge on Left, Stats on Right */}
      <View className="flex-row items-center justify-between gap-4">
        {/* Left: Progress Ring */}
        <View className="flex-shrink-0 items-center justify-center">
          <ProgressRing
            progress={progressPercent}
            size={isNarrowMobile ? 90 : 100}
            strokeWidth={10}
            color="#22c55e"
            backgroundColor="#1a2e23"
            textColor="#ffffff"
            label="tercatat"
            labelColor="#789182"
          />
        </View>

        {/* Right: Status Pill + Remaining Calories */}
        <View className="flex-1 justify-center pl-2">
          {/* Pacing status badge */}
          <View className="px-2.5 py-1 rounded-full bg-[#102a1c] border border-[#1d4730] flex-row items-center gap-1.5 self-start mb-2">
            <View className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            <AppText weight="bold" className="text-[11px] text-[#22c55e]">
              {aggregates.remainingCalories > 0 ? "Pacing optimal" : "Target tercapai"}
            </AppText>
          </View>

          <AppText weight="medium" className="text-xs text-[#789182] mb-0.5">
            Sisa budget kalori
          </AppText>

          <View className="flex-row items-baseline gap-1.5">
            <AppText
              weight="black"
              className="text-3xl sm:text-4xl text-white leading-tight"
              style={{
                fontVariant: ["tabular-nums"],
                letterSpacing: -0.8,
              }}
            >
              {aggregates.remainingCalories.toLocaleString("id-ID")}
            </AppText>
            <AppText weight="bold" className="text-sm text-[#789182]">
              kcal
            </AppText>
          </View>

          <AppText weight="medium" className="text-xs text-[#789182] mt-1" style={{ fontVariant: ["tabular-nums"] }}>
            {aggregates.totalConsumed.toLocaleString("id-ID")} dari {targetCalories.toLocaleString("id-ID")} kcal
          </AppText>
        </View>
      </View>

      {/* Lower row: 3 Macro Cards side by side */}
      <View className="flex-row gap-2.5 mt-5">
        {/* Protein */}
        <View className="flex-1 bg-[#0f1b14] rounded-xl p-3 border border-[#182d20] justify-between">
          <AppText weight="bold" className="text-xs text-[#22c55e] mb-2">
            Protein
          </AppText>
          <View className="h-1 rounded-full bg-[#182d20] overflow-hidden mb-2">
            <View
              style={{ width: `${proteinPct}%` }}
              className="h-full bg-[#22c55e] rounded-full"
            />
          </View>
          <View className="flex-row items-baseline gap-0.5">
            <AppText weight="black" className="text-sm text-white" style={{ fontVariant: ["tabular-nums"] }}>
              {Math.round(aggregates.totalProteinGrams)}
            </AppText>
            <AppText weight="medium" className="text-xs text-[#789182]" style={{ fontVariant: ["tabular-nums"] }}>
              {" "}/ {targetProtein} g
            </AppText>
          </View>
        </View>

        {/* Karbo */}
        <View className="flex-1 bg-[#0f1b14] rounded-xl p-3 border border-[#182d20] justify-between">
          <AppText weight="bold" className="text-xs text-[#f59e0b] mb-2">
            Karbo
          </AppText>
          <View className="h-1 rounded-full bg-[#2a2010] overflow-hidden mb-2">
            <View
              style={{ width: `${carbsPct}%` }}
              className="h-full bg-[#f59e0b] rounded-full"
            />
          </View>
          <View className="flex-row items-baseline gap-0.5">
            <AppText weight="black" className="text-sm text-white" style={{ fontVariant: ["tabular-nums"] }}>
              {Math.round(aggregates.totalCarbsGrams)}
            </AppText>
            <AppText weight="medium" className="text-xs text-[#789182]" style={{ fontVariant: ["tabular-nums"] }}>
              {" "}/ {targetCarbs} g
            </AppText>
          </View>
        </View>

        {/* Lemak */}
        <View className="flex-1 bg-[#0f1b14] rounded-xl p-3 border border-[#182d20] justify-between">
          <AppText weight="bold" className="text-xs text-[#38bdf8] mb-2">
            Lemak
          </AppText>
          <View className="h-1 rounded-full bg-[#102432] overflow-hidden mb-2">
            <View
              style={{ width: `${fatPct}%` }}
              className="h-full bg-[#38bdf8] rounded-full"
            />
          </View>
          <View className="flex-row items-baseline gap-0.5">
            <AppText weight="black" className="text-sm text-white" style={{ fontVariant: ["tabular-nums"] }}>
              {Math.round(aggregates.totalFatGrams)}
            </AppText>
            <AppText weight="medium" className="text-xs text-[#789182]" style={{ fontVariant: ["tabular-nums"] }}>
              {" "}/ {targetFat} g
            </AppText>
          </View>
        </View>
      </View>
    </View>
  );

  /* -------------------------------------------------------------
     2. QUICK ACTION DOCK (Ergonomic pointer-down tactile feedback)
     ------------------------------------------------------------- */
  const renderQuickActionDock = () => (
    <View className="flex-row items-center gap-2.5">
      <TouchableOpacity
        onPress={() => router.push("/(app)/(tabs)/meals")}
        activeOpacity={0.85}
        className="flex-1 min-h-[46px] py-3 px-3 rounded-2xl bg-[#4ade80] active:bg-[#22c55e] active:scale-[0.97] transition-all flex-row items-center justify-center gap-1.5 shadow-sm"
        accessibilityRole="button"
        accessibilityLabel="Catat Makanan"
      >
        <AppText weight="bold" className="text-[#071f11] text-xs sm:text-sm">
          + Catat makan
        </AppText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/(app)/(tabs)/recipes")}
        activeOpacity={0.85}
        className="flex-1 min-h-[46px] py-3 px-3 rounded-2xl bg-[#14221a] border border-[#1e3327] active:bg-[#1a2d23] active:scale-[0.97] transition-all flex-row items-center justify-center shadow-xs"
        accessibilityRole="button"
        accessibilityLabel="Lihat Resep Sehat"
      >
        <AppText weight="bold" className="text-white text-xs sm:text-sm">
          Resep
        </AppText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/(app)/meal-planner")}
        activeOpacity={0.85}
        className="flex-1 min-h-[46px] py-3 px-3 rounded-2xl bg-[#14221a] border border-[#1e3327] active:bg-[#1a2d23] active:scale-[0.97] transition-all flex-row items-center justify-center shadow-xs"
        accessibilityRole="button"
        accessibilityLabel="Meal Planner 7 Hari"
      >
        <AppText weight="bold" className="text-white text-xs sm:text-sm">
          Plan 7H
        </AppText>
      </TouchableOpacity>
    </View>
  );

  /* -------------------------------------------------------------
     3. DAILY MEAL JOURNEY (Sleek Dark Slot List)
     ------------------------------------------------------------- */
  const renderDailyMealJourney = () => (
    <View className="bg-[#14221a] rounded-[24px] border border-[#1e3327] p-4 sm:p-5 shadow-sm">
      {/* Journal Header */}
      <View className="flex-row items-center justify-between pb-3.5 mb-1">
        <View>
          <AppText weight="bold" className="text-base text-white">
            Jurnal hari ini
          </AppText>
          <AppText weight="medium" className="text-xs text-[#789182] mt-0.5">
            {aggregates.entryCount} makanan tercatat
          </AppText>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(app)/(tabs)/meals")}
          className="py-1 px-2.5 rounded-lg active:opacity-75"
          accessibilityRole="link"
          accessibilityLabel="Lihat Semua Menu"
        >
          <AppText weight="bold" className="text-xs text-[#34d399]">
            Semua
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Meal Slots List */}
      <View>
        {groupedJournal.map((slot) => {
          const hasEntries = slot.entries.length > 0;

          return (
            <View key={slot.id} className="py-3.5 border-t border-[#1e3327]/60">
              {/* Slot Bar */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                  <View style={{ backgroundColor: slot.dotColor }} className="w-2.5 h-2.5 rounded-full" />
                  <View className="flex-1">
                    <AppText weight="bold" className="text-sm text-white">
                      {slot.label}
                    </AppText>
                    <AppText weight="medium" className="text-xs text-[#789182] mt-0.5">
                      {hasEntries
                        ? `${slot.entries.length} menu tercatat`
                        : "Belum ada menu"}
                    </AppText>
                  </View>
                </View>

                <View className="flex-row items-center gap-2.5">
                  <AppText
                    weight="medium"
                    className="text-xs text-[#789182]"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {slot.totalCalories} kcal
                  </AppText>
                  <TouchableOpacity
                    onPress={() => handleOpenSlotLog(slot.id, slot.label)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    className="w-9 h-9 rounded-xl bg-[#1a2d23] border border-[#243d2f] items-center justify-center active:bg-[#223a2c] active:scale-[0.95] transition-transform"
                    accessibilityRole="button"
                    accessibilityLabel={`Tambah makanan ke ${slot.label}`}
                  >
                    <AppText weight="bold" className="text-base text-[#34d399] leading-none">
                      +
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Slot Entries Breakdown if Logged */}
              {hasEntries && (
                <View className="gap-2 mt-2.5 pt-2 border-t border-[#192b20]">
                  {slot.entries.map((item) => (
                    <View
                      key={item.id}
                      className="p-2.5 rounded-xl bg-[#0f1b14] border border-[#182d20] flex-row items-center justify-between"
                    >
                      <View className="flex-1 mr-2 min-w-0">
                        <AppText weight="bold" numberOfLines={1} className="text-xs text-white">
                          {item.title}
                        </AppText>
                        <AppText weight="medium" className="text-[10px] text-[#789182] mt-0.5">
                          {item.quantity > 1 ? `${item.quantity} porsi · ` : ""}P: {item.proteinGrams}g · C: {item.carbsGrams}g · F: {item.fatGrams}g
                        </AppText>
                      </View>

                      <View className="flex-row items-center gap-2 flex-shrink-0">
                        <AppText weight="black" className="text-xs text-[#22c55e]" style={{ fontVariant: ["tabular-nums"] }}>
                          +{item.calories} kcal
                        </AppText>
                        <TouchableOpacity
                          onPress={() => handleDeleteEntry(item.id, item.title)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          className="w-6 h-6 rounded-md bg-[#2d1b1b] border border-[#442222] items-center justify-center active:bg-[#3d2222]"
                          accessibilityRole="button"
                          accessibilityLabel={`Hapus ${item.title}`}
                        >
                          <CloseIconSvg size={11} color="#f87171" strokeWidth={2.4} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

  /* -------------------------------------------------------------
     4. PHYSICAL ACTIVITY & MOVEMENT SUMMARY (Compact Dark Tile)
     ------------------------------------------------------------- */
  const renderVitalityMovementTile = () => {
    const steps = activity?.steps ?? 3420;
    const stepGoal = activity?.stepGoal ?? 6000;
    const stepsPct = Math.min(100, Math.round((steps / stepGoal) * 100));
    const activeCalories = activity?.exerciseCalories ?? 240;

    return (
      <View className="bg-[#14221a] rounded-[24px] border border-[#1e3327] p-4 sm:p-5 shadow-sm">
        <View className="flex-row items-center justify-between pb-3 mb-3 border-b border-[#1e3327]/60">
          <View>
            <AppText weight="bold" className="text-base text-white">
              Aktivitas & Langkah
            </AppText>
            <AppText weight="medium" className="text-xs text-[#789182]">
              Pengeluaran energi aktif hari ini
            </AppText>
          </View>

          <View className="px-2.5 py-1 rounded-full bg-[#102a1c] border border-[#1d4730]">
            <AppText weight="bold" className="text-[10px] text-[#22c55e]">
              Pedometer Aktif
            </AppText>
          </View>
        </View>

        <View className="flex-row gap-3">
          {/* Steps */}
          <View className="flex-1 p-3 rounded-xl bg-[#0f1b14] border border-[#182d20] justify-between">
            <View>
              <View className="flex-row items-center justify-between mb-1">
                <AppText weight="bold" className="text-[11px] text-[#789182] uppercase">
                  Langkah
                </AppText>
                <AppText weight="bold" className="text-xs text-[#22c55e]">
                  {stepsPct}%
                </AppText>
              </View>

              <View className="flex-row items-baseline gap-1 mb-2">
                <AnimatedNumber
                  value={steps}
                  weight="black"
                  className="text-xl text-white tracking-tight"
                />
                <AppText weight="semibold" className="text-[11px] text-[#789182]">
                  / {stepGoal.toLocaleString("id-ID")}
                </AppText>
              </View>

              <ProgressBar
                progress={stepsPct}
                color="#22c55e"
                backgroundColor="#182d20"
                height={5}
              />
            </View>

            <TouchableOpacity
              onPress={() => addStepsMutation.mutate(500)}
              disabled={addStepsMutation.isPending}
              className="mt-3 py-1.5 px-2.5 rounded-lg bg-[#1a2d23] border border-[#243d2f] items-center justify-center active:bg-[#223a2c]"
              accessibilityRole="button"
              accessibilityLabel="Tambah 500 langkah"
            >
              <AppText weight="bold" className="text-xs text-[#34d399]">
                +500 Langkah
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Active Calories Burned */}
          <View className="flex-1 p-3 rounded-xl bg-[#0f1b14] border border-[#182d20] justify-between">
            <View>
              <View className="flex-row items-center justify-between mb-1">
                <AppText weight="bold" className="text-[11px] text-[#f59e0b] uppercase">
                  Kalori Terbakar
                </AppText>
                <AppText weight="bold" className="text-[10px] text-[#f59e0b]">
                  Aktif
                </AppText>
              </View>

              <View className="flex-row items-baseline gap-1 mb-2">
                <AnimatedNumber
                  value={activeCalories}
                  weight="black"
                  className="text-xl text-white tracking-tight"
                />
                <AppText weight="medium" className="text-[11px] text-[#789182]">
                  kcal
                </AppText>
              </View>
            </View>

            <View className="pt-2 border-t border-[#182d20] mt-auto">
              <AppText weight="medium" className="text-[11px] text-[#789182]">
                35m latihan aktif
              </AppText>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper
      maxWidth={isDesktop ? "wide" : "narrow"}
      className="flex-1 bg-[#0c1510]"
    >
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 12,
          paddingBottom: Platform.OS === "web" ? 56 : 100,
        }}
      >
        {/* TOP HEADER: Clean Minimal Greeting + Search + Avatar */}
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <AppText weight="bold" className="text-xl sm:text-2xl text-white tracking-tight">
              {greetingTime}, {user?.name?.split(" ")[0] || "Daffa"}
            </AppText>
            <AppText weight="medium" className="text-xs text-[#789182] mt-0.5">
              {formattedToday}
            </AppText>
          </View>

          {/* Action Buttons */}
          <View className="flex-row items-center gap-2">
            {/* Search Button */}
            <TouchableOpacity
              onPress={() => router.push("/(app)/(tabs)/meals")}
              className="w-10 h-10 rounded-full bg-[#14221a] border border-[#1e3327] items-center justify-center active:bg-[#1a2d23]"
              accessibilityRole="button"
              accessibilityLabel="Cari Makanan"
            >
              <SearchIconSvg size={16} color="#789182" />
            </TouchableOpacity>

            {/* Profile Avatar */}
            <TouchableOpacity
              onPress={() => router.push("/(app)/(tabs)/profile")}
              className="w-10 h-10 rounded-full bg-[#1a3325] border border-[#2b543c] items-center justify-center active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Buka Profil"
            >
              <AppText weight="bold" className="text-xs text-[#34d399]">
                {userInitials}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* RESPONSIVE LAYOUT */}
        {isDesktop ? (
          <View className="flex-row gap-5 items-start">
            {/* Left Column (60% width) */}
            <View className="flex-1 flex-col gap-4 min-w-0">
              {renderUnifiedEnergyHub()}
              {renderQuickActionDock()}
              {renderVitalityMovementTile()}
            </View>

            {/* Right Column (40% width) */}
            <View className="w-[380px] flex-col gap-4 flex-shrink-0">
              {renderDailyMealJourney()}
            </View>
          </View>
        ) : (
          /* Mobile Focused Stacked Flow (Exact Match to Reference Mockup) */
          <View className="flex-col gap-3.5">
            {renderUnifiedEnergyHub()}
            {renderQuickActionDock()}
            {renderDailyMealJourney()}
            {renderVitalityMovementTile()}
          </View>
        )}
      </ScrollView>

      {/* Modal for quick meal logging */}
      <MealLogModal
        visible={isLogModalVisible}
        meal={selectedMealForLog}
        onClose={() => setIsLogModalVisible(false)}
      />
    </ScreenWrapper>
  );
}
