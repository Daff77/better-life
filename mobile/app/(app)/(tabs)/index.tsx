import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  Platform,
  Image,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AppText,
  ProgressRing,
  ProgressBar,
  AnimatedNumber,
  Badge,
  MealLogModal,
  MealCard,
} from "@/components/ui";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import {
  useJournalStore,
  getTodayDateKey,
  computeJournalAggregates,
} from "@/stores/useJournalStore";
import { useActivityStats, useAddStepsMutation } from "@/hooks/useActivityQuery";
import {
  IconRenderer,
  CloseIconSvg,
  LeafIconSvg,
  ChefHatIconSvg,
  UtensilsIconSvg,
  BookOpenIconSvg,
  BellIconSvg,
  SearchIconSvg,
  ChevronRightIconSvg,
  CrownIconSvg,
} from "@/constants/Assets";
import { MOCK_RECIPES, FoodItem } from "@/data/mockRecipes";

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
    label: "Makan Siang",
    sublabel: "Midday Balance",
    iconName: "Lunch" as const,
    dotColor: "#22c55e",
  },
  {
    id: "Dinner",
    label: "Makan Malam",
    sublabel: "Evening Nourish",
    iconName: "Dinner" as const,
    dotColor: "#818cf8",
  },
  {
    id: "Snack",
    label: "Camilan & Minum",
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
  const isPremium = useSubscriptionStore((state) => state.isPremium);

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

  // Search input state
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      router.push({
        pathname: "/(app)/(tabs)/meals",
        params: { search: searchQuery.trim() },
      });
    } else {
      router.push("/(app)/(tabs)/meals");
    }
  };

  const handleOpenLogModal = (meal: FoodItem) => {
    setSelectedMealForLog(meal);
    setIsLogModalVisible(true);
  };

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
     (No nested cards! Minimalist 3-column macro metrics)
     ------------------------------------------------------------- */
  const renderUnifiedEnergyHub = () => (
    <View className="bg-[#132219] rounded-2xl border border-[#1d3326] p-4 sm:p-5 shadow-sm">
      {/* Top Meta Row: Minimal Status Chip & Target Goal */}
      <View className="flex-row items-center justify-between pb-2.5 mb-2.5 border-b border-[#1a2d22]">
        <View className="px-2.5 py-0.5 rounded-full bg-[#0e2417] border border-[#1d4730] flex-row items-center gap-1.5">
          <View className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
          <AppText weight="bold" className="text-[10px] text-[#34d399]">
            {aggregates.remainingCalories > 0 ? "Pacing optimal" : "Target tercapai"}
          </AppText>
        </View>

        <AppText weight="medium" className="text-xs text-[#7a9485]">
          Target {targetCalories.toLocaleString("id-ID")} kcal
        </AppText>
      </View>

      {/* Main Metric Row: Calorie Remaining + Compact Ring */}
      <View className="flex-row items-center justify-between py-1">
        <View className="flex-1 pr-3">
          <AppText weight="medium" className="text-xs text-[#7a9485] mb-0.5">
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
            <AppText weight="bold" className="text-xs text-[#7a9485]">
              kcal
            </AppText>
          </View>
          <AppText weight="medium" className="text-[11px] text-[#5e7769] mt-1">
            {aggregates.totalConsumed.toLocaleString("id-ID")} dari {targetCalories.toLocaleString("id-ID")} kcal tercatat
          </AppText>
        </View>

        <View className="flex-shrink-0 items-center justify-center">
          <ProgressRing
            progress={progressPercent}
            size={isNarrowMobile ? 62 : 68}
            strokeWidth={7}
            color="#22c55e"
            backgroundColor="#1a2e22"
            textColor="#ffffff"
            label="tercatat"
            labelColor="#7a9485"
          />
        </View>
      </View>

      {/* Single Slim Hairline Progress Bar */}
      <View className="h-1 rounded-full bg-[#1a2e22] overflow-hidden my-3">
        <View
          style={{ width: `${Math.min(100, progressPercent)}%` }}
          className="h-full bg-[#22c55e] rounded-full"
        />
      </View>

      {/* Macro 3-Column Strip (Flat & Minimalist without nested cards) */}
      <View className="flex-row items-center justify-between pt-2.5 border-t border-[#1a2d22]">
        {/* Protein */}
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5 mb-0.5">
            <View className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            <AppText weight="bold" className="text-[11px] text-[#7a9485]">
              Protein
            </AppText>
          </View>
          <AppText
            weight="black"
            className="text-xs sm:text-sm text-white"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {Math.round(aggregates.totalProteinGrams)}{" "}
            <AppText weight="regular" className="text-[10px] text-[#5e7769]">
              / {targetProtein}g
            </AppText>
          </AppText>
          <View className="h-0.5 rounded-full bg-[#1a2e22] overflow-hidden mt-1.5">
            <View style={{ width: `${proteinPct}%` }} className="h-full bg-[#22c55e] rounded-full" />
          </View>
        </View>

        <View className="w-px h-7 bg-[#1a2d22] mx-2.5" />

        {/* Karbo */}
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5 mb-0.5">
            <View className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
            <AppText weight="bold" className="text-[11px] text-[#7a9485]">
              Karbo
            </AppText>
          </View>
          <AppText
            weight="black"
            className="text-xs sm:text-sm text-white"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {Math.round(aggregates.totalCarbsGrams)}{" "}
            <AppText weight="regular" className="text-[10px] text-[#5e7769]">
              / {targetCarbs}g
            </AppText>
          </AppText>
          <View className="h-0.5 rounded-full bg-[#1a2e22] overflow-hidden mt-1.5">
            <View style={{ width: `${carbsPct}%` }} className="h-full bg-[#f59e0b] rounded-full" />
          </View>
        </View>

        <View className="w-px h-7 bg-[#1a2d22] mx-2.5" />

        {/* Lemak */}
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5 mb-0.5">
            <View className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
            <AppText weight="bold" className="text-[11px] text-[#7a9485]">
              Lemak
            </AppText>
          </View>
          <AppText
            weight="black"
            className="text-xs sm:text-sm text-white"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {Math.round(aggregates.totalFatGrams)}{" "}
            <AppText weight="regular" className="text-[10px] text-[#5e7769]">
              / {targetFat}g
            </AppText>
          </AppText>
          <View className="h-0.5 rounded-full bg-[#1a2e22] overflow-hidden mt-1.5">
            <View style={{ width: `${fatPct}%` }} className="h-full bg-[#38bdf8] rounded-full" />
          </View>
        </View>
      </View>
    </View>
  );

  /* -------------------------------------------------------------
     2. QUICK ACTION DOCK (Ergonomic, balanced, tactile)
     ------------------------------------------------------------- */
  const renderQuickActionDock = () => (
    <View className="flex-row items-center gap-2">
      <TouchableOpacity
        onPress={() => router.push("/(app)/(tabs)/meals")}
        activeOpacity={0.8}
        className="flex-[1.3] h-11 px-3 rounded-xl bg-[#22c55e] active:bg-[#16a34a] active:scale-[0.98] transition-transform flex-row items-center justify-center gap-1.5 shadow-xs"
        accessibilityRole="button"
        accessibilityLabel="Catat Makanan"
      >
        <UtensilsIconSvg size={14} color="#081a10" />
        <AppText weight="bold" className="text-[#081a10] text-xs sm:text-sm">
          + Catat Makan
        </AppText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/(app)/(tabs)/recipes")}
        activeOpacity={0.8}
        className="flex-1 h-11 px-3 rounded-xl bg-[#132219] border border-[#1d3326] active:bg-[#182b20] active:scale-[0.98] transition-transform flex-row items-center justify-center gap-1.5"
        accessibilityRole="button"
        accessibilityLabel="Jelajah Resep Sehat"
      >
        <BookOpenIconSvg size={14} color="#34d399" />
        <AppText weight="bold" className="text-[#e5ece7] text-xs sm:text-sm">
          Resep
        </AppText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/(app)/meal-planner")}
        activeOpacity={0.8}
        className="flex-1 h-11 px-3 rounded-xl bg-[#132219] border border-[#1d3326] active:bg-[#182b20] active:scale-[0.98] transition-transform flex-row items-center justify-center gap-1.5"
        accessibilityRole="button"
        accessibilityLabel="Meal Planner 7 Hari"
      >
        <CrownIconSvg size={13} color="#34d399" />
        <AppText weight="bold" className="text-[#e5ece7] text-xs sm:text-sm">
          Plan 7H
        </AppText>
      </TouchableOpacity>
    </View>
  );

  /* -------------------------------------------------------------
     3. DAILY MEAL JOURNEY (Minimalist, flat slot list)
     (No redundant "0 kcal", no clunky square button)
     ------------------------------------------------------------- */
  const renderDailyMealJourney = () => (
    <View className="bg-[#132219] rounded-2xl border border-[#1d3326] p-4 sm:p-5 shadow-sm">
      {/* Header */}
      <View className="flex-row items-center justify-between pb-2.5 mb-1.5 border-b border-[#1a2d22]">
        <View>
          <AppText weight="bold" className="text-sm sm:text-base text-white">
            Jurnal Hari Ini
          </AppText>
          <AppText weight="medium" className="text-[11px] text-[#7a9485]">
            {aggregates.entryCount} makanan tercatat
          </AppText>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(app)/(tabs)/meals")}
          className="flex-row items-center gap-1 py-1 px-2.5 rounded-full bg-[#102417] active:bg-[#173322]"
          accessibilityRole="link"
          accessibilityLabel="Lihat Semua Menu"
        >
          <AppText weight="bold" className="text-xs text-[#34d399]">
            Semua
          </AppText>
          <ChevronRightIconSvg size={11} color="#34d399" />
        </TouchableOpacity>
      </View>

      {/* Slots List */}
      <View className="divide-y divide-[#18281f]">
        {groupedJournal.map((slot) => {
          const hasEntries = slot.entries.length > 0;

          return (
            <View key={slot.id} className="py-2.5">
              {/* Slot Bar */}
              <TouchableOpacity
                onPress={() => handleOpenSlotLog(slot.id, slot.label)}
                activeOpacity={0.7}
                className="flex-row items-center justify-between min-h-[36px]"
                accessibilityRole="button"
                accessibilityLabel={`Catat menu ${slot.label}`}
              >
                <View className="flex-row items-center gap-2 flex-1 min-w-0 mr-2">
                  <View style={{ backgroundColor: slot.dotColor }} className="w-2 h-2 rounded-full flex-shrink-0" />
                  <AppText weight="bold" className="text-xs sm:text-sm text-[#e5ece7]">
                    {slot.label}
                  </AppText>
                  {!hasEntries && (
                    <AppText weight="medium" className="text-[11px] text-[#5e7769] truncate">
                      · Belum ada menu
                    </AppText>
                  )}
                </View>

                {hasEntries ? (
                  <View className="flex-row items-center gap-2 flex-shrink-0">
                    <AppText
                      weight="bold"
                      className="text-xs text-[#34d399]"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {slot.totalCalories} kcal
                    </AppText>
                    <View className="py-1 px-2.5 rounded-lg bg-[#182b20] border border-[#233d2e] items-center justify-center">
                      <AppText weight="bold" className="text-[11px] text-[#34d399]">
                        + Tambah
                      </AppText>
                    </View>
                  </View>
                ) : (
                  <View className="py-1 px-2.5 rounded-lg bg-[#182b20] border border-[#233d2e] items-center justify-center flex-shrink-0">
                    <AppText weight="bold" className="text-[11px] text-[#34d399]">
                      + Catat
                    </AppText>
                  </View>
                )}
              </TouchableOpacity>

              {/* Slot Entries (if any logged) */}
              {hasEntries && (
                <View className="gap-2 mt-2 pt-1">
                  {slot.entries.map((item) => {
                    const matchedRecipe = MOCK_RECIPES.find(
                      (r) =>
                        r.id === item.mealId ||
                        r.title.toLowerCase() === item.title.toLowerCase()
                    );
                    const photoUrl = (item as any).imageUrl || matchedRecipe?.imageUrl;

                    return (
                      <View
                        key={item.id}
                        className="p-2 rounded-xl bg-[#0f1c14] border border-[#182b1f] flex-row items-center justify-between"
                      >
                        <View className="flex-row items-center gap-2 flex-1 mr-2 min-w-0">
                          <View className="w-8 h-8 rounded-lg bg-[#172b1e] overflow-hidden items-center justify-center flex-shrink-0">
                            {photoUrl ? (
                              <Image source={{ uri: photoUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                            ) : (
                              <IconRenderer name={slot.iconName} size={15} color="#34d399" />
                            )}
                          </View>
                          <View className="flex-1 min-w-0">
                            <AppText weight="bold" numberOfLines={1} className="text-xs text-white">
                              {item.title}
                            </AppText>
                            <AppText weight="medium" className="text-[10px] text-[#7a9485] mt-0.5">
                              {item.quantity > 1 ? `${item.quantity}x · ` : ""}P: {item.proteinGrams}g · C: {item.carbsGrams}g · F: {item.fatGrams}g
                            </AppText>
                          </View>
                        </View>

                        <View className="flex-row items-center gap-2 flex-shrink-0">
                          <AppText weight="black" className="text-xs text-[#34d399]" style={{ fontVariant: ["tabular-nums"] }}>
                            +{item.calories} kcal
                          </AppText>
                          <TouchableOpacity
                            onPress={() => handleDeleteEntry(item.id, item.title)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            className="w-6 h-6 rounded-md bg-rose-950/60 border border-rose-900/50 items-center justify-center active:bg-rose-900"
                            accessibilityRole="button"
                            accessibilityLabel={`Hapus ${item.title}`}
                          >
                            <CloseIconSvg size={11} color="#fb7185" strokeWidth={2.4} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

  /* -------------------------------------------------------------
     4. PHYSICAL ACTIVITY & MOVEMENT VITALITY TILE
     ------------------------------------------------------------- */
  const renderVitalityMovementTile = () => {
    const steps = activity?.steps ?? 3420;
    const stepGoal = activity?.stepGoal ?? 6000;
    const stepsPct = Math.min(100, Math.round((steps / stepGoal) * 100));
    const activeCalories = activity?.exerciseCalories ?? 240;
    const activeMinutes = activity?.exerciseDurationMinutes ?? 35;

    return (
      <View className="bg-[#132219] rounded-2xl border border-[#1d3326] p-4 sm:p-5 shadow-sm">
        <View className="flex-row items-center justify-between pb-2.5 mb-2.5 border-b border-[#1a2d22]">
          <View className="flex-row items-center gap-2">
            <IconRenderer name="Shoe" size={15} color="#34d399" />
            <AppText weight="bold" className="text-sm text-white">
              Aktivitas Hari Ini
            </AppText>
          </View>

          <AppText weight="bold" className="text-[11px] text-[#34d399]">
            {stepsPct}% Target
          </AppText>
        </View>

        <View className="flex-row items-center justify-between gap-4">
          {/* Steps Column */}
          <View className="flex-1">
            <AppText weight="medium" className="text-[11px] text-[#7a9485] mb-0.5">
              Langkah
            </AppText>
            <View className="flex-row items-baseline gap-1">
              <AnimatedNumber
                value={steps}
                weight="black"
                className="text-xl sm:text-2xl text-white tracking-tight"
              />
              <AppText weight="medium" className="text-[10px] text-[#5e7769]">
                / {stepGoal.toLocaleString("id-ID")}
              </AppText>
            </View>
            <View className="h-0.5 rounded-full bg-[#1a2e22] overflow-hidden mt-1.5 mb-2.5">
              <View style={{ width: `${stepsPct}%` }} className="h-full bg-[#22c55e] rounded-full" />
            </View>
            <TouchableOpacity
              onPress={() => addStepsMutation.mutate(500)}
              disabled={addStepsMutation.isPending}
              className="py-1 px-2.5 rounded-lg bg-[#182b20] border border-[#233d2e] items-center self-start active:bg-[#203a2b]"
              accessibilityRole="button"
              accessibilityLabel="Tambah 500 langkah"
            >
              <AppText weight="bold" className="text-[11px] text-[#34d399]">
                +500 Langkah
              </AppText>
            </TouchableOpacity>
          </View>

          <View className="w-px h-14 bg-[#1a2d22]" />

          {/* Active Calories Burned Column */}
          <View className="flex-1">
            <AppText weight="medium" className="text-[11px] text-[#7a9485] mb-0.5">
              Kalori Aktif
            </AppText>
            <View className="flex-row items-baseline gap-1">
              <AnimatedNumber
                value={activeCalories}
                weight="black"
                className="text-xl sm:text-2xl text-white tracking-tight"
              />
              <AppText weight="bold" className="text-xs text-[#7a9485]">
                kcal
              </AppText>
            </View>
            <AppText weight="medium" className="text-[11px] text-[#7a9485] mt-2">
              {activeMinutes} menit latihan aktif
            </AppText>
          </View>
        </View>
      </View>
    );
  };

  /* -------------------------------------------------------------
     5. ECOSYSTEM INTELLIGENCE: Meal Planner & Analytics Showcase
     ------------------------------------------------------------- */
  const renderIntelligenceShowcase = () => (
    <View className="bg-[#132219] rounded-2xl border border-[#1d3326] p-4 sm:p-5 shadow-sm">
      <View className="flex-row items-center justify-between pb-2.5 mb-2.5 border-b border-[#1a2d22]">
        <View className="flex-row items-center gap-2">
          <CrownIconSvg size={15} color="#34d399" />
          <AppText weight="bold" className="text-sm text-white">
            Perencanaan & Analitik
          </AppText>
        </View>
        <View className="px-2 py-0.5 rounded-full bg-[#182b20] border border-[#233d2e]">
          <AppText weight="bold" className="text-[10px] text-[#34d399]">
            {isPremium ? "Aktif" : "Premium"}
          </AppText>
        </View>
      </View>

      <View className="flex-col sm:flex-row gap-2.5">
        {/* Gateway 1: Meal Planner 7 Hari */}
        <TouchableOpacity
          onPress={() => router.push("/(app)/meal-planner")}
          activeOpacity={0.7}
          className="flex-1 p-3 rounded-xl bg-[#0f1c14] border border-[#182b1f] active:bg-[#15271c] flex-row items-center justify-between"
        >
          <View className="flex-1 mr-2">
            <AppText weight="bold" className="text-xs sm:text-sm text-white">
              Meal Planner 7 Hari
            </AppText>
            <AppText weight="medium" className="text-[11px] text-[#7a9485] mt-0.5">
              Jadwal menu bergizi sesuai budget pasar
            </AppText>
          </View>
          <ChevronRightIconSvg size={13} color="#34d399" />
        </TouchableOpacity>

        {/* Gateway 2: Advanced Nutrition Analytics */}
        <TouchableOpacity
          onPress={() => router.push("/(app)/analytics")}
          activeOpacity={0.7}
          className="flex-1 p-3 rounded-xl bg-[#0f1c14] border border-[#182b1f] active:bg-[#15271c] flex-row items-center justify-between"
        >
          <View className="flex-1 mr-2">
            <AppText weight="bold" className="text-xs sm:text-sm text-white">
              Tren & Analitik Nutrisi
            </AppText>
            <AppText weight="medium" className="text-[11px] text-[#7a9485] mt-0.5">
              Grafik kalori 7D & 30D, makro, dan serat
            </AppText>
          </View>
          <ChevronRightIconSvg size={13} color="#34d399" />
        </TouchableOpacity>
      </View>
    </View>
  );

  /* -------------------------------------------------------------
     6. CURATED HEALTHY DISHES
     ------------------------------------------------------------- */
  const renderCuratedRecipesDeck = () => (
    <View className="bg-[#132219] rounded-2xl border border-[#1d3326] p-4 sm:p-5 shadow-sm">
      <View className="flex-row items-center justify-between pb-2.5 mb-2.5 border-b border-[#1a2d22]">
        <View className="flex-row items-center gap-2">
          <ChefHatIconSvg size={15} color="#34d399" />
          <AppText weight="bold" className="text-sm text-white">
            Inspirasi Menu Sehat
          </AppText>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(app)/(tabs)/recipes")}
          className="flex-row items-center gap-1 py-1 px-2.5 rounded-full bg-[#102417] active:bg-[#173322]"
          accessibilityRole="link"
          accessibilityLabel="Lihat Semua Resep"
        >
          <AppText weight="bold" className="text-xs text-[#34d399]">
            Semua
          </AppText>
          <ChevronRightIconSvg size={11} color="#34d399" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10 }}
        className="-mx-1 px-1"
      >
        {MOCK_RECIPES.slice(0, 5).map((meal) => (
          <View key={meal.id} className="w-[170px] sm:w-[190px]">
            <MealCard
              title={meal.title}
              mealType={meal.category}
              calories={meal.calories}
              description={meal.description}
              prepTimeMinutes={meal.prepTimeMinutes}
              estimatedCostIdr={meal.estimatedCostIdr}
              imageUrl={meal.imageUrl}
              showLogButton={false}
              onLogMeal={() => handleOpenLogModal(meal)}
              onPress={() =>
                router.push({
                  pathname: "/(app)/recipe-detail",
                  params: { id: meal.id },
                })
              }
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#0c1611]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 12,
          paddingBottom: Platform.OS === "web" ? 56 : 100,
        }}
      >
        {/* TOP HEADER: Greeting + Date + Search Input + Notification + Avatar */}
        <View className="mb-4 flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Greeting Column */}
          <View>
            <AppText weight="black" className="text-xl sm:text-2xl text-white tracking-tight">
              {greetingTime}, {user?.name?.split(" ")[0] || "Daffa"}
            </AppText>
            <View className="flex-row items-center gap-1.5 mt-0.5">
              <View className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
              <AppText weight="medium" className="text-xs text-[#7a9485]">
                {formattedToday} · Target {targetCalories.toLocaleString("id-ID")} kcal
              </AppText>
            </View>
          </View>

          {/* Action Row: Search Input + Bell + Profile Avatar */}
          <View className="flex-row items-center gap-2">
            {/* Search Input */}
            <View className="flex-row items-center bg-[#132219] border border-[#1d3326] rounded-full px-3 py-1.5 flex-1 md:w-[250px]">
              <SearchIconSvg size={14} color="#7a9485" />
              <TextInput
                placeholder="Cari makanan atau resep..."
                placeholderTextColor="#5e7769"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                className="ml-2 flex-1 text-xs text-white font-medium"
                style={{
                  fontFamily: "Akatab-Medium",
                  includeFontPadding: false,
                  ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
                }}
              />
            </View>

            {/* Notification Bell */}
            <TouchableOpacity
              onPress={() =>
                Alert.alert("Notifikasi", "Semua pengingat nutrisi sudah mutakhir!")
              }
              className="w-9 h-9 rounded-full bg-[#132219] border border-[#1d3326] items-center justify-center relative active:bg-[#1a2e22]"
              accessibilityRole="button"
              accessibilityLabel="Notifikasi"
            >
              <BellIconSvg size={16} color="#7a9485" />
              <View className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            </TouchableOpacity>

            {/* Profile Avatar */}
            <TouchableOpacity
              onPress={() => router.push("/(app)/(tabs)/profile")}
              className="w-9 h-9 rounded-full bg-[#183323] items-center justify-center border border-[#2b543c] active:opacity-90"
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
            {/* Left Main Column (60% width) */}
            <View className="flex-1 flex-col gap-4 min-w-0">
              {renderUnifiedEnergyHub()}
              {renderQuickActionDock()}
              {renderCuratedRecipesDeck()}
              {renderIntelligenceShowcase()}
            </View>

            {/* Right Side Column (40% width) */}
            <View className="w-[360px] lg:w-[380px] flex-col gap-4 flex-shrink-0">
              {renderDailyMealJourney()}
              {renderVitalityMovementTile()}
            </View>
          </View>
        ) : (
          /* Mobile Stacked Flow: Compact & Minimalist */
          <View className="flex-col gap-3.5">
            {renderUnifiedEnergyHub()}
            {renderQuickActionDock()}
            {renderDailyMealJourney()}
            {renderVitalityMovementTile()}
            {renderIntelligenceShowcase()}
            {renderCuratedRecipesDeck()}
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
