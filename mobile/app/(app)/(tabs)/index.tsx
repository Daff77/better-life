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
     1. HERO: Minimalist Metabolic & Calorie Hub
     ------------------------------------------------------------- */
  const renderUnifiedEnergyHub = () => (
    <View className="bg-white rounded-2xl border border-[#eaeaea] p-5 sm:p-6">
      {/* Top Meta Row */}
      <View className="flex-row items-center justify-between pb-3.5 mb-3 border-b border-[#f4f4f5]">
        <View>
          <AppText weight="bold" className="text-xs text-[#71717a] uppercase tracking-wider">
            Ringkasan Nutrisi
          </AppText>
          <AppText weight="medium" className="text-[11px] text-[#a1a1aa] mt-0.5">
            {formattedToday}
          </AppText>
        </View>

        <View className="px-2.5 py-1 rounded-md bg-[#f4f4f5] border border-[#e4e4e7]">
          <AppText weight="medium" className="text-[11px] text-[#52525b]">
            {aggregates.remainingCalories > 0 ? "Pacing Optimal" : "Target Tercapai"}
          </AppText>
        </View>
      </View>

      {/* Main Calorie Metric */}
      <View className="py-1">
        <AppText weight="medium" className="text-xs text-[#71717a]">
          Sisa Kalori Harian
        </AppText>
        <View className="flex-row items-baseline gap-2 mt-1">
          <AppText
            weight="black"
            className="text-4xl sm:text-5xl text-[#18181b] tracking-tight leading-none"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {aggregates.remainingCalories.toLocaleString("id-ID")}
          </AppText>
          <AppText weight="medium" className="text-sm text-[#71717a]">
            kcal
          </AppText>
        </View>
        <AppText weight="medium" className="text-xs text-[#71717a] mt-2">
          {aggregates.totalConsumed.toLocaleString("id-ID")} kcal tercatat dari target {targetCalories.toLocaleString("id-ID")} kcal ({progressPercent}%)
        </AppText>
      </View>

      {/* Thin Hairline Progress Bar */}
      <View className="mt-3.5 mb-4">
        <View className="h-1.5 rounded-full bg-[#f4f4f5] overflow-hidden">
          <View
            style={{ width: `${Math.min(100, progressPercent)}%` }}
            className="h-full bg-[#18181b] rounded-full"
          />
        </View>
      </View>

      {/* Minimalist Macro Row */}
      <View className="grid grid-cols-3 gap-3 pt-3.5 border-t border-[#f4f4f5]">
        {/* Protein */}
        <View>
          <AppText weight="medium" className="text-xs text-[#71717a]">
            Protein
          </AppText>
          <View className="flex-row items-baseline gap-1 mt-1 mb-1.5">
            <AppText weight="bold" className="text-base text-[#18181b]" style={{ fontVariant: ["tabular-nums"] }}>
              {Math.round(aggregates.totalProteinGrams)}
            </AppText>
            <AppText weight="medium" className="text-[10px] text-[#a1a1aa]">
              / {targetProtein}g
            </AppText>
          </View>
          <View className="h-1 rounded-full bg-[#f4f4f5] overflow-hidden">
            <View style={{ width: `${proteinPct}%` }} className="h-full bg-[#18181b] rounded-full" />
          </View>
        </View>

        {/* Karbo */}
        <View>
          <AppText weight="medium" className="text-xs text-[#71717a]">
            Karbohidrat
          </AppText>
          <View className="flex-row items-baseline gap-1 mt-1 mb-1.5">
            <AppText weight="bold" className="text-base text-[#18181b]" style={{ fontVariant: ["tabular-nums"] }}>
              {Math.round(aggregates.totalCarbsGrams)}
            </AppText>
            <AppText weight="medium" className="text-[10px] text-[#a1a1aa]">
              / {targetCarbs}g
            </AppText>
          </View>
          <View className="h-1 rounded-full bg-[#f4f4f5] overflow-hidden">
            <View style={{ width: `${carbsPct}%` }} className="h-full bg-[#18181b] rounded-full" />
          </View>
        </View>

        {/* Lemak */}
        <View>
          <AppText weight="medium" className="text-xs text-[#71717a]">
            Lemak
          </AppText>
          <View className="flex-row items-baseline gap-1 mt-1 mb-1.5">
            <AppText weight="bold" className="text-base text-[#18181b]" style={{ fontVariant: ["tabular-nums"] }}>
              {Math.round(aggregates.totalFatGrams)}
            </AppText>
            <AppText weight="medium" className="text-[10px] text-[#a1a1aa]">
              / {targetFat}g
            </AppText>
          </View>
          <View className="h-1 rounded-full bg-[#f4f4f5] overflow-hidden">
            <View style={{ width: `${fatPct}%` }} className="h-full bg-[#18181b] rounded-full" />
          </View>
        </View>
      </View>
    </View>
  );

  /* -------------------------------------------------------------
     2. QUICK ACTION DOCK (Minimalist & Tactile)
     ------------------------------------------------------------- */
  const renderQuickActionDock = () => (
    <View className="flex-row items-center gap-2.5">
      <TouchableOpacity
        onPress={() => router.push("/(app)/(tabs)/meals")}
        activeOpacity={0.8}
        className="flex-1 min-h-[44px] py-2.5 px-3.5 rounded-xl bg-[#18181b] active:bg-[#27272a] active:scale-[0.98] transition-all flex-row items-center justify-center gap-2"
        accessibilityRole="button"
        accessibilityLabel="Catat Makanan"
      >
        <UtensilsIconSvg size={14} color="#ffffff" />
        <AppText weight="bold" className="text-white text-xs sm:text-sm">
          Catat Makan
        </AppText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/(app)/(tabs)/recipes")}
        activeOpacity={0.8}
        className="flex-1 min-h-[44px] py-2.5 px-3.5 rounded-xl bg-white border border-[#eaeaea] active:bg-[#f4f4f5] active:scale-[0.98] transition-all flex-row items-center justify-center gap-2"
        accessibilityRole="button"
        accessibilityLabel="Jelajah Resep Sehat"
      >
        <BookOpenIconSvg size={14} color="#18181b" />
        <AppText weight="bold" className="text-[#18181b] text-xs sm:text-sm">
          Lihat Resep
        </AppText>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/(app)/meal-planner")}
        activeOpacity={0.8}
        className="min-h-[44px] py-2.5 px-3 rounded-xl bg-white border border-[#eaeaea] active:bg-[#f4f4f5] active:scale-[0.98] transition-all flex-row items-center justify-center gap-1.5"
        accessibilityRole="button"
        accessibilityLabel="Meal Planner 7 Hari"
      >
        <CrownIconSvg size={14} color="#71717a" />
        <AppText weight="bold" className="text-[#18181b] text-xs">
          Plan 7D
        </AppText>
      </TouchableOpacity>
    </View>
  );

  /* -------------------------------------------------------------
     3. DAILY MEAL JOURNEY (Minimalist Editorial Timeline)
     ------------------------------------------------------------- */
  const renderDailyMealJourney = () => (
    <View className="bg-white rounded-2xl border border-[#eaeaea] p-5 sm:p-6">
      {/* Journal Header */}
      <View className="flex-row items-center justify-between pb-3.5 mb-2 border-b border-[#f4f4f5]">
        <View>
          <AppText weight="bold" className="text-base text-[#18181b]">
            Jurnal Makan Hari Ini
          </AppText>
          <AppText weight="medium" className="text-xs text-[#71717a]">
            {aggregates.entryCount} makanan tercatat
          </AppText>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(app)/(tabs)/meals")}
          className="py-1 px-3 rounded-md bg-[#f4f4f5] active:bg-[#e4e4e7]"
          accessibilityRole="link"
          accessibilityLabel="Lihat Semua Menu"
        >
          <AppText weight="medium" className="text-xs text-[#18181b]">
            Lihat Semua
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Meal Slots List */}
      <View className="divide-y divide-[#f4f4f5]">
        {groupedJournal.map((slot) => {
          const hasEntries = slot.entries.length > 0;

          return (
            <View key={slot.id} className="py-3">
              {/* Slot Bar */}
              <View className="flex-row items-center justify-between mb-2">
                <View>
                  <AppText weight="bold" className="text-xs text-[#18181b]">
                    {slot.label}
                  </AppText>
                  <AppText weight="medium" className="text-[10px] text-[#a1a1aa]">
                    {slot.sublabel}
                  </AppText>
                </View>

                <View className="flex-row items-center gap-2">
                  <AppText
                    weight="bold"
                    className={`text-xs ${hasEntries ? "text-[#18181b]" : "text-[#a1a1aa]"}`}
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {slot.totalCalories} kcal
                  </AppText>
                  <TouchableOpacity
                    onPress={() => router.push("/(app)/(tabs)/meals")}
                    className="min-h-[26px] px-2.5 rounded-md border border-[#e4e4e7] items-center justify-center active:bg-[#f4f4f5]"
                    accessibilityRole="button"
                    accessibilityLabel={`Tambah makanan ke ${slot.label}`}
                  >
                    <AppText weight="bold" className="text-[11px] text-[#18181b]">
                      + Catat
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Slot Entries */}
              {hasEntries ? (
                <View className="gap-1.5 mt-1">
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
                        className="p-2.5 rounded-xl border border-[#f4f4f5] bg-[#fafafa] flex-row items-center justify-between"
                      >
                        <View className="flex-row items-center gap-2.5 flex-1 mr-2 min-w-0">
                          {photoUrl && (
                            <View className="w-9 h-9 rounded-lg overflow-hidden items-center justify-center flex-shrink-0 border border-[#eaeaea]">
                              <Image source={{ uri: photoUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                            </View>
                          )}
                          <View className="flex-1 min-w-0">
                            <AppText weight="bold" numberOfLines={1} className="text-xs text-[#18181b]">
                              {item.title}
                            </AppText>
                            <AppText weight="medium" className="text-[10px] text-[#71717a] mt-0.5">
                              {item.quantity > 1 ? `${item.quantity}x porsi · ` : ""}P: {item.proteinGrams}g · C: {item.carbsGrams}g · F: {item.fatGrams}g
                            </AppText>
                          </View>
                        </View>

                        <View className="flex-row items-center gap-2 flex-shrink-0">
                          <AppText weight="black" className="text-xs text-[#18181b]" style={{ fontVariant: ["tabular-nums"] }}>
                            {item.calories} kcal
                          </AppText>
                          <TouchableOpacity
                            onPress={() => handleDeleteEntry(item.id, item.title)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            className="w-5 h-5 rounded items-center justify-center active:bg-neutral-200"
                            accessibilityRole="button"
                            accessibilityLabel={`Hapus ${item.title}`}
                          >
                            <CloseIconSvg size={10} color="#71717a" strokeWidth={2.4} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View className="py-1">
                  <AppText weight="medium" className="text-[11px] text-[#a1a1aa]">
                    Belum ada menu {slot.label.toLowerCase()} yang dicatat
                  </AppText>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

  /* -------------------------------------------------------------
     4. PHYSICAL ACTIVITY & MOVEMENT (Minimalist Bento)
     ------------------------------------------------------------- */
  const renderVitalityMovementTile = () => {
    const steps = activity?.steps ?? 3420;
    const stepGoal = activity?.stepGoal ?? 6000;
    const stepsPct = Math.min(100, Math.round((steps / stepGoal) * 100));
    const activeCalories = activity?.exerciseCalories ?? 240;
    const activeMinutes = activity?.exerciseDurationMinutes ?? 35;

    return (
      <View className="bg-white rounded-2xl border border-[#eaeaea] p-5 sm:p-6">
        <View className="flex-row items-center justify-between pb-3 mb-3.5 border-b border-[#f4f4f5]">
          <View>
            <AppText weight="bold" className="text-base text-[#18181b]">
              Aktivitas Fisik
            </AppText>
            <AppText weight="medium" className="text-xs text-[#71717a]">
              Pengeluaran energi aktif hari ini
            </AppText>
          </View>

          <View className="px-2.5 py-0.5 rounded-md bg-[#f4f4f5] border border-[#e4e4e7]">
            <AppText weight="medium" className="text-[10px] text-[#52525b]">
              {activeMinutes}m latihan
            </AppText>
          </View>
        </View>

        <View className="flex-col sm:flex-row gap-3">
          {/* Steps Card */}
          <View className="flex-1 p-4 rounded-xl border border-[#eaeaea] justify-between">
            <View>
              <AppText weight="medium" className="text-xs text-[#71717a]">
                Langkah Harian
              </AppText>
              <View className="flex-row items-baseline gap-1.5 my-1.5">
                <AnimatedNumber
                  value={steps}
                  weight="black"
                  className="text-2xl text-[#18181b] tracking-tight"
                />
                <AppText weight="medium" className="text-xs text-[#a1a1aa]">
                  / {stepGoal.toLocaleString("id-ID")}
                </AppText>
              </View>

              <ProgressBar
                progress={stepsPct}
                color="#18181b"
                backgroundColor="#f4f4f5"
                height={4}
              />
            </View>

            <TouchableOpacity
              onPress={() => addStepsMutation.mutate(500)}
              disabled={addStepsMutation.isPending}
              className="mt-3.5 py-1.5 px-3 rounded-lg border border-[#e4e4e7] items-center justify-center active:bg-[#f4f4f5]"
              accessibilityRole="button"
              accessibilityLabel="Tambah 500 langkah"
            >
              <AppText weight="bold" className="text-xs text-[#18181b]">
                +500 Langkah
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Active Calories Burned */}
          <View className="flex-1 p-4 rounded-xl border border-[#eaeaea] justify-between">
            <View>
              <AppText weight="medium" className="text-xs text-[#71717a]">
                Kalori Terbakar
              </AppText>
              <View className="flex-row items-baseline gap-1.5 my-1.5">
                <AnimatedNumber
                  value={activeCalories}
                  weight="black"
                  className="text-2xl text-[#18181b] tracking-tight"
                />
                <AppText weight="medium" className="text-xs text-[#71717a]">
                  kcal
                </AppText>
              </View>
              <ProgressBar
                progress={Math.min(100, Math.round((activeCalories / 400) * 100))}
                color="#71717a"
                backgroundColor="#f4f4f5"
                height={4}
              />
            </View>

            <View className="mt-3.5 py-1.5 items-center justify-center">
              <AppText weight="medium" className="text-xs text-[#71717a]">
                Pedometer Aktif
              </AppText>
            </View>
          </View>
        </View>
      </View>
    );
  };

  /* -------------------------------------------------------------
     5. ECOSYSTEM INTELLIGENCE (Minimalist Feature Links)
     ------------------------------------------------------------- */
  const renderIntelligenceShowcase = () => (
    <View className="bg-white rounded-2xl border border-[#eaeaea] p-5 sm:p-6">
      <View className="flex-row items-center justify-between pb-3.5 mb-3.5 border-b border-[#f4f4f5]">
        <View>
          <View className="flex-row items-center gap-2">
            <AppText weight="bold" className="text-base text-[#18181b]">
              Fitur Premium
            </AppText>
            <Badge label={isPremium ? "Aktif" : "Premium"} variant={isPremium ? "primary" : "outline"} size="sm" />
          </View>
          <AppText weight="medium" className="text-xs text-[#71717a] mt-0.5">
            Perencanaan makan otomatis & analitik nutrisi
          </AppText>
        </View>

        <TouchableOpacity
          onPress={() => router.push(isPremium ? "/(app)/meal-planner" : "/(app)/upgrade")}
          className="px-3 py-1.5 rounded-lg bg-[#18181b] active:bg-[#27272a]"
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
          className="flex-1 p-4 rounded-xl border border-[#eaeaea] active:bg-[#f4f4f5] flex-col justify-between"
        >
          <View>
            <View className="flex-row items-center justify-between mb-1.5">
              <AppText weight="bold" className="text-sm text-[#18181b]">
                Meal Planner 7 Hari
              </AppText>
              <ChevronRightIconSvg size={14} color="#71717a" />
            </View>
            <AppText weight="medium" className="text-xs text-[#71717a] leading-relaxed">
              Jadwal makan otomatis sesuai budget pasar, target kalori, dan batas alergi.
            </AppText>
          </View>
          <View className="mt-3 pt-2 border-t border-[#f4f4f5]">
            <AppText weight="bold" className="text-[11px] text-[#18181b]">
              Buka Jadwal →
            </AppText>
          </View>
        </TouchableOpacity>

        {/* Gateway 2: Advanced Nutrition Analytics */}
        <TouchableOpacity
          onPress={() => router.push("/(app)/analytics")}
          activeOpacity={0.85}
          className="flex-1 p-4 rounded-xl border border-[#eaeaea] active:bg-[#f4f4f5] flex-col justify-between"
        >
          <View>
            <View className="flex-row items-center justify-between mb-1.5">
              <AppText weight="bold" className="text-sm text-[#18181b]">
                Analitik Nutrisi & Tren
              </AppText>
              <ChevronRightIconSvg size={14} color="#71717a" />
            </View>
            <AppText weight="medium" className="text-xs text-[#71717a] leading-relaxed">
              Pantau tren kalori 7D & 30D, rasio makro, serat pangan, dan pengeluaran belanja.
            </AppText>
          </View>
          <View className="mt-3 pt-2 border-t border-[#f4f4f5]">
            <AppText weight="bold" className="text-[11px] text-[#18181b]">
              Lihat Grafik →
            </AppText>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  /* -------------------------------------------------------------
     6. CURATED HEALTHY DISHES (Minimalist Deck)
     ------------------------------------------------------------- */
  const renderCuratedRecipesDeck = () => (
    <View className="bg-white rounded-2xl border border-[#eaeaea] p-5 sm:p-6">
      <View className="flex-row items-center justify-between pb-3.5 mb-3.5 border-b border-[#f4f4f5]">
        <View>
          <AppText weight="bold" className="text-base text-[#18181b]">
            Inspirasi Menu Sehat
          </AppText>
          <AppText weight="medium" className="text-xs text-[#71717a]">
            Pilihan hidangan bergizi seimbang
          </AppText>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(app)/(tabs)/recipes")}
          className="py-1 px-3 rounded-md bg-[#f4f4f5] active:bg-[#e4e4e7]"
          accessibilityRole="link"
          accessibilityLabel="Lihat Semua Resep"
        >
          <AppText weight="medium" className="text-xs text-[#18181b]">
            Semua
          </AppText>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12 }}
        className="-mx-1 px-1"
      >
        {MOCK_RECIPES.slice(0, 5).map((meal) => (
          <View key={meal.id} className="w-[190px] sm:w-[210px]">
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
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#fafaf9]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: Platform.OS === "web" ? 56 : 112,
        }}
      >
        {/* TOP HEADER: Clean Editorial Header */}
        <View className="mb-5 flex-col md:flex-row md:items-center md:justify-between gap-3">
          <View>
            <AppText weight="medium" className="text-xs text-[#71717a]">
              {formattedToday}
            </AppText>
            <AppText weight="black" className="text-2xl sm:text-3xl text-[#18181b] tracking-tight mt-0.5">
              {greetingTime}, {user?.name?.split(" ")[0] || "Daffa"}
            </AppText>
          </View>

          {/* Action Row: Search Input + Profile Avatar */}
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center bg-white border border-[#eaeaea] rounded-xl px-3 py-2 flex-1 md:w-[250px]">
              <SearchIconSvg size={14} color="#71717a" />
              <TextInput
                placeholder="Cari makanan atau resep..."
                placeholderTextColor="#a1a1aa"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                className="ml-2 flex-1 text-xs text-[#18181b]"
                style={{
                  fontFamily: "Akatab-Medium",
                  includeFontPadding: false,
                  ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
                }}
              />
            </View>

            <TouchableOpacity
              onPress={() => router.push("/(app)/(tabs)/profile")}
              className="w-9 h-9 rounded-full bg-[#18181b] items-center justify-center active:opacity-80"
              accessibilityRole="button"
              accessibilityLabel="Buka Profil"
            >
              <AppText weight="bold" className="text-xs text-white">
                {userInitials}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* RESPONSIVE LAYOUT */}
        {isDesktop ? (
          <View className="flex-row gap-6 items-start">
            {/* Left Main Column (60% width) */}
            <View className="flex-1 flex-col gap-4 min-w-0">
              {renderUnifiedEnergyHub()}
              {renderQuickActionDock()}
              {renderCuratedRecipesDeck()}
              {renderIntelligenceShowcase()}
            </View>

            {/* Right Side Column (40% width) */}
            <View className="w-[360px] lg:w-[400px] flex-col gap-4 flex-shrink-0">
              {renderDailyMealJourney()}
              {renderVitalityMovementTile()}
            </View>
          </View>
        ) : (
          /* Mobile Stacked Flow */
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
