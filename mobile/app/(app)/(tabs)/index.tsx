import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ViewStyle,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AppText,
  ProgressBar,
  ProgressRing,
  DonutChart,
  AnimatedNumber,
  MealLogModal,
  MealCard,
  ModalSheet,
  PressableScale,
  FadeInView,
  LineIcon,
  LineIconName,
  Surface,
  CardHead,
  RingButton,
  PillButton,
  StatusPill,
  ColorBlock,
  BlockTone,
  ListRow,
  RowIcon,
  SURFACE_SHADOW,
} from "@/components/ui";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import {
  useJournalStore,
  getTodayDateKey,
  computeJournalAggregates,
} from "@/stores/useJournalStore";
import { useReminderStore } from "@/stores/useReminderStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import {
  useJournalSyncStore,
  getSyncStatusDisplay,
  retryJournalSync,
} from "@/lib/journalSync";
import { computeAdaptiveReminderInsight } from "@/lib/adaptiveReminderDomain";
import { analyticsApi, WeeklySummaryDigest } from "@/lib/api/analyticsApi";
import { useActivityStats, useAddWaterMutation } from "@/hooks/useActivityQuery";
import { useStepTrackerStore } from "@/stores/useStepTrackerStore";
import { Colors } from "@/constants/DesignTokens";
import { MealIllustrations, getMealIllustration } from "@/constants/Assets";
import { NAV_DESKTOP_BREAKPOINT } from "@/components/layout/ResponsiveTabBar";
import { MOCK_RECIPES, FoodItem } from "@/data/mockRecipes";
import { JournalEntry } from "@/lib/schemas";
import { confirmDestructive } from "@/lib/confirm";
import { horizontalScrollTouchProps } from "@/lib/tabSwipeGuard";

const MACRO = Colors.macros;

const MEAL_SLOTS: ReadonlyArray<{
  id: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  label: string;
  subtitle: string;
  icon: LineIconName;
  tone: BlockTone;
  legacyIcon: string;
  illustration: any;
  accentBg: string;
  accentBorder: string;
}> = [
  {
    id: "Breakfast",
    label: "Sarapan",
    subtitle: "Energi pagi",
    icon: "sunrise",
    tone: "amber",
    legacyIcon: "Breakfast",
    illustration: MealIllustrations.Breakfast,
    accentBg: "#fdf8ee",
    accentBorder: "#f3e3be",
  },
  {
    id: "Lunch",
    label: "Makan siang",
    subtitle: "Nutrisi utama",
    icon: "sun",
    tone: "green",
    legacyIcon: "Lunch",
    illustration: MealIllustrations.Lunch,
    accentBg: "#f2faf5",
    accentBorder: "#cde8d8",
  },
  {
    id: "Dinner",
    label: "Makan malam",
    subtitle: "Menu hangat",
    icon: "moon",
    tone: "ink",
    legacyIcon: "Dinner",
    illustration: MealIllustrations.Dinner,
    accentBg: "#f4f6f8",
    accentBorder: "#dce2e8",
  },
  {
    id: "Snack",
    label: "Camilan",
    subtitle: "Selingan sehat",
    icon: "apple",
    tone: "mist",
    legacyIcon: "Snacks",
    illustration: MealIllustrations.Snacks,
    accentBg: "#f5f8f2",
    accentBorder: "#dce6d3",
  },
];

