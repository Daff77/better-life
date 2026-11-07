import React, { useState, useEffect, useMemo } from "react";
import { View, ScrollView, Platform, Image, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
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
  PressableScale,
  FadeInView,
  SectionHeader,
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
  PlusIconSvg,
  UtensilsIconSvg,
  BookOpenIconSvg,
  CalendarIconSvg,
  BarChartIconSvg,
  ChevronRightIconSvg,
} from "@/constants/Assets";
import { MOCK_RECIPES, FoodItem } from "@/data/mockRecipes";
import { confirmDestructive } from "@/lib/confirm";

/*
 * Design notes (antislop R-31):
 * - Focal point: remaining kcal. It is the one number that decides the next meal.
 * - Palette: forest #153e28 for progress, sage #52796f and amber #b45309 only as macro hues.
 * - Rhythm: hero and journal are cards; activity and planning sit as flat rows on the canvas,
 *   so the page does not read as a stack of identical boxes.
 * - Motion: sections rise once on mount (stagger 45ms), ring and bars fill with the same
 *   ease-out curve, journal rows fade in and out so logging never jumps.
 */

const MACRO_COLORS = {
  protein: "#153e28",
  carbs: "#52796f",
  fat: "#b45309",
  track: "#eef1ec",
};

const MEAL_SLOTS = [
  { id: "Breakfast", label: "Sarapan", iconName: "Breakfast" as const },
  { id: "Lunch", label: "Makan siang", iconName: "Lunch" as const },
  { id: "Dinner", label: "Makan malam", iconName: "Dinner" as const },
  { id: "Snack", label: "Camilan & minum", iconName: "Snacks" as const },
] as const;

