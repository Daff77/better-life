import React, { useState, useEffect } from "react";
import { View, Image, ScrollView, ActivityIndicator, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AppText,
  Header,
  NutritionCard,
  MealLogModal,
  PressableScale,
  FadeInView,
  Surface,
  CardHead,
  StatusPill,
  Segmented,
  ListRow,
  RowIcon,
  PillButton,
  RingButton,
  ColorBlock,
  LineIcon,
  ProgressBar,
  SURFACE_SHADOW,
} from "@/components/ui";
import { MOCK_RECIPES } from "@/data/mockRecipes";
import { getMealIllustration } from "@/constants/Assets";
import { mealLabel, DIFFICULTY_LABELS } from "@/constants/MealLabels";
import { useRecipe } from "@/hooks/useRecipesQuery";
import { useSubscriptionStore } from "@/stores/useSubscriptionStore";
import { useCustomRecipesStore } from "@/stores/useCustomRecipesStore";
import { Entitlement } from "@/lib/subscriptionDomain";
import { confirmDestructive } from "@/lib/confirm";

export default function RecipeDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: queriedRecipe, isLoading } = useRecipe(id || "");
  const removeCustomRecipe = useCustomRecipesStore((state) => state.removeCustomRecipe);

  const hasEntitlement = useSubscriptionStore((state) => state.hasEntitlement);
  const [activeTab, setActiveTab] = useState<"instructions" | "ingredients">("instructions");
  const [isLogModalVisible, setIsLogModalVisible] = useState<boolean>(false);

  const recipe = queriedRecipe || MOCK_RECIPES.find((r) => r.id === id) || (id ? null : MOCK_RECIPES[0]);
  const isCustomRecipe = Boolean(recipe?.id.startsWith("custom-recipe-"));
  const isLocked = Boolean((recipe as any)?.isPremium && !hasEntitlement(Entitlement.PREMIUM_RECIPES));

  // Interactive Cooking Timer state (main recipe timer + per-step timers)
  const defaultMainSeconds = Math.max(1, recipe?.prepTimeMinutes || 15) * 60;
  const [timerSeconds, setTimerSeconds] = useState<number>(defaultMainSeconds);
  const [timerTotalSeconds, setTimerTotalSeconds] = useState<number>(defaultMainSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [activeStepTimer, setActiveStepTimer] = useState<number | null>(null);

  useEffect(() => {
    const secs = Math.max(1, recipe?.prepTimeMinutes || 15) * 60;
    setTimerSeconds(secs);
    setTimerTotalSeconds(secs);
    setIsTimerRunning(false);
    setActiveStepTimer(null);
  }, [recipe?.id, recipe?.prepTimeMinutes]);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleStartStepTimer = (stepNumber: number, minutes: number) => {
    const secs = Math.max(1, minutes) * 60;
    if (activeStepTimer === stepNumber) {
      setIsTimerRunning((r) => !r);
    } else {
      setActiveStepTimer(stepNumber);
      setTimerTotalSeconds(secs);
      setTimerSeconds(secs);
      setIsTimerRunning(true);
    }
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setActiveStepTimer(null);
    const secs = Math.max(1, recipe?.prepTimeMinutes || 15) * 60;
    setTimerTotalSeconds(secs);
    setTimerSeconds(secs);
  };

  if (isLoading && !recipe) {
    return (
      <ScreenWrapper className="flex-1 bg-[#edf1ee] items-center justify-center">
        <ActivityIndicator size="large" color="#0e7a52" />
        <AppText weight="medium" className="text-sm text-[#56605a] mt-3">
          Memuat detail resep...
        </AppText>
      </ScreenWrapper>
    );
  }

  if (!recipe) {
    return (
      <ScreenWrapper className="flex-1 bg-[#edf1ee]">
        <Header onBack={() => router.back()} title="Resep tidak ditemukan" />
        <View className="flex-1 items-center justify-center p-6">
          <Surface className="items-center max-w-sm w-full py-8">
            <View className="w-12 h-12 rounded-2xl bg-[#fde9e7] items-center justify-center mb-3">
              <LineIcon name="alert" size={22} color="#b92d26" />
            </View>
            <AppText weight="bold" className="text-lg text-[#121a16] mb-1 text-center">
              Resep tidak tersedia
            </AppText>
            <AppText weight="regular" className="text-xs text-[#56605a] text-center mb-5 max-w-xs leading-relaxed">
              Resep yang Anda cari tidak ditemukan atau telah dipindahkan dari katalog.
            </AppText>
            <PillButton
              label="Lihat semua resep"
              variant="primary"
              onPress={() => router.replace("/(app)/(tabs)/recipes")}
              accessibilityLabel="Kembali ke katalog resep"
            />
          </Surface>
        </View>
      </ScreenWrapper>
    );
  }

  const diffLabel = DIFFICULTY_LABELS[recipe.difficulty] ?? recipe.difficulty;

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-[#edf1ee]">
      <Header
        onBack={() => router.back()}
        title={recipe.title}
        subtitle={`${mealLabel(recipe.category)} · ${recipe.prepTimeMinutes} mnt · ${diffLabel}`}
        rightComponent={
          <View className="flex-row items-center gap-2">
            <StatusPill
              tone={isCustomRecipe ? "good" : (recipe as any)?.isPremium ? "warn" : "ok"}
              label={
                isCustomRecipe
                  ? "Resep Saya"
                  : (recipe as any)?.isPremium
                  ? "Koleksi Chef"
                  : mealLabel(recipe.category)
              }
            />
            {isCustomRecipe && (
              <RingButton
                icon="trash"
                size="sm"
                onPress={() => {
                  confirmDestructive(
                    "Hapus Resep Saya",
                    `Hapus resep "${recipe.title}" dari koleksi Anda?`,
                    "Hapus",
                    async () => {
                      await removeCustomRecipe(recipe.id);
                      router.replace("/(app)/(tabs)/recipes");
                    }
                  );
                }}
              />
            )}
          </View>
        }
      />

      <ScrollView
        className="flex-1 pt-1"
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 96 : 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-col lg:flex-row lg:gap-5 mt-1">
          {/* Left Column: Hero Art + Cost + Nutrition + Desktop Action */}
          <FadeInView index={0} className="w-full lg:w-5/12 gap-4 mb-4 lg:mb-0">
            <Surface noPadding className="overflow-hidden">
              <View className="w-full h-56 sm:h-64 lg:h-72 bg-[#f0f4f1] items-center justify-center relative overflow-hidden">
                <Image
                  source={
                    recipe.imageUrl
                      ? { uri: recipe.imageUrl }
                      : getMealIllustration(recipe.category || recipe.svgIcon)
                  }
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />

                <View className="absolute top-3.5 left-3.5 flex-row items-center gap-1.5">
                  <View className="px-3 py-1 rounded-full bg-[#121a16]/85">
                    <AppText
                      weight="bold"
                      className="text-xs text-white"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {recipe.calories} kcal
                    </AppText>
                  </View>
                  <View className="px-2.5 py-1 rounded-full bg-[#fbfdfc]/92 border border-[#e6eae7] flex-row items-center gap-1">
                    <LineIcon name="clock" size={12} color="#121a16" />
                    <AppText
                      weight="semibold"
                      className="text-[11px] text-[#121a16]"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {recipe.prepTimeMinutes} mnt
                    </AppText>
                  </View>
                </View>
              </View>

              {/* Quick recipe metadata strip */}
              <View className="p-4 flex-row items-center justify-between border-t border-[#e6eae7] bg-[#fbfdfc] gap-2">
                <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
                  <RowIcon tone="soft">
                    <LineIcon name="wallet" size={16} color="#0e7a52" />
                  </RowIcon>
                  <View className="flex-1 min-w-0">
                    <AppText weight="semibold" className="text-[13px] text-[#121a16]">
                      Estimasi biaya bahan
                    </AppText>
                    <AppText weight="regular" className="text-[11px] text-[#56605a]">
                      Rata-rata pasar lokal per porsi
                    </AppText>
                  </View>
                </View>
                <AppText
                  weight="bold"
                  className="text-[15px] text-[#0e7a52] flex-shrink-0"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {recipe.estimatedCostIdr !== undefined
                    ? `Rp ${recipe.estimatedCostIdr.toLocaleString("id-ID")}`
                    : "Terjangkau"}
                </AppText>
              </View>
            </Surface>

            <NutritionCard
              proteinGrams={recipe.nutrition.proteinGrams}
              carbsGrams={recipe.nutrition.carbsGrams}
              fatGrams={recipe.nutrition.fatGrams}
              fiberGrams={recipe.nutrition.fiberGrams}
              totalCalories={recipe.calories}
            />

            <View className="hidden lg:flex">
              <PressableScale
                onPress={() => setIsLogModalVisible(true)}
                className="w-full py-3.5 px-5 rounded-full bg-[#0e7a52] flex-row items-center justify-center gap-2"
                accessibilityRole="button"
                accessibilityLabel={`Catat ${recipe.title}`}
              >
                <LineIcon name="plus" size={16} color="#ffffff" />
                <AppText weight="semibold" className="text-sm text-white">
                  Catat
                </AppText>
              </PressableScale>
            </View>
          </FadeInView>

          {/* Right Column: Cooking Tabs, Steps, Ingredients */}
          <FadeInView index={1} className="w-full lg:w-7/12 gap-4">
            {isLocked && (
              <ColorBlock tone="amber">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5 mb-1">
                      <LineIcon name="crown" size={15} color="#1b1406" />
                      <AppText weight="bold" className="text-[11px] uppercase tracking-wider text-[#1b1406]/75">
                        Koleksi Resep Premium
                      </AppText>
                    </View>
                    <AppText weight="semibold" className="text-base text-[#1b1406] mb-1">
                      Buka takaran presisi & panduan chef
                    </AppText>
                    <AppText weight="regular" className="text-xs text-[#1b1406]/80 leading-relaxed mb-3">
                      Aktifkan Better Life Premium untuk membuka koleksi resep chef lengkap beserta analisis makronutrisi mendalam.
                    </AppText>
                    <View className="self-start">
                      <PillButton
                        label="Lihat paket Premium"
                        variant="dark"
                        onPress={() => router.push("/(app)/upgrade")}
                        accessibilityLabel="Lihat paket Premium"
                      />
                    </View>
                  </View>
                </View>
              </ColorBlock>
            )}

            <Surface>
              <CardHead
                title={activeTab === "instructions" ? "Langkah memasak" : "Komposisi bahan"}
                subtitle={
                  activeTab === "instructions"
                    ? `${recipe.instructions.length} tahapan terstruktur`
                    : `${recipe.ingredients.length} bahan utama per porsi`
                }
              />

              <View className="mb-3.5">
                <Segmented
                  stretch
                  value={activeTab}
                  onChange={setActiveTab}
                  options={[
                    { value: "instructions", label: "Langkah memasak" },
                    { value: "ingredients", label: `Bahan (${recipe.ingredients.length})` },
                  ]}
                />
              </View>

              {activeTab === "instructions" ? (
                <View className="gap-3">
                  {/* Interactive Cooking Timer Panel */}
                  <View className="bg-card-2 border border-line rounded-[18px] p-3.5 mb-1">
                    <View className="flex-row items-center justify-between gap-2 mb-2.5">
                      <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
                        <View className="w-9 h-9 rounded-full bg-primary-light items-center justify-center flex-shrink-0">
                          <LineIcon name="clock" size={17} color="#0e7a52" />
                        </View>
                        <View className="flex-1 min-w-0">
                          <AppText weight="semibold" numberOfLines={1} className="text-[13px] text-ink">
                            {activeStepTimer
                              ? `Timer Langkah ${activeStepTimer}`
                              : "Timer Memasak"}
                          </AppText>
                          <AppText
                            weight="bold"
                            className="text-[20px] text-primary-text"
                            style={{ fontVariant: ["tabular-nums"], letterSpacing: -0.5, lineHeight: 24 }}
                          >
                            {timerSeconds === 0 ? "Selesai!" : formatTimer(timerSeconds)}
                          </AppText>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-2">
                        <PressableScale
                          onPress={() => {
                            if (timerSeconds === 0) {
                              setTimerSeconds(timerTotalSeconds);
                              setIsTimerRunning(true);
                            } else {
                              setIsTimerRunning((r) => !r);
                            }
                          }}
                          pressedScale={0.94}
                          className={`px-3.5 h-9 rounded-full items-center justify-center ${
                            isTimerRunning ? "bg-block-amber" : "bg-primary"
                          }`}
                          accessibilityRole="button"
                          accessibilityLabel={isTimerRunning ? "Jeda timer memasak" : "Mulai timer memasak"}
                        >
                          <AppText
                            weight="bold"
                            className={`text-xs ${isTimerRunning ? "text-[#1b1406]" : "text-white"}`}
                          >
                            {isTimerRunning ? "Jeda" : timerSeconds === 0 ? "Ulangi" : "Mulai"}
                          </AppText>
                        </PressableScale>

                        <RingButton
                          icon="refresh"
                          size="sm"
                          onPress={handleResetTimer}
                          accessibilityLabel="Reset timer memasak"
                        />
                      </View>
                    </View>

                    <ProgressBar
                      progress={
                        timerTotalSeconds > 0
                          ? ((timerTotalSeconds - timerSeconds) / timerTotalSeconds) * 100
                          : 0
                      }
                      color="#0e7a52"
                      backgroundColor="#dfece5"
                      height={5}
                    />
                  </View>

                  {recipe.instructions.map((step) => {
                    const isThisStepTiming = activeStepTimer === step.step;
                    const stepMins = step.timerMinutes || 3;
                    return (
                      <View
                        key={step.step}
                        className={`flex-row items-start p-3.5 rounded-[16px] border ${
                          isThisStepTiming
                            ? "bg-primary-light/55 border-primary/40"
                            : "bg-[#f0f4f1] border-[#e6eae7]"
                        }`}
                      >
                        <View className="w-7 h-7 rounded-full bg-[#0e7a52] items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                          <AppText
                            weight="bold"
                            className="text-xs text-white"
                            style={{ fontVariant: ["tabular-nums"] }}
                          >
                            {step.step}
                          </AppText>
                        </View>

                        <View className="flex-1 min-w-0">
                          <AppText weight="regular" className="text-[13.5px] text-[#121a16] leading-relaxed">
                            {step.text}
                          </AppText>

                          <PressableScale
                            onPress={() => handleStartStepTimer(step.step, stepMins)}
                            pressedScale={0.96}
                            className={`flex-row items-center mt-2 px-3 py-1.5 rounded-full self-start gap-1.5 border ${
                              isThisStepTiming && isTimerRunning
                                ? "bg-primary border-primary"
                                : "bg-[#fbfdfc] border-[#e6eae7]"
                            }`}
                            accessibilityRole="button"
                            accessibilityLabel={`Timer langkah ${step.step}, ${stepMins} menit`}
                          >
                            <LineIcon
                              name="clock"
                              size={12}
                              color={isThisStepTiming && isTimerRunning ? "#ffffff" : "#0e7a52"}
                            />
                            <AppText
                              weight="semibold"
                              className={`text-[11px] ${
                                isThisStepTiming && isTimerRunning ? "text-white" : "text-[#0e7a52]"
                              }`}
                              style={{ fontVariant: ["tabular-nums"] }}
                            >
                              {isThisStepTiming
                                ? `${formatTimer(timerSeconds)} · ${isTimerRunning ? "Jeda" : "Lanjut"}`
                                : `Set Timer ${stepMins} mnt`}
                            </AppText>
                          </PressableScale>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View>
                  {recipe.ingredients.map((ing, idx) => (
                    <ListRow
                      key={idx}
                      first={idx === 0}
                      last={idx === recipe.ingredients.length - 1}
                      left={
                        <RowIcon tone="soft">
                          <LineIcon name="leaf" size={15} color="#0e7a52" />
                        </RowIcon>
                      }
                      title={ing.name}
                      subtitle="Takaran per 1 porsi saji"
                      right={
                        <View className="px-2.5 py-1 rounded-full bg-[#f0f4f1] border border-[#e6eae7] flex-shrink-0">
                          <AppText
                            weight="semibold"
                            className="text-xs text-[#121a16]"
                            style={{ fontVariant: ["tabular-nums"] }}
                          >
                            {ing.amount}
                          </AppText>
                        </View>
                      }
                    />
                  ))}
                </View>
              )}
            </Surface>
          </FadeInView>
        </View>
      </ScrollView>

      {/* Sticky Bottom Dock for Mobile */}
      <View
        className="lg:hidden -mx-4 px-5 pt-3 bg-[#fbfdfc] border-t border-[#e6eae7]"
        style={[{ paddingBottom: Math.max(insets.bottom, 12) }, { boxShadow: SURFACE_SHADOW } as any]}
      >
        <View className="flex-row items-center justify-between gap-3 max-w-md mx-auto w-full">
          <View className="flex-1 min-w-0">
            <AppText
              weight="bold"
              className="text-lg text-[#121a16]"
              style={{ fontVariant: ["tabular-nums"], letterSpacing: -0.4 }}
            >
              {recipe.calories} kcal
            </AppText>
            <AppText weight="regular" numberOfLines={1} className="text-xs text-[#56605a]">
              {recipe.prepTimeMinutes} mnt · {diffLabel}
            </AppText>
          </View>
          <PillButton
            label="Catat"
            variant="primary"
            icon={<LineIcon name="plus" size={15} color="#ffffff" />}
            onPress={() => setIsLogModalVisible(true)}
            accessibilityLabel={`Catat ${recipe.title}`}
          />
        </View>
      </View>

      <MealLogModal
        visible={isLogModalVisible}
        meal={recipe}
        onClose={() => setIsLogModalVisible(false)}
      />
    </ScreenWrapper>
  );
}
