import React, { useState, useEffect, useMemo } from "react";
import { View, ScrollView, Image, useWindowDimensions, ViewStyle } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AppText,
  ProgressBar,
  ProgressRing,
  AnimatedNumber,
  MealLogModal,
  MealCard,
  PressableScale,
  FadeInView,
  LineIcon,
  LineIconName,
  Surface,
  CardHead,
  RingButton,
  StatusPill,
  MixBar,
  BlockTone,
  ListRow,
  RowIcon,
  PillButton,
  SURFACE_SHADOW,
} from "@/components/ui";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { useJournalStore, getTodayDateKey, computeJournalAggregates } from "@/stores/useJournalStore";
import { useActivityStats, useAddStepsMutation } from "@/hooks/useActivityQuery";
import { Colors } from "@/constants/DesignTokens";
import { MealIllustrations, getMealIllustration } from "@/constants/Assets";
import { NAV_DESKTOP_BREAKPOINT } from "@/components/layout/ResponsiveTabBar";
import { MOCK_RECIPES, FoodItem } from "@/data/mockRecipes";
import { confirmDestructive } from "@/lib/confirm";
import { horizontalScrollTouchProps } from "@/lib/tabSwipeGuard";

/*
 * Home, "Hari ini".
 * - Top 4-Ring Daily Progress Grid: Circular progress diagrams (ProgressRing) for
 *   1) Kcal tersisa, 2) Makanan tercatat, 3) Langkah, and 4) Protein.
 * - Energy & Macro Balance card: Combines a circular calorie gauge with a 4-segment MixBar
 *   and 3-column macro progress breakdown.
 * - Meal slots feature custom editorial food illustrations (Breakfast, Lunch, Dinner, Snacks, Drinks)
 *   framed cleanly inside each card.
 */

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
    icon: "sparkle",
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

  const user = useAuthStore((state) => state.user);
  const personalization = useOnboardingStore((state) => state.personalization);
  const isPremium = useSubscriptionStore((state) => state.isPremium);

  const todayDate = getTodayDateKey();
  const todayJournal = useJournalStore((state) => state.journals[todayDate]);
  const aggregates = useMemo(
    () => computeJournalAggregates(todayJournal, personalization.targetCalories),
    [todayJournal, personalization.targetCalories]
  );

  const activityQuery = useActivityStats();
  const addStepsMutation = useAddStepsMutation();

  const [selectedMealForLog, setSelectedMealForLog] = useState<FoodItem | null>(null);
  const [isLogModalVisible, setIsLogModalVisible] = useState<boolean>(false);

  useEffect(() => {
    if (personalization.targetCalories && personalization.targetCalories > 0) {
      if (todayJournal && todayJournal.targetCalories !== personalization.targetCalories) {
        useJournalStore.getState().setTargetCalories(personalization.targetCalories, todayDate);
      }
    }
  }, [personalization.targetCalories, todayDate, todayJournal?.targetCalories]);

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

  const currentHour = new Date().getHours();
  const greetingTime =
    currentHour < 11 ? "Selamat pagi" : currentHour < 15 ? "Selamat siang" : currentHour < 18 ? "Selamat sore" : "Selamat malam";
  const firstName = user?.name?.split(" ")[0];

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

  const handleDeleteEntry = (entryId: string, title: string) => {
    confirmDestructive("Hapus makanan", `Hapus "${title}" dari jurnal hari ini?`, "Hapus", () => {
      useJournalStore.getState().removeEntry(entryId, todayDate);
    });
  };

  const targetCalories = aggregates.targetCalories || 2253;
  const targetProtein = aggregates.targetProteinGrams || 141;
  const targetCarbs = aggregates.targetCarbsGrams || 282;
  const targetFat = aggregates.targetFatGrams || 63;
  const isOver = aggregates.remainingCalories < 0;

  const steps = activityQuery.data?.steps ?? 0;
  const stepGoal = activityQuery.data?.stepGoal ?? 6000;
  const stepsPct = Math.min(100, Math.round((steps / stepGoal) * 100));

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
      subtitle: `${fmt(aggregates.totalConsumed)} / ${fmt(targetCalories)} kcal`,
      numericValue: Math.abs(aggregates.remainingCalories),
      unit: "kcal",
      progress: clampedCaloriePct,
      color: isOver ? "#c23b2a" : "#0e7a52",
      trackColor: isOver ? "#f9e3de" : "#dfece5",
      icon: "flame" as LineIconName,
      badgeText: `${clampedCaloriePct}%`,
      onPress: () => router.push("/(app)/analytics"),
    },
    {
      key: "meals",
      title: "Makanan tercatat",
      subtitle: `${filledSlotsCount}/4 waktu makan`,
      numericValue: aggregates.entryCount,
      unit: "menu",
      progress: mealsPct,
      color: "#d98218",
      trackColor: "#f5ead8",
      icon: "utensils" as LineIconName,
      badgeText: `${mealsPct}%`,
      onPress: () => router.push("/(app)/(tabs)/meals"),
    },
    {
      key: "steps",
      title: "Langkah",
      subtitle: `Target ${fmt(stepGoal)}`,
      numericValue: steps,
      unit: "",
      progress: stepsPct,
      color: "#1e6f9f",
      trackColor: "#dfeaf2",
      icon: "steps" as LineIconName,
      badgeText: `${stepsPct}%`,
      actionLabel: "+500",
      onActionPress: () => !addStepsMutation.isPending && addStepsMutation.mutate(500),
    },
    {
      key: "protein",
      title: "Protein",
      subtitle: `Target ${targetProtein} g`,
      numericValue: Math.round(aggregates.totalProteinGrams),
      unit: "g",
      progress: proteinPct,
      color: "#15803d",
      trackColor: "#dff0e5",
      icon: "target" as LineIconName,
      badgeText: `${proteinPct}%`,
      onPress: () => router.push("/(app)/analytics"),
    },
  ];

  const renderCircularMetricCard = (item: (typeof ringMetrics)[number]) => (
    <PressableScale
      key={item.key}
      onPress={item.onPress || item.onActionPress}
      pressedScale={0.98}
      className="flex-1 min-w-0 bg-card border border-line rounded-[22px] p-3.5"
      style={{ boxShadow: SURFACE_SHADOW } as ViewStyle}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}: ${item.numericValue} ${item.unit}, progres ${item.progress} persen`}
    >
      <View className="flex-row items-center gap-3">
        {/* Circular Progress Ring Diagram */}
        <ProgressRing
          progress={item.progress}
          size={58}
          strokeWidth={6}
          color={item.color}
          backgroundColor={item.trackColor}
          showPercent={false}
          label=""
        >
          <View className="items-center justify-center">
            <LineIcon name={item.icon} size={14} color={item.color} strokeWidth={2} />
            <AppText
              weight="bold"
              className="text-[10px] mt-0.5"
              style={[tnum, { color: item.color }]}
            >
              {item.badgeText}
            </AppText>
          </View>
        </ProgressRing>

        {/* Value & Label */}
        <View className="flex-1 min-w-0">
          <View className="flex-row items-baseline gap-1 flex-wrap">
            <AnimatedNumber
              value={item.numericValue}
              formatter={fmt}
              animateOnMount
              weight="bold"
              className="text-[20px] sm:text-[22px] text-ink"
              style={[tnum, { letterSpacing: -0.5, lineHeight: 24 }]}
            />
            {Boolean(item.unit) && (
              <AppText weight="semibold" className="text-[11.5px] text-muted">
                {item.unit}
              </AppText>
            )}
          </View>
          <AppText weight="semibold" numberOfLines={1} className="text-[12.5px] text-ink mt-0.5">
            {item.title}
          </AppText>
          <View className="flex-row items-center justify-between mt-0.5 gap-1">
            <AppText
              weight="medium"
              numberOfLines={1}
              className="text-[11px] text-muted flex-1"
              style={tnum}
            >
              {item.subtitle}
            </AppText>
            {item.actionLabel && (
              <PressableScale
                onPress={(e) => {
                  e.stopPropagation?.();
                  item.onActionPress?.();
                }}
                pressedScale={0.93}
                className="px-2 py-0.5 rounded-full bg-primary-light border border-primary/20"
                accessibilityRole="button"
                accessibilityLabel="Tambah 500 langkah"
              >
                <AppText weight="bold" className="text-[10.5px] text-primary-text" style={tnum}>
                  {item.actionLabel}
                </AppText>
              </PressableScale>
            )}
          </View>
        </View>
      </View>
    </PressableScale>
  );

  /* ---------------------------------------------------------------- Head */
  const head = (
    <View className="mb-4">
      <View className="flex-row items-center justify-between gap-3 mb-4">
        <View className="min-w-0 flex-1">
          <AppText weight="medium" className="text-[13px] text-muted capitalize mb-0.5">
            {formattedToday}
          </AppText>
          <AppText
            weight="semibold"
            className="text-[26px] sm:text-[32px] text-ink"
            style={{ letterSpacing: -0.7, lineHeight: 32 }}
            accessibilityRole="header"
          >
            {firstName ? `${greetingTime}, ${firstName}` : greetingTime}
          </AppText>
        </View>

        <View className="flex-row items-center gap-2">
          <PillButton
            label="Catat makan"
            icon="plus"
            variant="primary"
            size="sm"
            onPress={() => router.push("/(app)/(tabs)/meals")}
            accessibilityLabel="Catat makanan"
          />
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

      {/* 4-Ring Daily Progress Grid (Kcal tersisa, Makanan tercatat, Langkah, Protein) */}
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

  /* -------------------------------------------------------------- Energy */
  const kcalProtein = aggregates.totalProteinGrams * 4;
  const kcalCarbs = aggregates.totalCarbsGrams * 4;
  const kcalFat = aggregates.totalFatGrams * 9;
  const remaining = Math.max(0, targetCalories - aggregates.totalConsumed);

  const renderEnergy = () => (
    <Surface>
      <CardHead
        title="Komposisi energi & makro"
        caption={`Distribusi kalori dari target ${fmt(targetCalories)} kcal`}
        right={
          <RingButton accessibilityLabel="Buka tren nutrisi" onPress={() => router.push("/(app)/analytics")} />
        }
      />

      {/* Combined Circular Ring + MixBar Overview */}
      <View className="flex-row items-center gap-4 mb-3.5">
        <ProgressRing
          progress={clampedCaloriePct}
          size={82}
          strokeWidth={8}
          color={isOver ? "#c23b2a" : Colors.primary.DEFAULT}
          backgroundColor={MACRO.track}
          showPercent={false}
          label=""
        >
          <View className="items-center justify-center">
            <AppText weight="bold" className="text-[15px] text-ink" style={tnum}>
              {progressPercent}%
            </AppText>
            <AppText weight="medium" className="text-[9.5px] text-muted">
              tercapai
            </AppText>
          </View>
        </ProgressRing>

        <View className="flex-1 min-w-0">
          <View className="flex-row items-baseline justify-between mb-1.5">
            <View className="flex-row items-baseline gap-1.5">
              <AnimatedNumber
                value={aggregates.totalConsumed}
                formatter={fmt}
                animateOnMount
                weight="bold"
                className="text-[24px] text-ink"
                style={[tnum, { letterSpacing: -0.6, lineHeight: 28 }]}
              />
              <AppText weight="medium" className="text-[12px] text-muted" style={tnum}>
                kcal masuk
              </AppText>
            </View>
            <StatusPill
              label={isOver ? `Lewat ${fmt(Math.abs(aggregates.remainingCalories))}` : `Sisa ${fmt(remaining)}`}
              tone={isOver ? "warn" : "accent"}
              dot={false}
            />
          </View>

          <MixBar
            height={28}
            accessibilityLabel={`Protein ${fmt(kcalProtein)} kcal, karbohidrat ${fmt(kcalCarbs)} kcal, lemak ${fmt(
              kcalFat
            )} kcal, sisa ${fmt(remaining)} kcal`}
            segments={[
              { key: "p", value: kcalProtein, color: MACRO.protein },
              { key: "c", value: kcalCarbs, color: MACRO.carbs },
              { key: "f", value: kcalFat, color: MACRO.fat },
              { key: "r", value: remaining, color: MACRO.track, outlined: true },
            ]}
          />
        </View>
      </View>

      {/* Compact 3-Column Macro Cards */}
      <View className="flex-row gap-2.5 pt-1">
        {[
          {
            label: "Protein",
            value: aggregates.totalProteinGrams,
            target: targetProtein,
            pct: proteinPct,
            color: MACRO.protein,
          },
          {
            label: "Karbo",
            value: aggregates.totalCarbsGrams,
            target: targetCarbs,
            pct: carbsPct,
            color: MACRO.carbs,
          },
          {
            label: "Lemak",
            value: aggregates.totalFatGrams,
            target: targetFat,
            pct: fatPct,
            color: MACRO.fat,
          },
        ].map((m) => (
          <View
            key={m.label}
            className="flex-1 min-w-0 bg-card-2 rounded-[15px] px-3 py-2.5 border border-line"
          >
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center gap-1.5">
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                <AppText weight="semibold" className="text-[11.5px] text-muted">
                  {m.label}
                </AppText>
              </View>
              <AppText weight="bold" className="text-[10.5px] text-muted" style={tnum}>
                {m.pct}%
              </AppText>
            </View>
            <AppText weight="bold" className="text-[14.5px] text-ink mb-1.5" style={tnum}>
              {Math.round(m.value)}
              <AppText weight="medium" className="text-[11.5px] text-muted">
                /{m.target}g
              </AppText>
            </AppText>
            <ProgressBar
              progress={m.pct}
              color={m.color}
              backgroundColor={MACRO.track}
              height={5}
            />
          </View>
        ))}
      </View>
    </Surface>
  );

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
            aggregates.entryCount === 0 ? "Pilih waktu makan untuk mulai mencatat" : `${aggregates.entryCount} makanan tercatat`
          }
          right={<RingButton accessibilityLabel="Lihat semua menu" onPress={() => router.push("/(app)/(tabs)/meals")} />}
        />
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
                      accessibilityLabel={`${slot.label}, ${slot.totalCalories} kalori tercatat. Ketuk untuk mencatat`}
                    >
                      {/* Compact Panoramic Illustration Header (66px height) */}
                      <View className="w-full h-[66px] bg-card-2 relative overflow-hidden">
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

                      {/* Compact Scannable Card Body */}
                      <View className="px-3 py-2.5">
                        <AppText
                          weight="semibold"
                          className="text-[14px] text-ink leading-[18px]"
                        >
                          {slot.label}
                        </AppText>

                        <View className="flex-row items-center justify-between mt-1.5 gap-1">
                          <View className="flex-row items-baseline gap-1 min-w-0 flex-1">
                            <AppText
                              weight="bold"
                              className="text-[17px] text-ink"
                              style={[{ letterSpacing: -0.3 }, tnum]}
                            >
                              {fmt(slot.totalCalories)}
                            </AppText>
                            <AppText weight="semibold" className="text-[11px] text-muted">
                              kcal
                            </AppText>
                          </View>

                          <View
                            className="h-7 px-2.5 rounded-full flex-row items-center gap-1 flex-shrink-0"
                            style={{
                              backgroundColor: Colors.primary.DEFAULT,
                            }}
                          >
                            <LineIcon
                              name="plus"
                              size={12}
                              color="#ffffff"
                              strokeWidth={2.4}
                            />
                            <AppText
                              weight="bold"
                              className="text-[11px] text-white"
                            >
                              Catat
                            </AppText>
                          </View>
                        </View>
                      </View>
                    </PressableScale>
                  </View>
                );
              })}
            </View>
          ))}

          {/* Compact 5th Illustrated Card: Minuman & Smoothies */}
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
            accessibilityLabel="Minuman dan smoothies, ketuk untuk mencatat minuman"
          >
            <View className="w-[72px] h-[56px] rounded-[12px] overflow-hidden bg-card-2 relative flex-shrink-0">
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
                className="text-[12px] text-muted mt-0.5"
                style={tnum}
              >
                {drinkCalories > 0
                  ? `${fmt(drinkCalories)} kcal tercatat (${drinkEntries.length} gelas)`
                  : "Jus buah, kopi, teh, atau smoothie"}
              </AppText>
            </View>

            <View
              className="h-7 px-2.5 rounded-full flex-row items-center gap-1 flex-shrink-0"
              style={{ backgroundColor: Colors.primary.DEFAULT }}
            >
              <LineIcon name="plus" size={12} color="#ffffff" strokeWidth={2.4} />
              <AppText weight="bold" className="text-[11px] text-white">
                Catat
              </AppText>
            </View>
          </PressableScale>
        </View>

        {allEntries.length > 0 && (
          <View className="mt-4">
            <AppText weight="semibold" className="text-[13px] text-muted mb-0.5">
              Tercatat hari ini
            </AppText>
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
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(140)}
                  layout={LinearTransition.duration(220)}
                >
                  <ListRow
                    last={i === allEntries.length - 1}
                    leading={
                      <View className="w-11 h-11 rounded-[12px] bg-card-2 overflow-hidden items-center justify-center flex-shrink-0 border border-line">
                        <Image
                          source={photoUrl ? { uri: photoUrl } : fallbackIllustration}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                      </View>
                    }
                    title={`${item.quantity > 1 ? `${item.quantity}x ` : ""}${item.title}`}
                    caption={`${slot.label} · ${item.calories} kcal · P ${item.proteinGrams} · K ${item.carbsGrams} · L ${item.fatGrams}`}
                    trailing={
                      <RingButton
                        icon="close"
                        accessibilityLabel={`Hapus ${item.title}`}
                        onPress={() => handleDeleteEntry(item.id, item.title)}
                      />
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

  /* ------------------------------------------------------------ Planning */
  const renderPlanning = () => (
    <Surface dense>
      {[
        {
          title: "Rencana makan 7 hari",
          caption: "Menu sesuai target kalori dan budget",
          icon: "calendar" as const,
          onPress: () => router.push("/(app)/meal-planner"),
        },
        {
          title: "Tren nutrisi",
          caption: "Kalori dan makro 7 sampai 30 hari",
          icon: "chart" as const,
          onPress: () => router.push("/(app)/analytics"),
        },
      ].map((row, i) => (
        <ListRow
          key={row.title}
          last={i === 1}
          onPress={row.onPress}
          leading={<RowIcon icon={row.icon} tone="accent" />}
          title={row.title}
          caption={row.caption}
          trailing={
            <View className="flex-row items-center gap-2">
              {!isPremium && <StatusPill label="Premium" tone="warn" dot={false} />}
              <LineIcon name="chevronRight" size={18} color="#7d8781" />
            </View>
          }
        />
      ))}
    </Surface>
  );

  /* --------------------------------------------------------- Inspiration */
  const renderInspiration = () => (
    <View>
      <View className="flex-row items-center justify-between mb-3">
        <AppText weight="semibold" className="text-[18px] text-ink" style={{ letterSpacing: -0.2 }}>
          Inspirasi menu
        </AppText>
        <PillButton label="Semua resep" size="sm" variant="ghost" onPress={() => router.push("/(app)/(tabs)/recipes")} />
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
              showLogButton
              onLogMeal={() => handleOpenLogModal(meal)}
              onPress={() => router.push({ pathname: "/(app)/recipe-detail", params: { id: meal.id } })}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-canvas">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: hasDesktopNav ? 8 : 16, paddingBottom: hasDesktopNav ? 56 : 120 }}
      >
        <FadeInView index={0}>{head}</FadeInView>

        {isWide ? (
          <View className="gap-4">
            <View className="flex-row gap-4 items-start">
              <View className="flex-[7] gap-4 min-w-0">
                <FadeInView index={1}>{renderEnergy()}</FadeInView>
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
            <FadeInView index={3}>{renderPlanning()}</FadeInView>
            <FadeInView index={4} className="mt-2">
              {renderInspiration()}
            </FadeInView>
          </View>
        )}
      </ScrollView>

      <MealLogModal visible={isLogModalVisible} meal={selectedMealForLog} onClose={() => setIsLogModalVisible(false)} />
    </ScreenWrapper>
  );
}