const fmt = (n: number) => Math.round(n).toLocaleString("id-ID");

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isNarrowMobile = width < 360;

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

  const progressPercent = Math.min(100, Math.round(aggregates.progressRatio * 100));

  const userInitials = useMemo(() => {
    if (!user?.name) return "BL";
    const parts = user.name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return user.name.slice(0, 2).toUpperCase();
  }, [user?.name]);

  const formattedToday = useMemo(
    () =>
      new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }),
    []
  );

  const currentHour = new Date().getHours();
  const greetingTime =
    currentHour < 11
      ? "Selamat pagi"
      : currentHour < 15
      ? "Selamat siang"
      : currentHour < 18
      ? "Selamat sore"
      : "Selamat malam";
  const firstName = user?.name?.split(" ")[0];

  const groupedJournal = useMemo(() => {
    const entries = todayJournal?.entries || [];
    return MEAL_SLOTS.map((slot) => {
      const slotEntries = entries.filter((e) =>
        slot.id === "Snack"
          ? e.category === "Snack" || (e as any).category === "Drink"
          : e.category === slot.id
      );
      return {
        ...slot,
        entries: slotEntries,
        totalCalories: slotEntries.reduce((sum, item) => sum + item.calories, 0),
      };
    });
  }, [todayJournal?.entries]);

  const handleOpenLogModal = (meal: FoodItem) => {
    setSelectedMealForLog(meal);
    setIsLogModalVisible(true);
  };

  const handleOpenSlotLog = (slotId: string, slotLabel: string) => {
    setSelectedMealForLog({
      id: `custom-${slotId.toLowerCase()}`,
      title: `Menu ${slotLabel.toLowerCase()}`,
      category: slotId === "Snack" ? "Snack" : (slotId as any),
      calories: 300,
      description: `Catatan menu untuk ${slotLabel.toLowerCase()}`,
      svgIcon: (slotId === "Breakfast"
        ? "Breakfast"
        : slotId === "Lunch"
        ? "Lunch"
        : slotId === "Dinner"
        ? "Dinner"
        : "Snacks") as any,
      ingredients: [],
      instructions: [],
      nutrition: { proteinGrams: 20, carbsGrams: 35, fatGrams: 10, fiberGrams: 4 },
      prepTimeMinutes: 15,
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

  const statusLine =
    aggregates.totalConsumed === 0
      ? "Belum ada catatan hari ini"
      : isOver
      ? `Lewat ${fmt(Math.abs(aggregates.remainingCalories))} kcal dari target`
      : `${fmt(aggregates.totalConsumed)} dari ${fmt(targetCalories)} kcal tercatat`;

  /* 1. Hero: remaining budget is the focal point; macros sit under a hairline. */
  const renderEnergyHub = () => (
    <View className="bg-white rounded-[22px] border border-[#ebe9e2] p-5">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-4 min-w-0">
          <AppText weight="medium" className="text-[13px] text-neutral-muted">
            {isOver ? "Kalori berlebih" : "Kalori tersisa"}
          </AppText>
          <View className="flex-row items-baseline mt-1">
            <AnimatedNumber
              value={Math.abs(aggregates.remainingCalories)}
              formatter={fmt}
              animateOnMount={false}
              weight="black"
              className={`${isNarrowMobile ? "text-[38px]" : "text-[44px]"} leading-none ${
                isOver ? "text-[#b45309]" : "text-neutral-dark"
              }`}
              style={{ fontVariant: ["tabular-nums"], letterSpacing: -1.2 }}
            />
            <AppText weight="bold" className="text-sm text-neutral-muted ml-1.5">
              kcal
            </AppText>
          </View>
          <AppText
            weight="medium"
            className={`text-[13px] mt-2 ${isOver ? "text-[#8a4106]" : "text-neutral-muted"}`}
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {statusLine}
          </AppText>
        </View>

        <ProgressRing
          progress={progressPercent}
          size={isNarrowMobile ? 80 : 92}
          strokeWidth={8}
          color={isOver ? "#b45309" : MACRO_COLORS.protein}
          backgroundColor={MACRO_COLORS.track}
          textColor="#1c201d"
          label="terpenuhi"
          labelColor="#5a625b"
        />
      </View>

      <View className="h-px bg-[#f0eee8] my-4" />

      <View className="flex-row gap-4">
        {[
          { label: "Protein", value: aggregates.totalProteinGrams, target: targetProtein, color: MACRO_COLORS.protein },
          { label: "Karbo", value: aggregates.totalCarbsGrams, target: targetCarbs, color: MACRO_COLORS.carbs },
          { label: "Lemak", value: aggregates.totalFatGrams, target: targetFat, color: MACRO_COLORS.fat },
        ].map((m) => (
          <View key={m.label} className="flex-1 min-w-0">
            <AppText weight="medium" className="text-xs text-neutral-muted">
              {m.label}
            </AppText>
            <AppText
              weight="bold"
              numberOfLines={1}
              className="text-[15px] text-neutral-dark mt-0.5"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {Math.round(m.value)}
              <AppText weight="medium" className="text-xs text-neutral-muted">
                {" "}/ {m.target} g
              </AppText>
            </AppText>
            <ProgressBar
              progress={Math.min(100, (m.value / m.target) * 100)}
              color={m.color}
              backgroundColor={MACRO_COLORS.track}
              height={4}
              className="mt-2"
              accessibilityLabel={`${m.label} ${Math.round(m.value)} dari ${m.target} gram`}
            />
          </View>
        ))}
      </View>
    </View>
  );

  /* 2. Actions: one primary (log), two secondary. Primary is the only filled button on screen. */
  const renderActions = () => (
    <View className="flex-row gap-2">
      <PressableScale
        onPress={() => router.push("/(app)/(tabs)/meals")}
        className="flex-[1.4] h-12 rounded-2xl bg-primary flex-row items-center justify-center gap-2"
        accessibilityRole="button"
        accessibilityLabel="Catat makanan"
      >
        <UtensilsIconSvg size={16} color="#ffffff" />
        <AppText weight="bold" className="text-white text-sm">
          Catat makan
        </AppText>
      </PressableScale>
      <PressableScale
        onPress={() => router.push("/(app)/(tabs)/recipes")}
        className="flex-1 h-12 rounded-2xl bg-white border border-[#ebe9e2] flex-row items-center justify-center gap-1.5"
        accessibilityRole="button"
        accessibilityLabel="Buka resep"
      >
        <BookOpenIconSvg size={15} color="#153e28" />
        <AppText weight="bold" className="text-neutral-dark text-sm">
          Resep
        </AppText>
      </PressableScale>
      <PressableScale
        onPress={() => router.push("/(app)/meal-planner")}
        className="flex-1 h-12 rounded-2xl bg-white border border-[#ebe9e2] flex-row items-center justify-center gap-1.5"
        accessibilityRole="button"
        accessibilityLabel="Buka rencana makan 7 hari"
      >
        <CalendarIconSvg size={15} color="#153e28" />
        <AppText weight="bold" className="text-neutral-dark text-sm">
          Rencana
        </AppText>
      </PressableScale>
    </View>
  );

  /* 3. Journal: four slots as ruled rows, entries indented beneath their slot. */
  const renderJournal = () => (
    <View>
      <SectionHeader
        title="Jurnal hari ini"
        caption={
          aggregates.entryCount === 0
            ? "Ketuk + di tiap waktu makan untuk mencatat"
            : `${aggregates.entryCount} makanan tercatat`
        }
        actionLabel="Lihat menu"
        onAction={() => router.push("/(app)/(tabs)/meals")}
      />
      <View className="bg-white rounded-[22px] border border-[#ebe9e2] px-4">
        {groupedJournal.map((slot, slotIndex) => {
          const hasEntries = slot.entries.length > 0;
          return (
            <Animated.View
              key={slot.id}
              layout={LinearTransition.duration(220)}
              className={slotIndex > 0 ? "border-t border-[#f0eee8]" : ""}
            >
              <View className="flex-row items-center py-3">
                <View className="w-10 h-10 rounded-xl bg-[#f3f6f2] items-center justify-center">
                  <IconRenderer name={slot.iconName} size={18} />
                </View>
                <View className="flex-1 min-w-0 ml-3 mr-2">
                  <AppText weight="bold" className="text-[15px] text-neutral-dark">
                    {slot.label}
                  </AppText>
                  <AppText
                    weight="medium"
                    numberOfLines={1}
                    className="text-xs text-neutral-muted mt-0.5"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {hasEntries
                      ? `${slot.entries.length} menu · ${fmt(slot.totalCalories)} kcal`
                      : "Belum dicatat"}
                  </AppText>
                </View>
                <PressableScale
                  onPress={() => handleOpenSlotLog(slot.id, slot.label)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  className="w-10 h-10 rounded-full border border-[#dfe6e0] items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel={`Catat ${slot.label.toLowerCase()}`}
                >
                  <PlusIconSvg size={16} color="#153e28" strokeWidth={2.4} />
                </PressableScale>
              </View>

              {slot.entries.map((item) => {
                const matchedRecipe = MOCK_RECIPES.find(
                  (r) => r.id === item.mealId || r.title.toLowerCase() === item.title.toLowerCase()
                );
                const photoUrl = (item as any).imageUrl || matchedRecipe?.imageUrl;
                return (
                  <Animated.View
                    key={item.id}
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(140)}
                    layout={LinearTransition.duration(220)}
                    className="flex-row items-center pl-[52px] pb-3"
                  >
                    <View className="w-8 h-8 rounded-lg bg-[#f3f6f2] overflow-hidden items-center justify-center">
                      {photoUrl ? (
                        <Image source={{ uri: photoUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                      ) : (
                        <IconRenderer name={slot.iconName} size={14} />
                      )}
                    </View>
                    <View className="flex-1 min-w-0 ml-2.5 mr-2">
                      <AppText weight="semibold" numberOfLines={1} className="text-[13px] text-neutral-dark">
                        {item.quantity > 1 ? `${item.quantity}x ` : ""}
                        {item.title}
                      </AppText>
                      <AppText
                        weight="medium"
                        numberOfLines={1}
                        className="text-[11px] text-neutral-muted"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {item.calories} kcal · P {item.proteinGrams} · K {item.carbsGrams} · L {item.fatGrams}
                      </AppText>
                    </View>
                    <PressableScale
                      onPress={() => handleDeleteEntry(item.id, item.title)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      className="w-8 h-8 rounded-full items-center justify-center"
                      accessibilityRole="button"
                      accessibilityLabel={`Hapus ${item.title}`}
                    >
                      <CloseIconSvg size={13} color="#5a625b" strokeWidth={2.2} />
                    </PressableScale>
                  </Animated.View>
                );
              })}
            </Animated.View>
          );
        })}
      </View>
    </View>
  );

  /* 4. Activity: flat on the canvas. Shows loading and error honestly, never seeded numbers. */
  const renderActivity = () => {
    const data = activityQuery.data;
    const steps = data?.steps ?? 0;
    const stepGoal = data?.stepGoal ?? 6000;
    const stepsPct = Math.min(100, Math.round((steps / stepGoal) * 100));

    return (
      <View>
        <SectionHeader title="Aktivitas" />
        <View className="px-0.5">
          {activityQuery.isLoading ? (
            <AppText weight="medium" className="text-[13px] text-neutral-muted py-3">
              Memuat data langkah...
            </AppText>
          ) : activityQuery.isError ? (
            <View className="flex-row items-center justify-between py-2">
              <AppText weight="medium" className="text-[13px] text-neutral-muted flex-1 mr-3">
                Data langkah belum bisa dimuat.
              </AppText>
              <PressableScale
                onPress={() => activityQuery.refetch()}
                className="h-10 px-4 rounded-full border border-[#dfe6e0] justify-center"
                accessibilityRole="button"
              >
                <AppText weight="bold" className="text-[13px] text-primary">
                  Coba lagi
                </AppText>
              </PressableScale>
            </View>
          ) : (
            <>
              <View className="flex-row items-end justify-between">
                <View className="flex-row items-baseline">
                  <AnimatedNumber
                    value={steps}
                    formatter={fmt}
                    animateOnMount={false}
                    weight="black"
                    className="text-[28px] text-neutral-dark leading-none"
                    style={{ fontVariant: ["tabular-nums"], letterSpacing: -0.6 }}
                  />
                  <AppText
                    weight="medium"
                    className="text-[13px] text-neutral-muted ml-1.5"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    / {fmt(stepGoal)} langkah
                  </AppText>
                </View>
                <PressableScale
                  onPress={() => addStepsMutation.mutate(500)}
                  disabled={addStepsMutation.isPending}
                  className="h-10 px-4 rounded-full bg-white border border-[#dfe6e0] justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Tambah 500 langkah manual"
                >
                  <AppText weight="bold" className="text-[13px] text-primary">
                    +500
                  </AppText>
                </PressableScale>
              </View>
              <ProgressBar
                progress={stepsPct}
                color={MACRO_COLORS.protein}
                backgroundColor="#e9ede7"
                height={6}
                className="mt-3"
                accessibilityLabel={`${stepsPct} persen target langkah`}
              />
              <AppText weight="medium" className="text-xs text-neutral-muted mt-2">
                {steps === 0
                  ? "Belum ada langkah tercatat. Tambah manual dengan +500."
                  : `${stepsPct}% dari target harian`}
              </AppText>
            </>
          )}
        </View>
      </View>
    );
  };

  /* 5. Planning: two navigation rows, no card-in-card. Badge only marks real premium state. */
  const renderPlanning = () => (
    <View>
      <SectionHeader title="Rencanakan" />
      <View className="border-t border-[#ebe9e2]">
        {[
          {
            title: "Rencana makan 7 hari",
            caption: "Menu bergizi sesuai target dan budget",
            icon: <CalendarIconSvg size={17} color="#153e28" />,
            onPress: () => router.push("/(app)/meal-planner"),
          },
          {
            title: "Tren nutrisi",
            caption: "Kalori dan makro 7 sampai 30 hari",
            icon: <BarChartIconSvg size={17} color="#153e28" />,
            onPress: () => router.push("/(app)/analytics"),
          },
        ].map((row) => (
          <PressableScale
            key={row.title}
            onPress={row.onPress}
            pressedScale={0.985}
            className="flex-row items-center py-3.5 border-b border-[#ebe9e2]"
            accessibilityRole="link"
            accessibilityLabel={row.title}
          >
            <View className="w-10 h-10 rounded-xl bg-primary-light items-center justify-center">
              {row.icon}
            </View>
            <View className="flex-1 min-w-0 ml-3 mr-2">
              <View className="flex-row items-center gap-2">
                <AppText weight="bold" className="text-[15px] text-neutral-dark">
                  {row.title}
                </AppText>
                {!isPremium && <Badge label="Premium" variant="accent" size="sm" />}
              </View>
              <AppText weight="medium" numberOfLines={1} className="text-xs text-neutral-muted mt-0.5">
                {row.caption}
              </AppText>
            </View>
            <ChevronRightIconSvg size={16} color="#8b938c" />
          </PressableScale>
        ))}
      </View>
    </View>
  );

  /* 6. Inspiration: edge-to-edge carousel, the only image-led block on Home. */
  const renderInspiration = () => (
    <View>
      <SectionHeader
        title="Inspirasi menu"
        actionLabel="Semua resep"
        onAction={() => router.push("/(app)/(tabs)/recipes")}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingHorizontal: isDesktop ? 0 : 16 }}
        className={isDesktop ? "" : "-mx-4"}
        decelerationRate="fast"
        snapToInterval={isDesktop ? undefined : 212}
      >
        {MOCK_RECIPES.slice(0, 6).map((meal) => (
          <View key={meal.id} className="w-[200px]">
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

  const header = (
    <View className="flex-row items-center justify-between mb-5">
      <View className="flex-1 min-w-0 mr-3">
        <AppText weight="medium" className="text-[13px] text-neutral-muted capitalize">
          {formattedToday}
        </AppText>
        <AppText
          weight="black"
          numberOfLines={1}
          className="text-[26px] text-neutral-dark mt-0.5"
          style={{ letterSpacing: -0.6 }}
        >
          {firstName ? `${greetingTime}, ${firstName}` : greetingTime}
        </AppText>
      </View>
      <PressableScale
        onPress={() => router.push("/(app)/(tabs)/profile")}
        className="w-11 h-11 rounded-full bg-primary-light items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel="Buka profil"
      >
        <AppText weight="bold" className="text-sm text-primary">
          {userInitials}
        </AppText>
      </PressableScale>
    </View>
  );

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#faf9f5]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: Platform.OS === "web" ? 64 : 110 }}
      >
        <FadeInView index={0}>{header}</FadeInView>

        {isDesktop ? (
          <View className="flex-row gap-6 items-start">
            <View className="flex-1 gap-6 min-w-0">
              <FadeInView index={1}>{renderEnergyHub()}</FadeInView>
              <FadeInView index={2}>{renderActions()}</FadeInView>
              <FadeInView index={3}>{renderInspiration()}</FadeInView>
              <FadeInView index={4}>{renderPlanning()}</FadeInView>
            </View>
            <View className="w-[380px] gap-6 flex-shrink-0">
              <FadeInView index={2}>{renderJournal()}</FadeInView>
              <FadeInView index={3}>{renderActivity()}</FadeInView>
            </View>
          </View>
        ) : (
          <View className="gap-3">
            <FadeInView index={1}>{renderEnergyHub()}</FadeInView>
            <FadeInView index={2}>{renderActions()}</FadeInView>
            <FadeInView index={3} className="mt-5">{renderJournal()}</FadeInView>
            <FadeInView index={4} className="mt-6">{renderActivity()}</FadeInView>
            <FadeInView index={5} className="mt-6">{renderPlanning()}</FadeInView>
            <FadeInView index={6} className="mt-6">{renderInspiration()}</FadeInView>
          </View>
        )}
      </ScrollView>

      <MealLogModal
        visible={isLogModalVisible}
        meal={selectedMealForLog}
        onClose={() => setIsLogModalVisible(false)}
      />
    </ScreenWrapper>
  );
}
