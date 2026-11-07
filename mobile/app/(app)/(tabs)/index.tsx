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
import { Entitlement } from "@/lib/subscriptionDomain";
import {
  useJournalStore,
  getTodayDateKey,
  computeJournalAggregates,
} from "@/stores/useJournalStore";
import { useActivityStats, useAddStepsMutation } from "@/hooks/useActivityQuery";
import {
  IconRenderer,
  CloseIconSvg,
  CalendarIconSvg,
  LeafIconSvg,
  BowlIconSvg,
  ChefHatIconSvg,
  ZapIconSvg,
  UtensilsIconSvg,
  BookOpenIconSvg,
  BellIconSvg,
  SearchIconSvg,
  ChevronRightIconSvg,
  CrownIconSvg,
  BarChartIconSvg,
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
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-800",
    borderColor: "border-amber-200/50",
    targetRatio: 0.25,
  },
  {
    id: "Lunch",
    label: "Makan Siang",
    sublabel: "Midday Balance",
    iconName: "Lunch" as const,
    dotColor: "#10b981",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800",
    borderColor: "border-emerald-200/50",
    targetRatio: 0.35,
  },
  {
    id: "Dinner",
    label: "Makan Malam",
    sublabel: "Evening Nourish",
    iconName: "Dinner" as const,
    dotColor: "#6366f1",
    badgeBg: "bg-indigo-50",
    badgeText: "text-indigo-800",
    borderColor: "border-indigo-200/50",
    targetRatio: 0.3,
  },
  {
    id: "Snack",
    label: "Camilan & Minum",
    sublabel: "Light Bites",
    iconName: "Snacks" as const,
    dotColor: "#ec4899",
    badgeBg: "bg-pink-50",
    badgeText: "text-pink-800",
    borderColor: "border-pink-200/50",
    targetRatio: 0.1,
  },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isNarrowMobile = width < 360;

  const user = useAuthStore((state) => state.user);
  const personalization = useOnboardingStore((state) => state.personalization);
  const hasEntitlement = useSubscriptionStore((state) => state.hasEntitlement);
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
  const targetCalories = aggregates.targetCalories || 2582;
  const targetProtein = aggregates.targetProteinGrams || 161;
  const targetCarbs = aggregates.targetCarbsGrams || 323;
  const targetFat = aggregates.targetFatGrams || 72;

  const proteinPct = Math.min(100, Math.round((aggregates.totalProteinGrams / targetProtein) * 100));
  const carbsPct = Math.min(100, Math.round((aggregates.totalCarbsGrams / targetCarbs) * 100));
  const fatPct = Math.min(100, Math.round((aggregates.totalFatGrams / targetFat) * 100));

  /* -------------------------------------------------------------
     1. HERO: The Unified Metabolic & Calorie Equilibrium Hub
     ------------------------------------------------------------- */
  const renderUnifiedEnergyHub = () => (
    <View
      className="bg-white rounded-[28px] border border-[#e5ece7] p-5 sm:p-6 relative overflow-hidden"
      style={
        Platform.OS === "web"
          ? ({
              boxShadow: "0 1px 3px rgba(0,0,0,0.02), 0 12px 28px rgba(20,50,25,0.03)",
              borderTopWidth: 1,
              borderTopColor: "rgba(255, 255, 255, 0.9)",
            } as any)
          : undefined
      }
    >
      {/* Subtle organic ambient background tint */}
      <View className="absolute top-0 right-0 w-64 h-64 bg-[#f1f7f2] rounded-full blur-3xl opacity-60 pointer-events-none -mr-16 -mt-16" />

      {/* Top Meta Row: Date tag + Goal Status Pill */}
      <View className="flex-row items-center justify-between pb-3.5 mb-4 border-b border-[#f2f6f3]">
        <View className="flex-row items-center gap-2">
          <View className="w-2 h-2 rounded-full bg-emerald-600" />
          <AppText weight="bold" className="text-xs text-[#1c2a20] tracking-wide uppercase">
            Metabolic Balance
          </AppText>
          <AppText weight="medium" className="text-xs text-neutral-muted">
            · {formattedToday}
          </AppText>
        </View>

        <View className="px-3 py-1 rounded-full bg-[#eaf4ed] border border-[#d2e7d7] flex-row items-center gap-1.5 shadow-2xs">
          <LeafIconSvg size={12} color="#165b33" />
          <AppText weight="bold" className="text-[11px] text-[#165b33]">
            {aggregates.remainingCalories > 0 ? "Pacing Optimal" : "Target Tercapai"}
          </AppText>
        </View>
      </View>

      {/* Central Hero Stats: Big Remaining Calorie Typography + Dynamic Ring */}
      <View className="flex-col sm:flex-row items-center justify-between gap-6 py-2">
        {/* Left: Prominent Display Calorie Counter with Apple Negative Tracking */}
        <View className="flex-1 w-full">
          <AppText weight="medium" className="text-xs text-neutral-muted uppercase tracking-wider mb-1">
            Budget Kalori Tersisa
          </AppText>
          <View className="flex-row items-baseline gap-2">
            <AppText
              weight="black"
              className="text-4xl sm:text-5xl text-[#14261c] leading-none"
              style={{
                fontVariant: ["tabular-nums"],
                letterSpacing: -1.2,
              }}
            >
              {aggregates.remainingCalories.toLocaleString("id-ID")}
            </AppText>
            <AppText weight="bold" className="text-sm text-neutral-muted">
              kcal
            </AppText>
          </View>
          <AppText weight="medium" className="text-xs text-neutral-muted mt-2 leading-relaxed">
            {aggregates.totalConsumed.toLocaleString("id-ID")} kcal tercatat dari target harian {targetCalories.toLocaleString("id-ID")} kcal.
          </AppText>
        </View>

        {/* Right: Circular Visual Gauge */}
        <View className="flex-shrink-0 items-center justify-center">
          <ProgressRing
            progress={progressPercent}
            size={isNarrowMobile ? 104 : 118}
            strokeWidth={11}
            color="#1b5e37"
            backgroundColor="#e8f2eb"
            label={`${progressPercent}%`}
          />
        </View>
      </View>

      {/* Segmented Energy Bar */}
      <View className="mt-4 pt-3 border-t border-[#f2f6f3]">
        <View className="h-2 rounded-full bg-[#ebf2ec] overflow-hidden mb-2">
          <View
            style={{ width: `${Math.min(100, progressPercent)}%` }}
            className="h-full bg-gradient-to-r bg-[#1b5e37] rounded-full"
          />
        </View>
        <View className="flex-row items-center justify-between text-xs">
          <View className="flex-row items-center gap-1.5">
            <AppText weight="bold" className="text-xs text-[#1c2a20]" style={{ fontVariant: ["tabular-nums"] }}>
              {aggregates.totalConsumed.toLocaleString("id-ID")} kcal
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-muted">
              asupan
            </AppText>
          </View>
          <View className="flex-row items-center gap-1.5">
            <AppText weight="bold" className="text-xs text-neutral-muted" style={{ fontVariant: ["tabular-nums"] }}>
              Target {targetCalories.toLocaleString("id-ID")} kcal
            </AppText>
          </View>
        </View>
      </View>

      {/* Integrated Macro Trio Matrix with Concentric Radii */}
      <View className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-4 pt-4 border-t border-[#f2f6f3]">
        {/* Protein */}
        <View className="p-3 rounded-[20px] bg-[#f5faf6] border border-[#d8ece0] flex-col justify-between">
          <View className="flex-row items-center justify-between mb-1.5">
            <AppText weight="bold" className="text-xs text-[#1e4830]">
              Protein
            </AppText>
            <AppText weight="bold" className="text-[10px] text-[#1e4830]" style={{ fontVariant: ["tabular-nums"] }}>
              {proteinPct}%
            </AppText>
          </View>
          <View className="h-1.5 rounded-full bg-[#d8ece0] overflow-hidden mb-2">
            <View style={{ width: `${proteinPct}%` }} className="h-full bg-[#1b5e37] rounded-full" />
          </View>
          <View className="flex-row items-baseline gap-1">
            <AppText weight="black" className="text-base sm:text-lg text-[#14261c]" style={{ fontVariant: ["tabular-nums"] }}>
              {Math.round(aggregates.totalProteinGrams)}
            </AppText>
            <AppText weight="medium" className="text-[10px] text-neutral-muted">
              / {targetProtein}g
            </AppText>
          </View>
        </View>

        {/* Carbs */}
        <View className="p-3 rounded-[20px] bg-[#fffdf5] border border-[#f7eecf] flex-col justify-between">
          <View className="flex-row items-center justify-between mb-1.5">
            <AppText weight="bold" className="text-xs text-[#855307]">
              Karbo
            </AppText>
            <AppText weight="bold" className="text-[10px] text-[#855307]" style={{ fontVariant: ["tabular-nums"] }}>
              {carbsPct}%
            </AppText>
          </View>
          <View className="h-1.5 rounded-full bg-[#f7eecf] overflow-hidden mb-2">
            <View style={{ width: `${carbsPct}%` }} className="h-full bg-[#d97706] rounded-full" />
          </View>
          <View className="flex-row items-baseline gap-1">
            <AppText weight="black" className="text-base sm:text-lg text-[#14261c]" style={{ fontVariant: ["tabular-nums"] }}>
              {Math.round(aggregates.totalCarbsGrams)}
            </AppText>
            <AppText weight="medium" className="text-[10px] text-neutral-muted">
              / {targetCarbs}g
            </AppText>
          </View>
        </View>

        {/* Fats */}
        <View className="p-3 rounded-[20px] bg-[#f5f9fd] border border-[#d6e8fa] flex-col justify-between">
          <View className="flex-row items-center justify-between mb-1.5">
            <AppText weight="bold" className="text-xs text-[#0f4f7d]">
              Lemak
            </AppText>
            <AppText weight="bold" className="text-[10px] text-[#0f4f7d]" style={{ fontVariant: ["tabular-nums"] }}>
              {fatPct}%
            </AppText>
          </View>
          <View className="h-1.5 rounded-full bg-[#d6e8fa] overflow-hidden mb-2">
            <View style={{ width: `${fatPct}%` }} className="h-full bg-[#0284c7] rounded-full" />
          </View>
          <View className="flex-row items-baseline gap-1">
            <AppText weight="black" className="text-base sm:text-lg text-[#14261c]" style={{ fontVariant: ["tabular-nums"] }}>
              {Math.round(aggregates.totalFatGrams)}
            </AppText>
            <AppText weight="medium" className="text-[10px] text-neutral-muted">
              / {targetFat}g
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
        activeOpacity={0.8}
        className="flex-1 min-h-[46px] py-3 px-3.5 rounded-2xl bg-[#1b5e37] active:bg-[#154a2b] active:scale-[0.97] transition-all duration-100 shadow-xs flex-row items-center justify-center gap-2"
        accessibilityRole="button"
        accessibilityLabel="Catat Makanan"
      >
        <UtensilsIconSvg size={16} color="#ffffff" />
        <AppText weight="bold" className="text-white text-xs sm:text-sm">
          Catat Makan
        </AppText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/(app)/(tabs)/recipes")}
        activeOpacity={0.8}
        className="flex-1 min-h-[46px] py-3 px-3.5 rounded-2xl bg-white border border-[#e5ece7] active:bg-[#f6f9f7] active:scale-[0.97] transition-all duration-100 shadow-xs flex-row items-center justify-center gap-2"
        accessibilityRole="button"
        accessibilityLabel="Jelajah Resep Sehat"
      >
        <BookOpenIconSvg size={16} color="#1b5e37" />
        <AppText weight="bold" className="text-[#1c2a20] text-xs sm:text-sm">
          Lihat Resep
        </AppText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/(app)/meal-planner")}
        activeOpacity={0.8}
        className="min-h-[46px] py-3 px-3.5 rounded-2xl bg-[#fdf8ed] border border-[#f3e7c8] active:bg-[#f9f1db] active:scale-[0.97] transition-all duration-100 shadow-xs flex-row items-center justify-center gap-1.5"
        accessibilityRole="button"
        accessibilityLabel="Meal Planner 7 Hari"
      >
        <CrownIconSvg size={15} color="#b45309" />
        <AppText weight="bold" className="text-[#855307] text-xs">
          Plan 7D
        </AppText>
      </TouchableOpacity>
    </View>
  );

  /* -------------------------------------------------------------
     3. DAILY MEAL JOURNEY (Chronological Timeline with Apple Depth)
     ------------------------------------------------------------- */
  const renderDailyMealJourney = () => (
    <View className="bg-white rounded-[28px] border border-[#e5ece7] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_12px_28px_rgba(20,50,25,0.03)]">
      {/* Journal Header */}
      <View className="flex-row items-center justify-between pb-3.5 mb-2 border-b border-[#f2f6f3]">
        <View className="flex-row items-center gap-2.5">
          <View className="w-8 h-8 rounded-xl bg-[#eaf4ed] border border-[#d2e7d7] items-center justify-center shadow-2xs">
            <BowlIconSvg size={18} color="#1b5e37" />
          </View>
          <View>
            <AppText weight="bold" className="text-base text-[#14261c]">
              Jurnal Makan Hari Ini
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-muted">
              {aggregates.entryCount} makanan tercatat · Real-time
            </AppText>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(app)/(tabs)/meals")}
          className="flex-row items-center gap-1 py-1 px-2.5 rounded-full bg-[#f4f7f4] active:bg-[#eaf2ec] active:scale-[0.96] transition-transform"
          accessibilityRole="link"
          accessibilityLabel="Lihat Semua Menu"
        >
          <AppText weight="bold" className="text-xs text-[#1b5e37]">
            Semua
          </AppText>
          <ChevronRightIconSvg size={12} color="#1b5e37" />
        </TouchableOpacity>
      </View>

      {/* Meal Slots List */}
      <View className="divide-y divide-[#f2f6f3]">
        {groupedJournal.map((slot) => {
          const hasEntries = slot.entries.length > 0;

          return (
            <View key={slot.id} className="py-3">
              {/* Slot Bar */}
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <View style={{ backgroundColor: slot.dotColor }} className="w-2.5 h-2.5 rounded-full" />
                  <AppText weight="bold" className="text-xs text-[#1c2a20]">
                    {slot.label}
                  </AppText>
                  <AppText weight="medium" className="text-[11px] text-neutral-muted">
                    · {slot.sublabel}
                  </AppText>
                </View>

                <View className="flex-row items-center gap-2">
                  <AppText
                    weight="bold"
                    className={`text-xs ${hasEntries ? "text-[#1b5e37]" : "text-neutral-400"}`}
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {slot.totalCalories} kcal
                  </AppText>
                  <TouchableOpacity
                    onPress={() => router.push("/(app)/(tabs)/meals")}
                    className="min-h-[28px] px-2.5 rounded-lg bg-[#f0f6f2] border border-[#dbece0] items-center justify-center active:bg-[#e2f1e8] active:scale-[0.96] transition-transform flex-row gap-1"
                    accessibilityRole="button"
                    accessibilityLabel={`Tambah makanan ke ${slot.label}`}
                  >
                    <AppText weight="bold" className="text-[11px] text-[#1b5e37]">
                      + Catat
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Slot Entries */}
              {hasEntries ? (
                <View className="gap-2 mt-1">
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
                        className="p-2.5 rounded-xl bg-[#fafcfa] border border-[#e8f0ea] flex-row items-center justify-between"
                      >
                        <View className="flex-row items-center gap-2.5 flex-1 mr-2 min-w-0">
                          <View className="w-10 h-10 rounded-lg bg-[#ebf4ed] overflow-hidden items-center justify-center flex-shrink-0">
                            {photoUrl ? (
                              <Image source={{ uri: photoUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                            ) : (
                              <IconRenderer name={slot.iconName} size={18} />
                            )}
                          </View>
                          <View className="flex-1 min-w-0">
                            <AppText weight="bold" numberOfLines={1} className="text-xs text-[#1c2a20]">
                              {item.title}
                            </AppText>
                            <AppText weight="medium" className="text-[10px] text-neutral-muted mt-0.5">
                              {item.quantity > 1 ? `${item.quantity} porsi · ` : ""}P: {item.proteinGrams}g · C: {item.carbsGrams}g · F: {item.fatGrams}g
                            </AppText>
                          </View>
                        </View>

                        <View className="flex-row items-center gap-2 flex-shrink-0">
                          <AppText weight="black" className="text-xs text-[#1b5e37]" style={{ fontVariant: ["tabular-nums"] }}>
                            +{item.calories} kcal
                          </AppText>
                          <TouchableOpacity
                            onPress={() => handleDeleteEntry(item.id, item.title)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            className="w-6 h-6 rounded-md bg-rose-50 items-center justify-center active:bg-rose-100"
                            accessibilityRole="button"
                            accessibilityLabel={`Hapus ${item.title}`}
                          >
                            <CloseIconSvg size={11} color="#e11d48" strokeWidth={2.4} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => router.push("/(app)/(tabs)/meals")}
                  className="py-2 px-3 rounded-xl border border-dashed border-[#e0eae2] bg-[#fbfdfb] flex-row items-center justify-between active:bg-[#f2f8f4]"
                >
                  <AppText weight="medium" className="text-[11px] text-neutral-muted">
                    Belum ada menu {slot.label.toLowerCase()} yang dicatat
                  </AppText>
                  <AppText weight="bold" className="text-[11px] text-[#1b5e37]">
                    Pilih menu →
                  </AppText>
                </TouchableOpacity>
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
      <View className="bg-white rounded-[28px] border border-[#e5ece7] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_12px_28px_rgba(20,50,25,0.03)]">
        <View className="flex-row items-center justify-between pb-3 mb-3.5 border-b border-[#f2f6f3]">
          <View className="flex-row items-center gap-2.5">
            <View className="w-8 h-8 rounded-xl bg-[#eaf4ed] border border-[#d2e7d7] items-center justify-center shadow-2xs">
              <IconRenderer name="Shoe" size={18} color="#1b5e37" />
            </View>
            <View>
              <AppText weight="bold" className="text-base text-[#14261c]">
                Aktivitas & Langkah
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted">
                Pengeluaran energi aktif hari ini
              </AppText>
            </View>
          </View>

          <View className="px-2.5 py-0.5 rounded-full bg-[#f2f6f3] border border-[#dce8e0]">
            <AppText weight="bold" className="text-[10px] text-[#1e4830]">
              Pedometer Aktif
            </AppText>
          </View>
        </View>

        <View className="flex-col sm:flex-row gap-3">
          {/* Steps Card */}
          <View className="flex-1 p-3.5 rounded-[20px] bg-[#f7faf8] border border-[#e5ece7] justify-between">
            <View>
              <View className="flex-row items-center justify-between mb-1.5">
                <AppText weight="bold" className="text-xs text-neutral-muted uppercase">
                  Langkah Harian
                </AppText>
                <AppText weight="bold" className="text-xs text-[#1b5e37]">
                  {stepsPct}%
                </AppText>
              </View>

              <View className="flex-row items-baseline gap-1.5 mb-2">
                <AnimatedNumber
                  value={steps}
                  weight="black"
                  className="text-2xl text-[#14261c] tracking-tight"
                />
                <AppText weight="semibold" className="text-xs text-neutral-muted">
                  / {stepGoal.toLocaleString("id-ID")}
                </AppText>
              </View>

              <ProgressBar
                progress={stepsPct}
                color="#1b5e37"
                backgroundColor="#e0eee4"
                height={6}
              />
            </View>

            <TouchableOpacity
              onPress={() => addStepsMutation.mutate(500)}
              disabled={addStepsMutation.isPending}
              className="mt-3.5 py-2 px-3 rounded-xl bg-[#eaf4ed] border border-[#d2e7d7] items-center justify-center active:bg-[#dbeee0] active:scale-[0.96] transition-transform shadow-2xs"
              accessibilityRole="button"
              accessibilityLabel="Tambah 500 langkah"
            >
              <AppText weight="bold" className="text-xs text-[#1b5e37]">
                +500 Langkah
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Active Calories Burned */}
          <View className="flex-1 p-3.5 rounded-[20px] bg-[#fffdf5] border border-[#faedd3] justify-between">
            <View>
              <View className="flex-row items-center justify-between mb-1.5">
                <AppText weight="bold" className="text-xs text-[#855307] uppercase">
                  Kalori Terbakar
                </AppText>
                <View className="flex-row items-center gap-1">
                  <IconRenderer name="Fire" size={13} color="#b45309" />
                  <AppText weight="bold" className="text-[11px] text-[#b45309]">
                    Aktif
                  </AppText>
                </View>
              </View>

              <View className="flex-row items-baseline gap-1.5 mb-2">
                <AnimatedNumber
                  value={activeCalories}
                  weight="black"
                  className="text-2xl text-[#14261c] tracking-tight"
                />
                <AppText weight="medium" className="text-xs text-neutral-muted">
                  kcal
                </AppText>
              </View>
            </View>

            <View className="flex-row items-center pt-2.5 border-t border-[#f7eecf] mt-2">
              <IconRenderer name="Clock" size={14} color="#b45309" className="mr-1.5" />
              <AppText weight="semibold" className="text-xs text-[#855307]">
                {activeMinutes} menit latihan aktif
              </AppText>
            </View>
          </View>
        </View>
      </View>
    );
  };

  /* -------------------------------------------------------------
     5. ECOSYSTEM INTELLIGENCE: Meal Planner & Analytics Showcase
     ------------------------------------------------------------- */
  const renderIntelligenceShowcase = () => (
    <View className="bg-white rounded-[28px] border border-[#e5ece7] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_12px_28px_rgba(20,50,25,0.03)]">
      <View className="flex-row items-center justify-between pb-3.5 mb-3.5 border-b border-[#f2f6f3]">
        <View className="flex-row items-center gap-2.5">
          <View className="w-8 h-8 rounded-xl bg-[#fdf6e7] border border-[#f5e3ba] items-center justify-center shadow-2xs">
            <CrownIconSvg size={18} color="#b45309" />
          </View>
          <View>
            <View className="flex-row items-center gap-2">
              <AppText weight="bold" className="text-base text-[#14261c]">
                Fitur Premium Nutrisi
              </AppText>
              <Badge label={isPremium ? "Aktif" : "Premium"} variant={isPremium ? "primary" : "outline"} />
            </View>
            <AppText weight="medium" className="text-xs text-neutral-muted">
              Perencanaan makan 7 hari dan analitik komprehensif
            </AppText>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push(isPremium ? "/(app)/meal-planner" : "/(app)/upgrade")}
          className="px-3.5 py-1.5 rounded-full bg-[#1b5e37] active:bg-[#154a2b] active:scale-[0.96] transition-transform shadow-2xs"
          accessibilityRole="button"
          accessibilityLabel="Buka Fitur Premium"
        >
          <AppText weight="bold" className="text-xs text-white">
            {isPremium ? "Kelola" : "Buka Akses"}
          </AppText>
        </TouchableOpacity>
      </View>

      <View className="flex-col sm:flex-row gap-3">
        {/* Gateway 1: Meal Planner 7 Hari */}
        <TouchableOpacity
          onPress={() => router.push("/(app)/meal-planner")}
          activeOpacity={0.85}
          className="flex-1 p-4 rounded-[20px] bg-[#fafcfa] border border-[#e3ede6] active:bg-[#f0f6f2] active:scale-[0.985] transition-all flex-col justify-between"
        >
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <AppText weight="bold" className="text-sm text-[#14261c]">
                Meal Planner 7 Hari
              </AppText>
              <ChevronRightIconSvg size={14} color="#1b5e37" />
            </View>
            <AppText weight="medium" className="text-xs text-neutral-muted leading-relaxed">
              Jadwal makan harian otomatis dikalibrasi sesuai budget pasar, preferensi, dan batas alergi.
            </AppText>
          </View>
          <View className="mt-3 pt-2 border-t border-[#ebf2ec] flex-row items-center gap-1.5">
            <CalendarIconSvg size={13} color="#1b5e37" />
            <AppText weight="bold" className="text-[11px] text-[#1b5e37]">
              Jadwal Minggu Ini →
            </AppText>
          </View>
        </TouchableOpacity>

        {/* Gateway 2: Advanced Nutrition Analytics */}
        <TouchableOpacity
          onPress={() => router.push("/(app)/analytics")}
          activeOpacity={0.85}
          className="flex-1 p-4 rounded-[20px] bg-[#fafcfa] border border-[#e3ede6] active:bg-[#f0f6f2] active:scale-[0.985] transition-all flex-col justify-between"
        >
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <AppText weight="bold" className="text-sm text-[#14261c]">
                Analitik Nutrisi & Tren
              </AppText>
              <ChevronRightIconSvg size={14} color="#1b5e37" />
            </View>
            <AppText weight="medium" className="text-xs text-neutral-muted leading-relaxed">
              Pantau tren kalori 7D & 30D, rasio makro, serat pangan, dan pengeluaran belanja makanan.
            </AppText>
          </View>
          <View className="mt-3 pt-2 border-t border-[#ebf2ec] flex-row items-center gap-1.5">
            <BarChartIconSvg size={13} color="#1b5e37" />
            <AppText weight="bold" className="text-[11px] text-[#1b5e37]">
              Lihat Grafik Tren →
            </AppText>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  /* -------------------------------------------------------------
     6. CURATED HEALTHY DISHES (Discovery Carousel with Apple Depth)
     ------------------------------------------------------------- */
  const renderCuratedRecipesDeck = () => (
    <View className="bg-white rounded-[28px] border border-[#e5ece7] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_12px_28px_rgba(20,50,25,0.03)] relative">
      <View className="flex-row items-center justify-between pb-3.5 mb-3.5 border-b border-[#f2f6f3]">
        <View className="flex-row items-center gap-2.5">
          <View className="w-8 h-8 rounded-xl bg-[#eaf4ed] border border-[#d2e7d7] items-center justify-center">
            <ChefHatIconSvg size={18} color="#1b5e37" />
          </View>
          <View>
            <AppText weight="bold" className="text-base text-[#14261c]">
              Inspirasi Menu Sehat
            </AppText>
            <AppText weight="medium" className="text-xs text-neutral-muted">
              Pilihan bergizi sesuai kalori dan bahan lokal
            </AppText>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(app)/(tabs)/recipes")}
          className="flex-row items-center gap-1 py-1 px-2.5 rounded-full bg-[#f4f7f4] active:bg-[#eaf2ec]"
          accessibilityRole="link"
          accessibilityLabel="Lihat Semua Resep"
        >
          <AppText weight="bold" className="text-xs text-[#1b5e37]">
            Semua
          </AppText>
          <ChevronRightIconSvg size={12} color="#1b5e37" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12 }}
        className="-mx-1 px-1"
      >
        {MOCK_RECIPES.slice(0, 5).map((meal) => (
          <View key={meal.id} className="w-[200px] sm:w-[220px]">
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
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#f7faf7]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: Platform.OS === "web" ? 56 : 112,
        }}
      >
        {/* TOP HEADER: Greeting + Date + Search Bar + Notification + Avatar */}
        <View className="mb-5 flex-col md:flex-row md:items-center md:justify-between gap-3.5">
          {/* Greeting Column */}
          <View>
            <AppText weight="black" className="text-2xl sm:text-3xl text-[#14261c] tracking-tight">
              {greetingTime}, {user?.name?.split(" ")[0] || "Daffa"}
            </AppText>
            <View className="flex-row items-center gap-1.5 mt-0.5">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <AppText weight="medium" className="text-xs text-neutral-muted">
                {formattedToday} · Target aktif {targetCalories.toLocaleString("id-ID")} kcal
              </AppText>
            </View>
          </View>

          {/* Action Row: Search Bar + Bell + Profile Avatar */}
          <View className="flex-row items-center gap-2.5">
            {/* Search Input */}
            <View className="flex-row items-center bg-white border border-[#e2eae4] rounded-full px-3.5 py-1.5 flex-1 md:w-[260px] shadow-2xs">
              <SearchIconSvg size={15} color="#607065" />
              <TextInput
                placeholder="Cari makanan atau resep..."
                placeholderTextColor="#8a9a8f"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                className="ml-2 flex-1 text-xs text-[#14261c] font-medium"
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
              className="w-10 h-10 rounded-full bg-white border border-[#e2eae4] items-center justify-center shadow-2xs relative active:bg-[#f4f7f4]"
              accessibilityRole="button"
              accessibilityLabel="Notifikasi"
            >
              <BellIconSvg size={17} color="#35483b" />
              <View className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-600" />
            </TouchableOpacity>

            {/* Profile Avatar */}
            <TouchableOpacity
              onPress={() => router.push("/(app)/(tabs)/profile")}
              className="w-10 h-10 rounded-full bg-[#d6eade] items-center justify-center border border-[#b2d3bf] active:opacity-90 shadow-2xs"
              accessibilityRole="button"
              accessibilityLabel="Buka Profil"
            >
              <AppText weight="bold" className="text-xs text-[#165b33]">
                {userInitials}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* RESPONSIVE LAYOUT */}
        {isDesktop ? (
          <View className="flex-row gap-6 items-start">
            {/* Left Main Column (60% width) */}
            <View className="flex-1 flex-col gap-5 min-w-0">
              {renderUnifiedEnergyHub()}
              {renderQuickActionDock()}
              {renderCuratedRecipesDeck()}
              {renderIntelligenceShowcase()}
            </View>

            {/* Right Side Column (40% width) */}
            <View className="w-[360px] lg:w-[400px] flex-col gap-5 flex-shrink-0">
              {renderDailyMealJourney()}
              {renderVitalityMovementTile()}
            </View>
          </View>
        ) : (
          /* Mobile Stacked Flow */
          <View className="flex-col gap-4">
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
