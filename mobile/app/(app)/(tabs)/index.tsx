import React, { useState, useEffect, useMemo } from "react";
import { View, ScrollView, Image, useWindowDimensions, ViewStyle } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AppText,
  ProgressBar,
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
  Stat,
  StatusPill,
  MixBar,
  ColorBlock,
  blockColors,
  BlockTone,
  ListRow,
  RowIcon,
  PillButton,
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

/*
 * Home, "Hari ini".
 * - Focal point: kcal remaining, the number that decides the next meal. It leads the stat row.
 * - Energy card: one segmented bar shows both progress to target and where the calories came from.
 * - Meal slots feature custom editorial food illustrations (Breakfast, Lunch, Dinner, Snacks, Drinks)
 *   framed cleanly inside each card without bottom SVG caption text.
 * - Entries sit under the blocks as ruled rows with their own delete control.
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

  const statItems = [
    {
      icon: "flame" as const,
      accent: true,
      value: fmt(Math.abs(aggregates.remainingCalories)),
      label: isOver ? "kcal di atas target" : "kcal tersisa hari ini",
      tag: isOver ? <StatusPill label="Lewat" tone="warn" dot={false} /> : undefined,
    },
    { icon: "steps" as const, value: fmt(steps), label: `dari ${fmt(stepGoal)} langkah` },
    {
      icon: "utensils" as const,
      value: String(aggregates.entryCount),
      label: "makanan tercatat",
    },
    {
      icon: "target" as const,
      value: `${Math.round(aggregates.totalProteinGrams)} g`,
      label: `protein dari ${targetProtein} g`,
    },
  ];

  /* ---------------------------------------------------------------- Head */
  const head = (
    <View className={isWide ? "flex-row flex-wrap items-center justify-between gap-y-4 gap-x-8 mb-6" : "mb-5"}>
      <View className={`flex-row items-start justify-between gap-3 ${isWide ? "flex-shrink-0" : "mb-5"}`}>
        <View className="min-w-0" style={isWide ? { maxWidth: 320 } : { flex: 1 }}>
          <AppText weight="medium" className="text-[13.5px] text-muted capitalize mb-1">
            {formattedToday}
          </AppText>
          <AppText
            weight="semibold"
            className="text-[28px] sm:text-[34px] text-ink"
            style={{ letterSpacing: -0.8, lineHeight: 34 }}
            accessibilityRole="header"
          >
            {firstName ? `${greetingTime}, ${firstName}` : greetingTime}
          </AppText>
        </View>
        {!hasDesktopNav && (
          <PressableScale
            onPress={() => router.push("/(app)/(tabs)/profile")}
            className="w-11 h-11 rounded-full bg-card border border-line items-center justify-center flex-shrink-0"
            accessibilityRole="button"
            accessibilityLabel="Buka profil"
          >
            <View className="w-[38px] h-[38px] rounded-full bg-primary-light items-center justify-center">
              <AppText weight="bold" className="text-[12px] text-primary-text">
                {userInitials}
              </AppText>
            </View>
          </PressableScale>
        )}
      </View>

      {isWide ? (
        <View className="flex-row flex-wrap items-center gap-x-7 gap-y-3">
          {statItems.slice(0, 3).map((s) => (
            <View key={s.icon}>
              <Stat icon={s.icon} value={s.value} label={s.label} accent={s.accent} tag={s.tag} />
            </View>
          ))}
        </View>
      ) : (
        <View className="gap-3.5">
          {[statItems.slice(0, 2), statItems.slice(2, 4)].map((row, rowIdx) => (
            <View key={rowIdx} className="flex-row gap-3">
              {row.map((s) => (
                <View key={s.icon} className="flex-1 min-w-0">
                  <Stat icon={s.icon} value={s.value} label={s.label} accent={s.accent} tag={s.tag} />
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      <View className={`flex-row items-center gap-2.5 ${isWide ? "ml-auto" : "mt-5"}`}>
        <PillButton
          label="Catat makan"
          icon="plus"
          variant="primary"
          onPress={() => router.push("/(app)/(tabs)/meals")}
          className={isWide ? "" : "flex-1"}
          accessibilityLabel="Catat makanan"
        />
        <PillButton
          label="Rencana"
          icon="calendar"
          onPress={() => router.push("/(app)/meal-planner")}
          accessibilityLabel="Buka rencana makan 7 hari"
        />
      </View>
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
        title="Energi hari ini"
        caption={`Target ${fmt(targetCalories)} kcal`}
        right={
          <RingButton accessibilityLabel="Buka tren nutrisi" onPress={() => router.push("/(app)/analytics")} />
        }
      />
      <View className="flex-row items-baseline flex-wrap gap-x-2.5 mb-3">
        <AnimatedNumber
          value={aggregates.totalConsumed}
          formatter={fmt}
          animateOnMount={false}
          weight="semibold"
          className="text-[32px] sm:text-[34px] text-ink"
          style={[tnum, { letterSpacing: -0.8, lineHeight: 36 }]}
        />
        <AppText weight="medium" className="text-[13px] text-muted" style={tnum}>
          kcal tercatat · {progressPercent}% dari target
        </AppText>
      </View>

      <MixBar
        height={44}
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

      <View className="mt-2">
        {[
          { label: "Protein", value: aggregates.totalProteinGrams, target: targetProtein, color: MACRO.protein },
          { label: "Karbohidrat", value: aggregates.totalCarbsGrams, target: targetCarbs, color: MACRO.carbs },
          { label: "Lemak", value: aggregates.totalFatGrams, target: targetFat, color: MACRO.fat },
        ].map((m, i) => {
          const left = Math.round(m.target - m.value);
          return (
            <ListRow
              key={m.label}
              last={i === 2}
              leading={<View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />}
              title={m.label}
              caption={left > 0 ? `${left} g lagi untuk target` : "Target tercapai"}
              trailing={
                <AppText weight="bold" className="text-[15px] text-ink" style={tnum}>
                  {Math.round(m.value)}
                  <AppText weight="medium" className="text-[13px] text-muted">
                    {" "}
                    / {m.target} g
                  </AppText>
                </AppText>
              }
            />
          );
        })}
      </View>
      <View className="flex-row items-center gap-1.5 mt-1">
        <View className="w-2.5 h-2.5 rounded-full border border-line-2" style={{ backgroundColor: MACRO.track }} />
        <AppText weight="medium" className="text-[12px] text-muted" style={tnum}>
          {isOver ? `Lewat ${fmt(Math.abs(aggregates.remainingCalories))} kcal dari target` : `Sisa ${fmt(remaining)} kcal`}
        </AppText>
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
        /minum|jus|smoothie|kopi|teh|susu|infused/i.test(e.title)
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
              Tercatat
            </AppText>
            {allEntries.map(({ entry: item, slot }, i) => {
              const matchedRecipe = MOCK_RECIPES.find(
                (r) => r.id === item.mealId || r.title.toLowerCase() === item.title.toLowerCase()
              );
              const photoUrl = (item as any).imageUrl || matchedRecipe?.imageUrl;
              const isDrinkEntry =
                item.mealId === "custom-drink" ||
                /minum|jus|smoothie|kopi|teh|susu|infused/i.test(item.title);
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

  /* ------------------------------------------------------------ Activity */
  const renderActivity = () => (
    <Surface>
      <CardHead
        title="Aktivitas"
        caption="Langkah hari ini"
        right={
          !activityQuery.isLoading && !activityQuery.isError ? (
            <PillButton
              label="+500"
              size="sm"
              icon="steps"
              disabled={addStepsMutation.isPending}
              onPress={() => addStepsMutation.mutate(500)}
              accessibilityLabel="Tambah 500 langkah manual"
            />
          ) : undefined
        }
      />
      {activityQuery.isLoading ? (
        <AppText weight="medium" className="text-[13px] text-muted py-2">
          Memuat data langkah...
        </AppText>
      ) : activityQuery.isError ? (
        <View className="flex-row items-center justify-between gap-3">
          <AppText weight="medium" className="text-[13px] text-muted flex-1">
            Data langkah belum bisa dimuat.
          </AppText>
          <PillButton label="Coba lagi" size="sm" icon="refresh" onPress={() => activityQuery.refetch()} />
        </View>
      ) : (
        <>
          <View className="flex-row items-baseline flex-wrap gap-x-2.5">
            <AnimatedNumber
              value={steps}
              formatter={fmt}
              animateOnMount={false}
              weight="semibold"
              className="text-[32px] sm:text-[34px] text-ink"
              style={[tnum, { letterSpacing: -0.8, lineHeight: 36 }]}
            />
            <AppText weight="medium" className="text-[13px] text-muted" style={tnum}>
              dari {fmt(stepGoal)} langkah
            </AppText>
          </View>
          <ProgressBar
            progress={stepsPct}
            color={Colors.primary.DEFAULT}
            backgroundColor={MACRO.track}
            height={10}
            className="mt-3"
            accessibilityLabel={`${stepsPct} persen target langkah`}
          />
          <AppText weight="medium" className="text-[12.5px] text-muted mt-2.5">
            {steps === 0 ? "Belum ada langkah tercatat. Tambah manual dengan +500." : `${stepsPct}% dari target harian`}
          </AppText>
        </>
      )}
    </Surface>
  );

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
                <FadeInView index={3}>{renderActivity()}</FadeInView>
              </View>
              <View className="flex-[5] gap-4 min-w-0">
                <FadeInView index={2}>{renderJournal()}</FadeInView>
                <FadeInView index={4}>{renderPlanning()}</FadeInView>
              </View>
            </View>
            <FadeInView index={5} className="mt-4">
              {renderInspiration()}
            </FadeInView>
          </View>
        ) : (
          <View className="gap-3.5">
            <FadeInView index={1}>{renderEnergy()}</FadeInView>
            <FadeInView index={2}>{renderJournal()}</FadeInView>
            <FadeInView index={3}>{renderActivity()}</FadeInView>
            <FadeInView index={4}>{renderPlanning()}</FadeInView>
            <FadeInView index={5} className="mt-4">
              {renderInspiration()}
            </FadeInView>
          </View>
        )}
      </ScrollView>

      <MealLogModal visible={isLogModalVisible} meal={selectedMealForLog} onClose={() => setIsLogModalVisible(false)} />
    </ScreenWrapper>
  );
}
