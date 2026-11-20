import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Image, ScrollView, ActivityIndicator, Platform, AppState } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AnimatedHeart,
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
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import { Entitlement } from "@/lib/subscriptionDomain";
import { confirmDestructive } from "@/lib/confirm";
import {
  checkRecipeAllergies,
  checkRecipeDietaryRestrictions,
  explainRecipeSelection,
  inspectIngredientsToVerify,
} from "@better-life/shared";

const timerDotEase = Easing.bezier(0.77, 0, 0.175, 1);

const LiveTimerDot: React.FC<{ active: boolean }> = ({ active }) => {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!active || reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = active ? 1 : 0.6;
      return;
    }

    pulse.value = withRepeat(
      withSequence(
        withTiming(0.38, { duration: 600, easing: timerDotEase }),
        withTiming(1, { duration: 600, easing: timerDotEase })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(pulse);
    };
  }, [active, reduceMotion, pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: reduceMotion || !active ? 1 : 0.85 + pulse.value * 0.2 }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 8,
          height: 8,
          borderRadius: 999,
          backgroundColor: active ? "#0e7a52" : "#9ba6a0",
        },
        dotStyle,
      ]}
    />
  );
};

export default function RecipeDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: queriedRecipe, isLoading } = useRecipe(id || "");
  const removeCustomRecipe = useCustomRecipesStore((state) => state.removeCustomRecipe);
  const favorites = useFavoritesStore((state) => state.favorites);
  const toggleFavorite = useFavoritesStore((state) => state.toggleFavorite);
  const personalization = useOnboardingStore((state) => state.personalization);

  const hasEntitlement = useSubscriptionStore((state) => state.hasEntitlement);
  const [activeTab, setActiveTab] = useState<"instructions" | "ingredients">("instructions");
  const [isLogModalVisible, setIsLogModalVisible] = useState<boolean>(false);

  const recipe = queriedRecipe || MOCK_RECIPES.find((r) => r.id === id) || (id ? null : MOCK_RECIPES[0]);
  const isCustomRecipe = Boolean(recipe?.id.startsWith("custom-recipe-"));
  const isLocked = Boolean((recipe as any)?.isPremium && !hasEntitlement(Entitlement.PREMIUM_RECIPES));

  // Interactive Cooking Timer state (deadline-based to prevent drift in background tabs/lock screen)
  const defaultMainSeconds = Math.max(1, recipe?.prepTimeMinutes || 15) * 60;
  const [timerSeconds, setTimerSeconds] = useState<number>(defaultMainSeconds);
  const [timerTotalSeconds, setTimerTotalSeconds] = useState<number>(defaultMainSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [activeStepTimer, setActiveStepTimer] = useState<number | null>(null);
  const timerDeadlineRef = useRef<number | null>(null);

  const syncTimerRemaining = useCallback(() => {
    const deadline = timerDeadlineRef.current;
    if (!deadline) return;
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    setTimerSeconds(remaining);
    if (remaining <= 0) {
      timerDeadlineRef.current = null;
      setIsTimerRunning(false);
    }
  }, []);

  const startTimerWithDuration = useCallback((seconds: number) => {
    const clamped = Math.max(1, Math.round(seconds));
    timerDeadlineRef.current = Date.now() + clamped * 1000;
    setTimerSeconds(clamped);
    setIsTimerRunning(true);
  }, []);

  const pauseTimer = useCallback(() => {
    if (timerDeadlineRef.current) {
      const remaining = Math.max(0, Math.ceil((timerDeadlineRef.current - Date.now()) / 1000));
      setTimerSeconds(remaining);
      timerDeadlineRef.current = null;
    }
    setIsTimerRunning(false);
  }, []);

  useEffect(() => {
    const secs = Math.max(1, recipe?.prepTimeMinutes || 15) * 60;
    timerDeadlineRef.current = null;
    setTimerSeconds(secs);
    setTimerTotalSeconds(secs);
    setIsTimerRunning(false);
    setActiveStepTimer(null);
  }, [recipe?.id, recipe?.prepTimeMinutes]);

  useEffect(() => {
    if (!isTimerRunning) return;
    syncTimerRemaining();
    const interval = setInterval(syncTimerRemaining, 500);
    const appSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        syncTimerRemaining();
      }
    });
    const onVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        syncTimerRemaining();
      }
    };
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }
    return () => {
      clearInterval(interval);
      appSub.remove();
      if (Platform.OS === "web" && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }, [isTimerRunning, syncTimerRemaining]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleStartStepTimer = (stepNumber: number, minutes: number) => {
    const secs = Math.max(1, minutes) * 60;
    if (activeStepTimer === stepNumber) {
      if (isTimerRunning) {
        pauseTimer();
      } else {
        startTimerWithDuration(timerSeconds > 0 ? timerSeconds : secs);
      }
    } else {
      setActiveStepTimer(stepNumber);
      setTimerTotalSeconds(secs);
      startTimerWithDuration(secs);
    }
  };

  const handleResetTimer = () => {
    timerDeadlineRef.current = null;
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
  const isFavorited = favorites.some((f) => f.itemId === recipe.id);
  const userRestrictions =
    personalization.dietType && personalization.dietType !== "Omnivore"
      ? [personalization.dietType]
      : [];
  const allergyCheck = checkRecipeAllergies(recipe, personalization.allergies);
  const dietCheck = checkRecipeDietaryRestrictions(recipe, userRestrictions);
  const fitReasons = explainRecipeSelection(recipe, {
    slotCalorieTarget: Math.round((personalization.targetCalories || 2000) / 3),
    allergies: personalization.allergies,
    dietaryRestrictions: userRestrictions,
  });
  const ingredientsToVerify = inspectIngredientsToVerify(recipe, personalization.allergies);

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
            <PressableScale
              onPress={() => void toggleFavorite(recipe)}
              pressedScale={0.93}
              className={`w-9 h-9 rounded-full items-center justify-center border ${
                isFavorited ? "bg-[#fde9e7] border-[#f5c2be]" : "bg-card border-line"
              }`}
              accessibilityRole="button"
              accessibilityState={{ selected: isFavorited }}
              accessibilityLabel={
                isFavorited ? `Hapus ${recipe.title} dari favorit` : `Simpan ${recipe.title} ke favorit`
              }
            >
              <AnimatedHeart
                filled={isFavorited}
                size={15}
                activeColor="#b92d26"
                inactiveColor="#121a16"
              />
            </PressableScale>
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

            {/* Nutritional Fit Reasons & Ingredient Verification Notes */}
            <Surface>
              <CardHead
                title="Kesesuaian menu & pemeriksaan bahan"
                subtitle="Evaluasi otomatis terhadap target dan profil pantangan Anda"
              />
              <View className="gap-2.5">
                {(!allergyCheck.safe || !dietCheck.compliant) && (
                  <View className="p-3 rounded-[14px] bg-[#fde9e7] border border-[#f5c2be] flex-row items-start gap-2">
                    <LineIcon name="alert" size={16} color="#b92d26" />
                    <AppText weight="semibold" className="text-xs text-[#b92d26] flex-1 leading-relaxed">
                      {!allergyCheck.safe
                        ? `Perhatian alergi: resep ini terdeteksi mengandung bahan terkait "${allergyCheck.violatedAllergen}".`
                        : `Perhatian pola makan: resep ini tidak sesuai dengan preferensi "${dietCheck.violatedRestriction}".`}
                    </AppText>
                  </View>
                )}

                {fitReasons.map((reason, idx) => (
                  <View key={idx} className="flex-row items-start gap-2">
                    <LineIcon name="check" size={14} color="#0e7a52" />
                    <AppText weight="medium" className="text-xs text-[#121a16] flex-1 leading-relaxed">
                      {reason}
                    </AppText>
                  </View>
                ))}

                {ingredientsToVerify.length > 0 && (
                  <View className="mt-1 pt-2.5 border-t border-[#e6eae7] gap-2">
                    <AppText weight="semibold" className="text-xs text-[#946000]">
                      Bahan & bumbu yang perlu diperiksa pada label kemasan:
                    </AppText>
                    {ingredientsToVerify.map((item, idx) => (
                      <View key={idx} className="flex-row items-start gap-2">
                        <LineIcon name="alert" size={14} color="#946000" />
                        <AppText weight="regular" className="text-xs text-[#56605a] flex-1 leading-relaxed">
                          <AppText weight="semibold" className="text-[#121a16]">
                            {item.ingredient} ({item.amount}):
                          </AppText>{" "}
                          {item.note}
                        </AppText>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </Surface>

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
                <FadeInView key="tab-instructions" duration={180} translateY={4} className="gap-3">
                  {/* Interactive Cooking Timer Panel */}
                  <View className="bg-card-2 border border-line rounded-[18px] p-3.5 mb-1">
                    <View className="flex-row items-center justify-between gap-2 mb-2.5">
                      <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
                        <View className="w-9 h-9 rounded-full bg-primary-light items-center justify-center flex-shrink-0">
                          <LineIcon name="clock" size={17} color="#0e7a52" />
                        </View>
                        <View className="flex-1 min-w-0">
                          <View className="flex-row items-center gap-1.5">
                            {isTimerRunning && <LiveTimerDot active />}
                            <AppText weight="semibold" numberOfLines={1} className="text-[13px] text-ink">
                              {activeStepTimer
                                ? `Timer Langkah ${activeStepTimer}`
                                : "Timer Memasak"}
                            </AppText>
                          </View>
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
                            if (isTimerRunning) {
                              pauseTimer();
                            } else {
                              startTimerWithDuration(
                                timerSeconds === 0 ? timerTotalSeconds : timerSeconds
                              );
                            }
                          }}
                          pressedScale={0.94}
                          className={`px-3.5 h-11 rounded-full items-center justify-center ${
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
                </FadeInView>
              ) : (
                <FadeInView key="tab-ingredients" duration={180} translateY={4}>
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
                </FadeInView>
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