const fmt = (n: number) => Math.round(n).toLocaleString("id-ID");
const tnum = { fontVariant: ["tabular-nums" as const] };

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const hasDesktopNav = width >= NAV_DESKTOP_BREAKPOINT;
  const isWide = width >= 1100;
  const isUltraCompact = width < 360;

  const user = useAuthStore((state) => state.user);
  const personalization = useOnboardingStore((state) => state.personalization);
  const isPremium = useSubscriptionStore((state) => state.isPremium);

  const todayDate = getTodayDateKey();
  const reduceMotion = Boolean(useReducedMotion());
  const journals = useJournalStore((state) => state.journals);
  const lastUndoAction = useJournalStore((state) => state.lastUndoAction);
  const undoLastAction = useJournalStore((state) => state.undoLastAction);
  const dismissUndo = useJournalStore((state) => state.dismissUndo);
  const todayJournal = journals[todayDate];
  const aggregates = useMemo(
    () => computeJournalAggregates(todayJournal, personalization.targetCalories),
    [todayJournal, personalization.targetCalories]
  );

  const syncState = useJournalSyncStore();
  const syncDisplay = getSyncStatusDisplay(syncState.status);

  const mealSlots = useReminderStore((state) => state.mealSlots);
  const masterEnabled = useReminderStore((state) => state.masterEnabled);
  const setMealSlotTime = useReminderStore((state) => state.setMealSlotTime);

  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const favoriteIdSet = useMemo(() => new Set(favorites.map((f) => f.itemId)), [favorites]);

  const activityQuery = useActivityStats();
  const trackingStatus = useStepTrackerStore((state) => state.status);
  const addWaterMutation = useAddWaterMutation();

  const [selectedMealForLog, setSelectedMealForLog] = useState<FoodItem | null>(null);
  const [isLogModalVisible, setIsLogModalVisible] = useState<boolean>(false);

  // Edit existing logged entry state
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Weekly real-data digest
  const [weeklyDigest, setWeeklyDigest] = useState<WeeklySummaryDigest | null>(null);

  useEffect(() => {
    if (personalization.targetCalories && personalization.targetCalories > 0) {
      if (todayJournal && todayJournal.targetCalories !== personalization.targetCalories) {
        useJournalStore.getState().setTargetCalories(personalization.targetCalories, todayDate);
      }
    }
  }, [personalization.targetCalories, todayDate, todayJournal?.targetCalories]);

  useEffect(() => {
    let active = true;
    analyticsApi
      .getWeeklySummary()
      .then((digest) => {
        if (active) setWeeklyDigest(digest);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [journals, personalization.targetCalories, activityQuery.data?.steps, activityQuery.data?.waterGlasses]);

  const adaptiveInsight = useMemo(() => {
    const insight = computeAdaptiveReminderInsight({
      journals,
      mealSlots,
      masterEnabled,
    });
    if (!insight || insight.kind === "on_track") return null;
    return insight;
  }, [journals, mealSlots, masterEnabled]);

  const progressPercent = Math.min(999, Math.round(aggregates.progressRatio * 100));
  const clampedCaloriePct = Math.min(100, Math.max(0, progressPercent));

  const userInitials = useMemo(() => {
    if (!user?.name) return "BL";
    const parts = user.name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return user.name.slice(0, 2).toUpperCase();
  }, [user?.name]);

  const formattedToday = useMemo(
    () => new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }),
    []
  );

  const groupedJournal = useMemo(() => {
    const entries = todayJournal?.entries || [];
    return MEAL_SLOTS.map((slot) => {
      const slotEntries = entries.filter((e) =>
        slot.id === "Snack" ? e.category === "Snack" || (e as any).category === "Drink" : e.category === slot.id
      );
      return {
        ...slot,
        entries: slotEntries,
        totalCalories: slotEntries.reduce((sum, item) => sum + item.calories, 0),
      };
    });
  }, [todayJournal?.entries]);

  const filledSlotsCount = useMemo(
    () => groupedJournal.filter((s) => s.entries.length > 0).length,
    [groupedJournal]
  );

  const allEntries = useMemo(
    () =>
      groupedJournal.flatMap((slot) =>
        slot.entries.map((entry) => ({ entry, slot }))
      ),
    [groupedJournal]
  );

  const handleOpenLogModal = (meal: FoodItem) => {
    setSelectedMealForLog(meal);
    setIsLogModalVisible(true);
  };

  const handleOpenSlotLog = (slotId: string, slotLabel: string, legacyIcon: string) => {
    const isDrink = slotId === "Drink";
    setSelectedMealForLog({
      id: `custom-${slotId.toLowerCase()}`,
      title: isDrink ? "Minuman segar" : `Menu ${slotLabel.toLowerCase()}`,
      category: slotId === "Snack" || isDrink ? "Snack" : (slotId as any),
      calories: isDrink ? 120 : 300,
      description: `Catatan menu untuk ${slotLabel.toLowerCase()}`,
      svgIcon: legacyIcon as any,
      ingredients: [],
      instructions: [],
      nutrition: isDrink
        ? { proteinGrams: 3, carbsGrams: 24, fatGrams: 1, fiberGrams: 3 }
        : { proteinGrams: 20, carbsGrams: 35, fatGrams: 10, fiberGrams: 4 },
      prepTimeMinutes: isDrink ? 5 : 15,
      difficulty: "Easy",
    });
    setIsLogModalVisible(true);
  };

  const handleOpenEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setEditTitle(entry.title);
    setEditQuantity(entry.quantity || 1);
  };

  const handleSaveEditEntry = async () => {
    if (!editingEntry || isSavingEdit) return;
    const cleanedTitle = editTitle.trim();
    if (!cleanedTitle) return;
    setIsSavingEdit(true);
    try {
      await useJournalStore
        .getState()
        .updateEntry(
          editingEntry.id,
          {
            title: cleanedTitle,
            quantity: editQuantity,
          },
          todayDate
        );
      setEditingEntry(null);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteEntry = (entryId: string, title: string) => {
    confirmDestructive("Hapus makanan", `Hapus "${title}" dari jurnal hari ini?`, "Hapus", () => {
      void useJournalStore.getState().removeEntry(entryId, todayDate);
    });
  };

  const handleClearToday = () => {
    confirmDestructive(
      "Reset jurnal hari ini",
      "Semua catatan makanan pada tanggal hari ini akan dikosongkan. Anda masih bisa mengurungkannya sesaat setelah dihapus.",
      "Reset hari ini",
      () => {
        void useJournalStore.getState().clearDay(todayDate);
      }
    );
  };

  const targetCalories = aggregates.targetCalories || 2253;
  const targetProtein = aggregates.targetProteinGrams || 141;
  const targetCarbs = aggregates.targetCarbsGrams || 282;
  const targetFat = aggregates.targetFatGrams || 63;
  const isOver = aggregates.remainingCalories < 0;

  const steps = activityQuery.data?.steps ?? 0;
  const stepGoal = activityQuery.data?.stepGoal ?? 6000;
  const stepsPct = Math.min(100, Math.round((steps / stepGoal) * 100));

  const waterGlasses = activityQuery.data?.waterGlasses ?? 0;
  const waterGoal = activityQuery.data?.waterGoal ?? 8;
  const waterPct = Math.min(100, Math.round((waterGlasses / waterGoal) * 100));

  const mealTargetCount = 4;
  const mealsPct = Math.min(100, Math.round((aggregates.entryCount / mealTargetCount) * 100));
  const proteinPct = Math.min(100, Math.round((aggregates.totalProteinGrams / Math.max(1, targetProtein)) * 100));
  const carbsPct = Math.min(100, Math.round((aggregates.totalCarbsGrams / Math.max(1, targetCarbs)) * 100));
  const fatPct = Math.min(100, Math.round((aggregates.totalFatGrams / Math.max(1, targetFat)) * 100));

  /* -------------------------------------------- 4 Circular Progress Cards */
  const ringMetrics = [
    {
      key: "kcal",
      title: isOver ? "Kcal lewat" : "Kcal tersisa",
      caption: `Target ${fmt(targetCalories)} kcal`,
      numericValue: Math.abs(aggregates.remainingCalories),
      unit: "kcal",
      progress: clampedCaloriePct,
      color: isOver ? "#b91c1c" : "#e04f38",
      trackColor: isOver ? "#fde2e2" : "#fde8e3",
      icon: "flame" as LineIconName,
      onPress: () => router.push("/(app)/analytics"),
    },
    {
      key: "meals",
      title: "Makanan tercatat",
      caption: `${filledSlotsCount}/4 waktu makan`,
      numericValue: aggregates.entryCount,
      unit: "menu",
      progress: mealsPct,
      color: "#d98218",
      trackColor: "#f7ecd8",
      icon: "utensils" as LineIconName,
      onPress: () => router.push("/(app)/(tabs)/meals"),
    },
    {
      key: "steps",
      title: "Langkah",
      caption: activityQuery.isError
        ? "Gagal memuat"
        : trackingStatus === "tracking"
        ? `Otomatis · ${fmt(stepGoal)}`
        : `Target ${fmt(stepGoal)}`,
      numericValue: steps,
      unit: "",
      progress: stepsPct,
      color: "#0e7a52",
      trackColor: "#dfece5",
      icon: "steps" as LineIconName,
      onPress: () => router.push("/(app)/steps"),
    },
    {
      key: "water",
      title: "Air minum",
      caption: `Target ${waterGoal} gelas`,
      numericValue: waterGlasses,
      unit: "gelas",
      progress: waterPct,
      color: "#1e6f9f",
      trackColor: "#dfeaf2",
      icon: "droplet" as LineIconName,
      hasAddAction: true,
      actionLabel: "Tambah 1 gelas air",
      onActionPress: () => !addWaterMutation.isPending && addWaterMutation.mutate(1),
    },
  ];

  const renderCircularMetricCard = (item: (typeof ringMetrics)[number]) => (
    <PressableScale
      key={item.key}
      onPress={item.onPress || item.onActionPress}
      pressedScale={0.98}
      className={`flex-1 min-w-0 bg-card border border-line rounded-[20px] ${
        isUltraCompact ? "p-3" : "p-3.5"
      }`}
      style={{ boxShadow: SURFACE_SHADOW } as ViewStyle}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}: ${item.numericValue} ${item.unit}, ${item.caption}${item.hasAddAction ? `, ${item.actionLabel}` : ""}`}
    >
      <View className="flex-row items-center gap-2">
        <View
          className="w-[26px] h-[26px] rounded-full items-center justify-center flex-shrink-0"
          style={{ backgroundColor: item.trackColor }}
        >
          <LineIcon name={item.icon} size={14} color={item.color} strokeWidth={1.85} />
        </View>
        <AppText weight="semibold" className="text-[12.5px] text-muted flex-1">
          {item.title}
        </AppText>
        {item.hasAddAction && (
          <View
            className="w-[24px] h-[24px] rounded-full items-center justify-center flex-shrink-0"
            style={{ backgroundColor: item.color }}
            accessible={false}
            pointerEvents="none"
          >
            <LineIcon name="plus" size={12} color="#ffffff" strokeWidth={2.5} />
          </View>
        )}
      </View>

      <View className="flex-row items-end justify-between gap-1.5 mt-3">
        <View className="flex-1 min-w-0">
          <View className="flex-row flex-wrap items-baseline gap-x-1">
            <AnimatedNumber
              value={item.numericValue}
              formatter={fmt}
              animateOnMount
              weight="bold"
              className={isUltraCompact ? "text-[18px] text-ink" : "text-[21px] sm:text-[23px] text-ink"}
              style={[tnum, { letterSpacing: -0.6, lineHeight: isUltraCompact ? 22 : 25 }]}
            />
            {Boolean(item.unit) && (
              <AppText weight="semibold" className="text-[11px] text-muted">
                {item.unit}
              </AppText>
            )}
          </View>
          <AppText weight="medium" className="text-[12px] text-muted mt-0.5" style={tnum}>
            {item.caption}
          </AppText>
        </View>

        <View className="flex-shrink-0">
          <ProgressRing
            progress={item.progress}
            size={isUltraCompact ? 38 : 48}
            strokeWidth={isUltraCompact ? 4 : 5}
            color={item.color}
            backgroundColor={item.trackColor}
            showPercent={false}
            label=""
          >
            <AppText
              weight="bold"
              className={isUltraCompact ? "text-[10px]" : "text-[11px]"}
              style={[tnum, { color: item.color }]}
            >
              {item.progress}%
            </AppText>
          </ProgressRing>
        </View>
      </View>
    </PressableScale>
  );

  /* ---------------------------------------------------------------- Head */
  const head = (
    <View className="mb-4">
      <View className="flex-row items-center justify-between gap-3 mb-4">
        <View className="min-w-0 flex-1">
          <AppText weight="medium" className="text-[12.5px] text-muted capitalize mb-0.5">
            {formattedToday}
          </AppText>
          <AppText
            weight="semibold"
            numberOfLines={1}
            className="text-[25px] sm:text-[30px] text-ink"
            style={{ letterSpacing: -0.6, lineHeight: 31 }}
            accessibilityRole="header"
          >
            Hari ini
          </AppText>
        </View>

        <View className="flex-row items-center gap-2">
          <PressableScale
            onPress={() => router.push("/(app)/(tabs)/meals")}
            pressedScale={0.93}
            className="w-10 h-10 rounded-full bg-primary items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Catat makanan"
          >
            <LineIcon name="plus" size={18} color="#ffffff" strokeWidth={2.3} />
          </PressableScale>

          {!hasDesktopNav && (
            <PressableScale
              onPress={() => router.push("/(app)/(tabs)/profile")}
              className="w-10 h-10 rounded-full bg-card border border-line items-center justify-center flex-shrink-0"
              accessibilityRole="button"
              accessibilityLabel="Buka profil"
            >
              <View className="w-[34px] h-[34px] rounded-full bg-primary-light items-center justify-center">
                <AppText weight="bold" className="text-[11.5px] text-primary-text">
                  {userInitials}
                </AppText>
              </View>
            </PressableScale>
          )}
        </View>
      </View>

      {/* 4-Ring Daily Progress Grid */}
      {isWide ? (
        <View className="flex-row gap-3">
          {ringMetrics.map((m) => renderCircularMetricCard(m))}
        </View>
      ) : (
        <View className="gap-2.5">
          <View className="flex-row gap-2.5">
            {ringMetrics.slice(0, 2).map((m) => renderCircularMetricCard(m))}
          </View>
          <View className="flex-row gap-2.5">
            {ringMetrics.slice(2, 4).map((m) => renderCircularMetricCard(m))}
          </View>
        </View>
      )}
    </View>
  );

  /* --------------------------------------------------- Adaptive Callout */
  const renderAdaptiveBanner = () => {
    if (!adaptiveInsight) return null;
    return (
      <ColorBlock tone="amber">
        <View className="flex-row items-center justify-between flex-wrap gap-3">
          <View className="flex-1 min-w-[200px]">
            <AppText weight="bold" className="text-[11px] uppercase tracking-wider text-[#1b1406]/75">
              Pengingat Adaptif
            </AppText>
            <AppText weight="semibold" className="text-[14.5px] text-[#1b1406] mt-0.5">
              {adaptiveInsight.title}
            </AppText>
            <AppText weight="regular" className="text-xs text-[#1b1406]/80 mt-0.5 leading-relaxed">
              {adaptiveInsight.message}
            </AppText>
          </View>
          {adaptiveInsight.actionLabel && (
            <PillButton
              label={adaptiveInsight.actionLabel}
              size="sm"
              variant="dark"
              onPress={() => {
                if (
                  adaptiveInsight.kind === "habit_shift" &&
                  adaptiveInsight.slotId &&
                  adaptiveInsight.suggestedTime
                ) {
                  setMealSlotTime(adaptiveInsight.slotId, adaptiveInsight.suggestedTime);
                } else if (adaptiveInsight.journalCategory) {
                  const slotMatch = MEAL_SLOTS.find((s) => s.id === adaptiveInsight.journalCategory);
                  if (slotMatch) {
                    handleOpenSlotLog(slotMatch.id, slotMatch.label, slotMatch.legacyIcon);
                  } else {
                    router.push("/(app)/(tabs)/meals");
                  }
                } else {
                  router.push("/(app)/(tabs)/meals");
                }
              }}
            />
          )}
        </View>
      </ColorBlock>
    );
  };

  /* -------------------------------------------------------------- Energy */
  const kcalProtein = aggregates.totalProteinGrams * 4;
  const kcalCarbs = aggregates.totalCarbsGrams * 4;
  const kcalFat = aggregates.totalFatGrams * 9;
  const remaining = Math.max(0, targetCalories - aggregates.totalConsumed);

  const renderEnergy = () => {
    const macroRows = [
      { key: "p", label: "Protein", value: aggregates.totalProteinGrams, target: targetProtein, pct: proteinPct, color: MACRO.protein },
      { key: "c", label: "Karbo", value: aggregates.totalCarbsGrams, target: targetCarbs, pct: carbsPct, color: MACRO.carbs },
      { key: "f", label: "Lemak", value: aggregates.totalFatGrams, target: targetFat, pct: fatPct, color: MACRO.fat },
    ];

    return (
      <Surface>
        <CardHead
          title="Energi & makro"
          caption="Komposisi kalori dari makanan hari ini"
          right={
            <RingButton accessibilityLabel="Buka tren nutrisi" onPress={() => router.push("/(app)/analytics")} />
          }
        />

        <View className="flex-row items-center gap-4">
          <DonutChart
            size={128}
            strokeWidth={13}
            total={targetCalories}
            trackColor={MACRO.track}
            accessibilityLabel={`${fmt(aggregates.totalConsumed)} dari ${fmt(targetCalories)} kalori`}
            segments={[
              { key: "p", value: kcalProtein, color: MACRO.protein },
              { key: "c", value: kcalCarbs, color: MACRO.carbs },
              { key: "f", value: kcalFat, color: MACRO.fat },
            ]}
          >
            <AnimatedNumber
              value={aggregates.totalConsumed}
              formatter={fmt}
              animateOnMount
              weight="bold"
              className="text-[22px] text-ink"
              style={[tnum, { letterSpacing: -0.6, lineHeight: 26 }]}
            />
            <AppText weight="medium" className="text-[10.5px] text-muted" style={tnum}>
              dari {fmt(targetCalories)} kcal
            </AppText>
          </DonutChart>

          <View className="flex-1 min-w-0 gap-3">
            {macroRows.map((m) => (
              <View key={m.key}>
                <View className="flex-row items-center justify-between mb-1.5 gap-2">
                  <View className="flex-row items-center gap-1.5 flex-shrink">
                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                    <AppText weight="semibold" className="text-[12.5px] text-ink">
                      {m.label}
                    </AppText>
                  </View>
                  <AppText weight="semibold" className="text-[12px] text-ink" style={tnum}>
                    {Math.round(m.value)}
                    <AppText weight="medium" className="text-[11px] text-muted">
                      /{m.target}g
                    </AppText>
                  </AppText>
                </View>
                <ProgressBar progress={m.pct} color={m.color} backgroundColor={MACRO.track} height={5} />
              </View>
            ))}
          </View>
        </View>

        <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-line">
          <AppText weight="medium" className="text-[12.5px] text-muted" style={tnum}>
            {progressPercent}% target tercapai
          </AppText>
          <StatusPill
            label={isOver ? `Lewat ${fmt(Math.abs(aggregates.remainingCalories))} kcal` : `Sisa ${fmt(remaining)} kcal`}
            tone={isOver ? "warn" : "accent"}
            dot={false}
          />
        </View>
      </Surface>
    );
  };

  /* ------------------------------------------------------------- Journal */
  const renderJournal = () => {
    const slotRows = [groupedJournal.slice(0, 2), groupedJournal.slice(2, 4)];
    const drinkEntries = (todayJournal?.entries || []).filter(
      (e) =>
        (e as any).category === "Drink" ||
        e.mealId === "custom-drink" ||
        /minum|jus|smoothie|kopi|teh|susu|infused|matcha|kelapa|latte|sparkler/i.test(e.title)
    );
    const drinkCalories = drinkEntries.reduce((sum, item) => sum + item.calories, 0);

    return (
      <Surface>
        <CardHead
          title="Jurnal hari ini"
          caption={
            aggregates.entryCount === 0
              ? "Pilih waktu makan untuk mulai mencatat"
              : `${aggregates.entryCount} menu tercatat hari ini`
          }
          right={
            <View className="flex-row items-center gap-2">
              <StatusPill label={syncDisplay.label} tone={syncDisplay.tone} />
              <RingButton
                accessibilityLabel="Lihat semua menu"
                onPress={() => router.push("/(app)/(tabs)/meals")}
              />
            </View>
          }
        />

        {/* Sync Failure Recovery Banner */}
        {syncState.status === "failed" && (
          <View className="mb-3 p-3 rounded-[16px] bg-bad-soft border border-[#f5c2be] flex-row items-center justify-between gap-2.5">
            <View className="flex-1 min-w-0">
              <AppText weight="semibold" className="text-xs text-bad">
                Gagal sinkronisasi ({syncState.failedCount} operasi tertunda)
              </AppText>
              <AppText weight="regular" numberOfLines={2} className="text-[11px] text-ink/80 mt-0.5">
                {syncState.lastError || "Data tetap aman di perangkat. Periksa jaringan lalu coba lagi."}
              </AppText>
            </View>
            <PillButton
              label={syncState.isSyncing ? "Mencoba..." : "Coba lagi"}
              size="sm"
              variant="primary"
              onPress={() => void retryJournalSync()}
              disabled={syncState.isSyncing}
              accessibilityLabel="Coba lagi sinkronisasi jurnal"
            />
          </View>
        )}

        {/* Undo Banner for Delete or Day Reset */}
        {lastUndoAction && (
          <View className="mb-3 p-3 rounded-[16px] bg-block-ink flex-row items-center justify-between gap-2.5">
            <AppText weight="medium" numberOfLines={2} className="text-xs text-white flex-1">
              {lastUndoAction.label}
            </AppText>
            <View className="flex-row items-center gap-1.5">
              <PressableScale
                onPress={() => void undoLastAction()}
                className="px-3 py-1.5 rounded-full bg-primary"
                accessibilityRole="button"
                accessibilityLabel="Urungkan penghapusan jurnal"
              >
                <AppText weight="bold" className="text-xs text-white">
                  Urungkan
                </AppText>
              </PressableScale>
              <PressableScale
                onPress={dismissUndo}
                className="w-7 h-7 rounded-full items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Tutup pesan urungkan"
              >
                <LineIcon name="close" size={14} color="#ffffff" />
              </PressableScale>
            </View>
          </View>
        )}

        <View className="gap-2.5">
          {slotRows.map((row, rowIdx) => (
            <View key={rowIdx} className="flex-row gap-2.5">
              {row.map((slot) => {
                const has = slot.entries.length > 0;
                return (
                  <View key={slot.id} className="flex-1 min-w-0">
                    <PressableScale
                      onPress={() => handleOpenSlotLog(slot.id, slot.label, slot.legacyIcon)}
                      pressedScale={0.98}
                      className="rounded-[18px] overflow-hidden border"
                      style={
                        {
                          backgroundColor: slot.accentBg,
                          borderColor: slot.accentBorder,
                        } as ViewStyle
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`${slot.label}, ${slot.totalCalories} kalori`}
                    >
                      <View className="w-full h-[64px] bg-card-2 relative overflow-hidden">
                        <Image
                          source={slot.illustration}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                        <View
                          className="absolute top-2 left-2 w-6 h-6 rounded-full items-center justify-center"
                          style={{ backgroundColor: "rgba(255, 255, 255, 0.92)" }}
                        >
                          <LineIcon name={slot.icon} size={13} color="#121a16" />
                        </View>
                        {has && (
                          <View
                            className="absolute top-2 right-2 px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: "rgba(18, 26, 22, 0.8)" }}
                          >
                            <AppText
                              weight="semibold"
                              className="text-[10px] text-white"
                              style={tnum}
                            >
                              {slot.entries.length} menu
                            </AppText>
                          </View>
                        )}
                      </View>

                      <View className="px-3 py-2.5 flex-row items-center justify-between gap-2">
                        <View className="flex-1 min-w-0">
                          <AppText
                            weight="semibold"
                            numberOfLines={1}
                            className="text-[13.5px] text-ink leading-[17px]"
                          >
                            {slot.label}
                          </AppText>
                          <AppText
                            weight="medium"
                            numberOfLines={1}
                            className="text-[11.5px] text-muted mt-0.5"
                            style={tnum}
                          >
                            {slot.totalCalories > 0 ? `${fmt(slot.totalCalories)} kcal` : slot.subtitle}
                          </AppText>
                        </View>

                        <View
                          className="w-7 h-7 rounded-full items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: Colors.primary.DEFAULT }}
                        >
                          <LineIcon name="plus" size={14} color="#ffffff" strokeWidth={2.4} />
                        </View>
                      </View>
                    </PressableScale>
                  </View>
                );
              })}
            </View>
          ))}

          {/* 5th Illustrated Card: Minuman */}
          <PressableScale
            onPress={() => handleOpenSlotLog("Drink", "Minuman segar", "Drinks")}
            pressedScale={0.985}
            className="rounded-[18px] overflow-hidden border flex-row items-center p-2.5 pr-3"
            style={
              {
                backgroundColor: "#fdf7f4",
                borderColor: "#f1dcd3",
              } as ViewStyle
            }
            accessibilityRole="button"
            accessibilityLabel="Minuman"
          >
            <View className="w-[68px] h-[52px] rounded-[12px] overflow-hidden bg-card-2 relative flex-shrink-0">
              <Image
                source={MealIllustrations.Drinks}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </View>

            <View className="flex-1 min-w-0 ml-3 mr-2">
              <AppText
                weight="semibold"
                className="text-[14px] text-ink leading-[18px]"
              >
                Minuman & Smoothies
              </AppText>
              <AppText
                weight="medium"
                numberOfLines={1}
                className="text-[12px] text-muted mt-0.5"
                style={tnum}
              >
                {drinkCalories > 0
                  ? `${fmt(drinkCalories)} kcal tercatat (${drinkEntries.length} gelas)`
                  : "Jus buah, kopi, teh, atau smoothie"}
              </AppText>
            </View>

            <View
              className="w-7 h-7 rounded-full items-center justify-center flex-shrink-0"
              style={{ backgroundColor: Colors.primary.DEFAULT }}
            >
              <LineIcon name="plus" size={14} color="#ffffff" strokeWidth={2.4} />
            </View>
          </PressableScale>
        </View>

        {allEntries.length > 0 && (
          <View className="mt-4">
            <View className="flex-row items-center justify-between mb-1">
              <AppText weight="semibold" className="text-[12.5px] text-muted">
                Tercatat hari ini
              </AppText>
              <PressableScale
                onPress={handleClearToday}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Reset jurnal hari ini"
              >
                <AppText weight="semibold" className="text-[12px] text-bad">
                  Reset hari ini
                </AppText>
              </PressableScale>
            </View>
            {allEntries.map(({ entry: item, slot }, i) => {
              const matchedRecipe = MOCK_RECIPES.find(
                (r) => r.id === item.mealId || r.title.toLowerCase() === item.title.toLowerCase()
              );
              const photoUrl = (item as any).imageUrl || matchedRecipe?.imageUrl;
              const isDrinkEntry =
                item.mealId === "custom-drink" ||
                /minum|jus|smoothie|kopi|teh|susu|infused|matcha|kelapa|latte|sparkler/i.test(item.title);
              const fallbackIllustration = isDrinkEntry
                ? MealIllustrations.Drinks
                : getMealIllustration(slot.id);
              return (
                <Animated.View
                  key={item.id}
                  entering={reduceMotion ? undefined : FadeIn.duration(200)}
                  exiting={reduceMotion ? undefined : FadeOut.duration(140)}
                  layout={reduceMotion ? undefined : LinearTransition.duration(220)}
                >
                  <ListRow
                    last={i === allEntries.length - 1}
                    onPress={() => handleOpenEditEntry(item)}
                    leading={
                      <View className="w-10 h-10 rounded-[11px] bg-card-2 overflow-hidden items-center justify-center flex-shrink-0 border border-line">
                        <Image
                          source={photoUrl ? { uri: photoUrl } : fallbackIllustration}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                      </View>
                    }
                    title={`${item.quantity !== 1 ? `${item.quantity}x ` : ""}${item.title}`}
                    caption={`${slot.label} · ${item.calories} kcal · P ${Math.round((item.proteinGrams || 0) * 10) / 10}g · K ${Math.round((item.carbsGrams || 0) * 10) / 10}g · L ${Math.round((item.fatGrams || 0) * 10) / 10}g`}
                    trailing={
                      <View className="flex-row items-center gap-1.5">
                        <RingButton
                          icon="edit"
                          size="sm"
                          accessibilityLabel={`Edit ${item.title}`}
                          onPress={() => handleOpenEditEntry(item)}
                        />
                        <RingButton
                          icon="close"
                          size="sm"
                          accessibilityLabel={`Hapus ${item.title}`}
                          onPress={() => handleDeleteEntry(item.id, item.title)}
                        />
                      </View>
                    }
                  />
                </Animated.View>
              );
            })}
          </View>
        )}
      </Surface>
    );
  };

  /* --------------------------------------------------- 7-Day Real Digest */
  const renderWeeklySummary = () => {
    if (!weeklyDigest) return null;
    const hasLogged = weeklyDigest.loggedDaysCount > 0;
    return (
      <Surface>
        <CardHead
          title="Ringkasan 7 hari"
          caption={`${weeklyDigest.startDate} sampai ${weeklyDigest.endDate} · dari data nyata`}
          right={
            <StatusPill
              tone={hasLogged ? "good" : "plain"}
              label={hasLogged ? `${weeklyDigest.loggedDaysCount}/7 hari aktif` : "Belum ada catatan"}
              dot={false}
            />
          }
        />

        {!hasLogged ? (
          <AppText weight="medium" className="text-[12.5px] text-muted leading-5">
            Belum ada makanan tercatat dalam 7 hari terakhir. Setiap menu yang Anda simpan di jurnal akan langsung dihitung ke dalam rata-rata mingguan di sini.
          </AppText>
        ) : (
          <View className="flex-row flex-wrap gap-2.5">
            <View className="flex-1 min-w-[110px] bg-card-2 border border-line rounded-[15px] p-3">
              <AppText weight="medium" className="text-[11px] text-muted">
                Rata-rata kalori
              </AppText>
              <AppText weight="bold" className="text-[17px] text-ink mt-0.5" style={tnum}>
                {fmt(weeklyDigest.averageDailyCalories)}{" "}
                <AppText weight="medium" className="text-[11px] text-muted">
                  kcal
                </AppText>
              </AppText>
            </View>
            <View className="flex-1 min-w-[110px] bg-card-2 border border-line rounded-[15px] p-3">
              <AppText weight="medium" className="text-[11px] text-muted">
                Rata-rata protein
              </AppText>
              <AppText weight="bold" className="text-[17px] text-primary-text mt-0.5" style={tnum}>
                {weeklyDigest.averageProteinGrams}g{" "}
                <AppText weight="medium" className="text-[11px] text-muted">
                  / hari
                </AppText>
              </AppText>
            </View>
            <View className="flex-1 min-w-[110px] bg-card-2 border border-line rounded-[15px] p-3">
              <AppText weight="medium" className="text-[11px] text-muted">
                Rentetan catat
              </AppText>
              <AppText weight="bold" className="text-[17px] text-ink mt-0.5" style={tnum}>
                {weeklyDigest.currentStreakDays} hari
              </AppText>
            </View>
          </View>
        )}
      </Surface>
    );
  };

  /* ------------------------------------------------------------ Planning */
  const renderPlanning = () => {
    const rows = [
      { title: "Asisten AI", caption: "Tanya nutrisi dan estimasi kalori dari foto", icon: "heart" as const, premiumBadge: false, onPress: () => router.push("/(app)/assistant") },
      {
        title: "Rencana makan 7 hari",
        caption: "Kalender menu sesuai target kalori dan budget",
        icon: "calendar" as const,
        premiumBadge: !isPremium,
        onPress: () => router.push("/(app)/meal-planner"),
      },
      {
        title: "Monitoring & statistik perkembangan",
        caption: "Grafik berat badan, kalori, dan histori menu",
        icon: "chart" as const,
        premiumBadge: false,
        onPress: () => router.push("/(app)/analytics"),
      },
      {
        title: "Komunitas, konsultasi & artikel",
        caption: "Berbagi motivasi, tanya ahli gizi, dan tips sehat",
        icon: "heart" as const,
        premiumBadge: false,
        onPress: () => router.push("/(app)/community"),
      },
    ];

    return (
      <Surface dense>
        {rows.map((row, i) => (
          <ListRow
            key={row.title}
            last={i === rows.length - 1}
            onPress={row.onPress}
            leading={<RowIcon icon={row.icon} tone="accent" />}
            title={row.title}
            caption={row.caption}
            trailing={
              <View className="flex-row items-center gap-2">
                {row.premiumBadge && <StatusPill label="Premium" tone="warn" dot={false} />}
                <LineIcon name="chevronRight" size={18} color="#7d8781" />
              </View>
            }
          />
        ))}
      </Surface>
    );
  };

  /* --------------------------------------------------------- Inspiration */
  const renderInspiration = () => (
    <View>
      <View className="flex-row items-center justify-between mb-3">
        <AppText weight="semibold" className="text-[18px] text-ink" style={{ letterSpacing: -0.2 }}>
          Inspirasi menu
        </AppText>
        <RingButton
          accessibilityLabel="Semua resep"
          onPress={() => router.push("/(app)/(tabs)/recipes")}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
        decelerationRate="fast"
        snapToInterval={hasDesktopNav ? undefined : 222}
        {...horizontalScrollTouchProps}
      >
        {MOCK_RECIPES.slice(0, 8).map((meal) => (
          <View key={meal.id} className="w-[210px]">
            <MealCard
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
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const editPreviewCalories = editingEntry
    ? Math.round(
        (editingEntry.baseCalories ||
          (editingEntry.quantity > 0
            ? editingEntry.calories / editingEntry.quantity
            : editingEntry.calories)) * editQuantity
      )
    : 0;

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-canvas">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: hasDesktopNav ? 8 : 16, paddingBottom: hasDesktopNav ? 56 : 120 }}
      >
        <FadeInView index={0}>{head}</FadeInView>

        {adaptiveInsight && (
          <FadeInView index={1} className="mb-3.5">
            {renderAdaptiveBanner()}
          </FadeInView>
        )}

        {isWide ? (
          <View className="gap-4">
            <View className="flex-row gap-4 items-start">
              <View className="flex-[7] gap-4 min-w-0">
                <FadeInView index={1}>{renderEnergy()}</FadeInView>
                <FadeInView index={2}>{renderWeeklySummary()}</FadeInView>
                <FadeInView index={3}>{renderPlanning()}</FadeInView>
              </View>
              <View className="flex-[5] gap-4 min-w-0">
                <FadeInView index={2}>{renderJournal()}</FadeInView>
              </View>
            </View>
            <FadeInView index={4} className="mt-4">
              {renderInspiration()}
            </FadeInView>
          </View>
        ) : (
          <View className="gap-3.5">
            <FadeInView index={1}>{renderEnergy()}</FadeInView>
            <FadeInView index={2}>{renderJournal()}</FadeInView>
            <FadeInView index={3}>{renderWeeklySummary()}</FadeInView>
            <FadeInView index={4}>{renderPlanning()}</FadeInView>
            <FadeInView index={5} className="mt-2">
              {renderInspiration()}
            </FadeInView>
          </View>
        )}
      </ScrollView>

      <MealLogModal visible={isLogModalVisible} meal={selectedMealForLog} onClose={() => setIsLogModalVisible(false)} />

      {/* Edit Logged Entry Modal */}
      <ModalSheet
        visible={editingEntry !== null}
        onClose={() => !isSavingEdit && setEditingEntry(null)}
        dismissible={!isSavingEdit}
        variant="sheet"
        accessibilityLabel="Edit catatan makan"
        contentClassName="w-full max-w-md bg-card rounded-t-[26px] sm:rounded-[26px] border border-line overflow-hidden"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="w-full"
        >
          {editingEntry && (
            <View className="w-full p-5 pt-2">
              <CardHead
                title="Edit catatan makan"
                caption="Ubah nama menu atau takaran porsi"
                right={
                  <RingButton
                    icon="close"
                    onPress={() => !isSavingEdit && setEditingEntry(null)}
                    accessibilityLabel="Tutup"
                  />
                }
              />

              <View className="gap-3.5">
                <View>
                  <AppText weight="semibold" className="text-[12.5px] text-muted mb-1.5">
                    Nama menu
                  </AppText>
                  <TextInput
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder="Nama makanan"
                    className="h-11 px-3.5 rounded-[14px] bg-card-2 border border-line text-ink text-sm"
                    style={{ fontFamily: "Urbanist-SemiBold" }}
                  />
                </View>

                <View className="flex-row items-center justify-between rounded-[16px] bg-card-2 border border-line px-3.5 py-2.5">
                  <View>
                    <AppText weight="semibold" className="text-[13.5px] text-ink">
                      Jumlah porsi
                    </AppText>
                    <AppText weight="bold" className="text-xs text-primary-text mt-0.5" style={tnum}>
                      Total {editPreviewCalories} kcal
                    </AppText>
                  </View>

                  <View className="flex-row items-center gap-2">
                    <PressableScale
                      onPress={() =>
                        setEditQuantity((q) => Math.max(0.25, Math.round((q - 0.25) * 100) / 100))
                      }
                      className="w-9 h-9 rounded-full bg-card border border-line items-center justify-center"
                      accessibilityRole="button"
                      accessibilityLabel="Kurangi porsi 0.25"
                    >
                      <LineIcon name="minus" size={14} color="#121a16" />
                    </PressableScale>
                    <AppText weight="bold" className="text-[15px] text-ink min-w-[46px] text-center" style={tnum}>
                      {editQuantity}x
                    </AppText>
                    <PressableScale
                      onPress={() =>
                        setEditQuantity((q) => Math.min(10, Math.round((q + 0.25) * 100) / 100))
                      }
                      className="w-9 h-9 rounded-full bg-card border border-line items-center justify-center"
                      accessibilityRole="button"
                      accessibilityLabel="Tambah porsi 0.25"
                    >
                      <LineIcon name="plus" size={14} color="#121a16" />
                    </PressableScale>
                  </View>
                </View>

                <View className="flex-row gap-2.5 pt-1">
                  <PillButton
                    label="Batal"
                    onPress={() => setEditingEntry(null)}
                    disabled={isSavingEdit}
                    className="flex-1"
                  />
                  <PillButton
                    label={isSavingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                    variant="primary"
                    icon="check"
                    onPress={() => void handleSaveEditEntry()}
                    disabled={isSavingEdit || !editTitle.trim()}
                    className="flex-1"
                  />
                </View>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </ModalSheet>
    </ScreenWrapper>
  );
}
