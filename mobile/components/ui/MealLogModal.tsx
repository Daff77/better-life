import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Image,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  Platform,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";
import { LineIcon } from "./LineIcon";
import { RingButton, PillButton, MixBar, StatusPill, SURFACE_SHADOW } from "./Surface";
import { getMealIllustration } from "@/constants/Assets";
import { Colors } from "@/constants/DesignTokens";
import {
  AnimationEasings,
  AnimationScales,
  AnimationDistances,
  MotionCurves,
  MotionDurations,
} from "@/constants/AnimationTokens";
import { mealLabel } from "@/constants/MealLabels";
import { FoodItem, MOCK_RECIPES } from "@/data/mockRecipes";
import { JournalCategory, JournalEntry } from "@/lib/schemas";
import { useJournalStore } from "@/stores/useJournalStore";

export interface MealLogModalProps {
  visible: boolean;
  meal: FoodItem | null;
  onClose: () => void;
  onSuccess?: (entry: JournalEntry) => void;
}

const MEAL_TYPE_ROWS: JournalCategory[][] = [
  ["Breakfast", "Lunch"],
  ["Dinner", "Snack"],
];
const MACRO = Colors.macros;
const tnum = { fontVariant: ["tabular-nums" as const] };

/**
 * Curated everyday Indonesian & healthy presets per category so that when a user
 * taps "Catat" on a meal slot (Sarapan, Makan siang, Makan malam, Camilan, Minuman),
 * they immediately see real, recognizable food/drink names and can switch or type their own.
 */
const QUICK_MENU_PRESETS: Record<string, FoodItem[]> = {
  Breakfast: [
    {
      id: "id-bubur-ayam",
      title: "Bubur Ayam Kampung",
      category: "Breakfast",
      calories: 340,
      prepTimeMinutes: 10,
      difficulty: "Easy",
      description: "Bubur beras hangat dengan suwiran ayam kampung, telur rebus, dan daun bawang.",
      svgIcon: "Breakfast",
      nutrition: { proteinGrams: 22, carbsGrams: 42, fatGrams: 8, fiberGrams: 4 },
      ingredients: [],
      instructions: [],
    },
    ...MOCK_RECIPES.filter((r) => r.category === "Breakfast"),
    {
      id: "id-nasi-uduk-telur",
      title: "Nasi Uduk & Telur Dadar",
      category: "Breakfast",
      calories: 410,
      prepTimeMinutes: 10,
      difficulty: "Easy",
      description: "Nasi uduk porsi terukur dengan telur dadar, tempe orek, dan irisan timun.",
      svgIcon: "Breakfast",
      nutrition: { proteinGrams: 16, carbsGrams: 48, fatGrams: 16, fiberGrams: 5 },
      ingredients: [],
      instructions: [],
    },
  ],
  Lunch: [
    {
      id: "id-nasi-merah-ayam-bakar",
      title: "Nasi Merah & Ayam Bakar",
      category: "Lunch",
      calories: 520,
      prepTimeMinutes: 20,
      difficulty: "Easy",
      description: "Nasi merah hangat dengan dada ayam bakar madu, lalapan segar, dan tahu kukus.",
      svgIcon: "Lunch",
      nutrition: { proteinGrams: 42, carbsGrams: 54, fatGrams: 14, fiberGrams: 8 },
      ingredients: [],
      instructions: [],
    },
    ...MOCK_RECIPES.filter((r) => r.category === "Lunch"),
    {
      id: "id-gado-gado-telur",
      title: "Gado-Gado Siram & Telur",
      category: "Lunch",
      calories: 480,
      prepTimeMinutes: 15,
      difficulty: "Easy",
      description: "Sayuran rebus lengkap, tahu, tempe, telur rebus, dan saus kacang sangrai.",
      svgIcon: "Lunch",
      nutrition: { proteinGrams: 24, carbsGrams: 44, fatGrams: 22, fiberGrams: 11 },
      ingredients: [],
      instructions: [],
    },
  ],
  Dinner: [
    {
      id: "id-capcay-ayam",
      title: "Capcay Kuah Ayam & Nasi",
      category: "Dinner",
      calories: 430,
      prepTimeMinutes: 15,
      difficulty: "Easy",
      description: "Tumis sayur brokoli, wortel, sawi, dan dada ayam kuah bening dengan nasi hangat.",
      svgIcon: "Dinner",
      nutrition: { proteinGrams: 30, carbsGrams: 46, fatGrams: 12, fiberGrams: 9 },
      ingredients: [],
      instructions: [],
    },
    ...MOCK_RECIPES.filter((r) => r.category === "Dinner"),
  ],
  Snack: [
    ...MOCK_RECIPES.filter((r) => r.category === "Snack"),
    {
      id: "id-pisang-rebus-keju",
      title: "Pisang Kukus & Chia",
      category: "Snack",
      calories: 175,
      prepTimeMinutes: 5,
      difficulty: "Easy",
      description: "Pisang kepok kukus hangat dengan taburan biji chia dan kayu manis.",
      svgIcon: "Snacks",
      nutrition: { proteinGrams: 4, carbsGrams: 34, fatGrams: 3, fiberGrams: 6 },
      ingredients: [],
      instructions: [],
    },
    {
      id: "id-buah-potong",
      title: "Pepaya & Melon Segar",
      category: "Snack",
      calories: 115,
      prepTimeMinutes: 3,
      difficulty: "Easy",
      description: "Potongan buah pepaya dan melon dingin kaya serat dan air.",
      svgIcon: "Snacks",
      nutrition: { proteinGrams: 2, carbsGrams: 26, fatGrams: 1, fiberGrams: 5 },
      ingredients: [],
      instructions: [],
    },
  ],
  Drink: [
    {
      id: "id-jus-alpukat",
      title: "Jus Alpukat Murni",
      category: "Drink",
      calories: 165,
      prepTimeMinutes: 5,
      difficulty: "Easy",
      description: "Alpukat mentega blender halus dengan sedikit susu oat tanpa tambahan gula.",
      svgIcon: "Drinks",
      nutrition: { proteinGrams: 4, carbsGrams: 14, fatGrams: 11, fiberGrams: 6 },
      ingredients: [],
      instructions: [],
    },
    {
      id: "id-kopi-susu-oat",
      title: "Es Kopi Susu Gula Aren",
      category: "Drink",
      calories: 140,
      prepTimeMinutes: 4,
      difficulty: "Easy",
      description: "Espresso arabika dengan susu segar dan sedikit gula aren asli.",
      svgIcon: "Drinks",
      nutrition: { proteinGrams: 5, carbsGrams: 21, fatGrams: 4, fiberGrams: 2 },
      ingredients: [],
      instructions: [],
    },
    {
      id: "id-smoothie-pisang-berry",
      title: "Smoothie Pisang & Berry",
      category: "Drink",
      calories: 195,
      prepTimeMinutes: 5,
      difficulty: "Easy",
      description: "Campuran pisang, stroberi, yogurt, dan biji chia kaya antioksidan.",
      svgIcon: "Drinks",
      nutrition: { proteinGrams: 8, carbsGrams: 32, fatGrams: 4, fiberGrams: 6 },
      ingredients: [],
      instructions: [],
    },
    ...MOCK_RECIPES.filter((r) => r.category === "Drink"),
    {
      id: "id-air-kelapa",
      title: "Air Kelapa Muda Segar",
      category: "Drink",
      calories: 85,
      prepTimeMinutes: 2,
      difficulty: "Easy",
      description: "Air kelapa muda murni dengan daging kelapa lembut penambah elektrolit.",
      svgIcon: "Drinks",
      nutrition: { proteinGrams: 2, carbsGrams: 18, fatGrams: 1, fiberGrams: 3 },
      ingredients: [],
      instructions: [],
    },
  ],
};

export const MealLogModal: React.FC<MealLogModalProps> = ({
  visible,
  meal,
  onClose,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedMealType, setSelectedMealType] = useState<JournalCategory | null>(null);
  const [activeMeal, setActiveMeal] = useState<FoodItem | null>(null);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customTitle, setCustomTitle] = useState<string>("");
  const [customCaloriesInput, setCustomCaloriesInput] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmation, setConfirmation] = useState<{
    entry: JournalEntry;
    mealType: JournalCategory;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sheetScale = useSharedValue<number>(AnimationScales.modalEntry);
  const sheetTranslateY = useSharedValue<number>(AnimationDistances.modalSlideY);
  const sheetOpacity = useSharedValue<number>(0);

  const isSlotTrigger = !!meal?.id?.startsWith("custom-");
  const isDrinkSlot = meal?.id === "custom-drink" || meal?.category === "Drink" || meal?.svgIcon === "Drinks";

  useEffect(() => {
    if (visible && meal) {
      setQuantity(1);
      setIsSubmitting(false);
      setConfirmation(null);
      setErrorMessage(null);
      setIsCustomMode(false);

      const initialCategory: JournalCategory =
        meal.category === "Breakfast" ||
        meal.category === "Lunch" ||
        meal.category === "Dinner" ||
        meal.category === "Snack"
          ? meal.category
          : "Snack";

      setSelectedMealType(initialCategory);

      // If opened from a generic slot card on Home ("custom-*"), pick the first real preset menu
      // so the user immediately sees a concrete food/drink name instead of a vague label.
      if (meal.id.startsWith("custom-")) {
        const presetKey = meal.id === "custom-drink" ? "Drink" : initialCategory;
        const presets = QUICK_MENU_PRESETS[presetKey] || QUICK_MENU_PRESETS.Breakfast;
        const firstPreset = presets[0] || meal;
        setActiveMeal(firstPreset);
        setCustomTitle(firstPreset.title);
        setCustomCaloriesInput(String(firstPreset.calories));
      } else {
        setActiveMeal(meal);
        setCustomTitle(meal.title);
        setCustomCaloriesInput(String(meal.calories));
      }

      sheetScale.value = AnimationScales.modalEntry;
      sheetTranslateY.value = AnimationDistances.modalSlideY;
      sheetOpacity.value = 0;

      sheetScale.value = withSpring(1, AnimationEasings.appleDefaultSpring);
      sheetTranslateY.value = withSpring(0, AnimationEasings.appleDefaultSpring);
      sheetOpacity.value = withTiming(1, {
        duration: MotionDurations.enter,
        easing: Easing.bezier(...MotionCurves.out),
      });
    }
  }, [visible, meal]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [
      { translateY: sheetTranslateY.value },
      { scale: sheetScale.value },
    ],
  }));

  const currentMeal = activeMeal || meal;

  const menuOptions = useMemo(() => {
    if (!meal) return [];
    const key = isDrinkSlot ? "Drink" : selectedMealType || "Breakfast";
    const list = QUICK_MENU_PRESETS[key] || QUICK_MENU_PRESETS.Breakfast;
    // If opened from a specific recipe not in the top presets, put it first
    if (!meal.id.startsWith("custom-") && !list.some((item) => item.id === meal.id)) {
      return [meal, ...list];
    }
    return list;
  }, [meal, isDrinkSlot, selectedMealType]);

  if (!meal || !currentMeal) return null;

  const resolvedTitle = isCustomMode
    ? customTitle.trim() || "Makanan kustom"
    : currentMeal.title;

  const parsedCustomKcal = parseInt(customCaloriesInput.replace(/[^0-9]/g, ""), 10);
  const baseCalories = isCustomMode
    ? Number.isFinite(parsedCustomKcal) && parsedCustomKcal > 0
      ? parsedCustomKcal
      : currentMeal.calories || 250
    : currentMeal.calories || 0;

  const totalCalories = Math.round(baseCalories * quantity);

  // Scale macros proportionally when custom calories are edited
  const calorieRatio =
    isCustomMode && currentMeal.calories > 0 ? baseCalories / currentMeal.calories : 1;

  const scaledProtein =
    Math.round((currentMeal.nutrition?.proteinGrams ?? 0) * calorieRatio * quantity * 10) / 10;
  const scaledCarbs =
    Math.round((currentMeal.nutrition?.carbsGrams ?? 0) * calorieRatio * quantity * 10) / 10;
  const scaledFat =
    Math.round((currentMeal.nutrition?.fatGrams ?? 0) * calorieRatio * quantity * 10) / 10;
  const scaledFiber =
    Math.round((currentMeal.nutrition?.fiberGrams ?? 0) * calorieRatio * quantity * 10) / 10;

  // Bar chart segments directly reflect the 4 gram values shown in the legend below it
  const macroItems = [
    { key: "p", label: "Protein", grams: scaledProtein, color: MACRO.protein },
    { key: "c", label: "Karbo", grams: scaledCarbs, color: MACRO.carbs },
    { key: "f", label: "Lemak", grams: scaledFat, color: MACRO.fat },
    { key: "fb", label: "Serat", grams: scaledFiber, color: MACRO.fiber },
  ];

  const isFormValid =
    !!selectedMealType &&
    quantity > 0 &&
    resolvedTitle.trim().length > 0 &&
    baseCalories > 0 &&
    !isSubmitting;

  const handleSelectPreset = (item: FoodItem) => {
    setIsCustomMode(false);
    setActiveMeal(item);
    setCustomTitle(item.title);
    setCustomCaloriesInput(String(item.calories));
  };

  const handleEnableCustomMode = () => {
    if (!isCustomMode) {
      setIsCustomMode(true);
      setCustomTitle(currentMeal.title);
      setCustomCaloriesInput(String(currentMeal.calories));
    } else {
      setIsCustomMode(false);
    }
  };

  const handleMealTimeChange = (type: JournalCategory) => {
    setSelectedMealType(type);
    // If opened from a Home slot card and not in custom mode, update preset to match the chosen meal time
    if (isSlotTrigger && !isDrinkSlot && !isCustomMode) {
      const nextList = QUICK_MENU_PRESETS[type] || [];
      if (nextList.length > 0) {
        setActiveMeal(nextList[0]);
        setCustomTitle(nextList[0].title);
        setCustomCaloriesInput(String(nextList[0].calories));
      }
    }
  };

  const handleIncrement = () => {
    if (quantity < 10) {
      setQuantity((q) => Math.min(10, Math.round((q + 0.5) * 10) / 10));
    }
  };

  const handleDecrement = () => {
    if (quantity > 0.5) {
      setQuantity((q) => Math.max(0.5, Math.round((q - 0.5) * 10) / 10));
    }
  };

  const handleLog = async () => {
    if (!isFormValid || isSubmitting || !selectedMealType) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const entry = await useJournalStore.getState().addEntry({
        mealId: isCustomMode ? `custom-${Date.now()}` : currentMeal.id,
        title: resolvedTitle,
        category: selectedMealType,
        calories: totalCalories,
        baseCalories,
        quantity,
        proteinGrams: scaledProtein,
        carbsGrams: scaledCarbs,
        fatGrams: scaledFat,
        fiberGrams: scaledFiber,
      });

      setConfirmation({
        entry,
        mealType: selectedMealType,
      });

      if (onSuccess) {
        onSuccess(entry);
      }

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 650);
    } catch {
      setIsSubmitting(false);
      setErrorMessage("Belum bisa menyimpan ke jurnal. Silakan coba lagi.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end sm:justify-center items-center p-0 sm:p-4"
      >
        <Pressable
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(18, 24, 20, 0.42)" }]}
          accessibilityRole="button"
          accessibilityLabel="Tutup jendela pencatatan"
        />

        <Animated.View
          style={[sheetAnimatedStyle, { width: "100%", maxWidth: 480, maxHeight: "92%", zIndex: 10 }]}
        >
          <View
            style={[
              { boxShadow: SURFACE_SHADOW } as ViewStyle,
              { paddingBottom: Platform.OS === "web" ? 20 : Math.max(insets.bottom, 16) },
            ]}
            className="w-full bg-card rounded-t-[26px] sm:rounded-[26px] px-5 pt-4 border-t sm:border border-line"
          >
            {/* Drag Handle Indicator on Mobile */}
            <View className="w-10 h-1 rounded-full bg-line-2 self-center mb-3 sm:hidden" />

            {/* Header */}
            <View className="flex-row justify-between items-center pb-3 border-b border-line">
              <AppText weight="semibold" className="text-[19px] text-ink" style={{ letterSpacing: -0.3 }}>
                Catat makan
              </AppText>
              <RingButton icon="close" accessibilityLabel="Tutup" onPress={onClose} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" className="flex-shrink">
              {confirmation ? (
                <View className="my-5 p-6 rounded-[20px] bg-primary-light items-center justify-center">
                  <View className="w-12 h-12 rounded-full bg-primary items-center justify-center mb-3">
                    <LineIcon name="check" size={22} color="#ffffff" strokeWidth={2.4} />
                  </View>
                  <AppText weight="bold" className="text-[17px] text-primary-text">
                    Tercatat di {mealLabel(confirmation.mealType)}
                  </AppText>
                  <AppText weight="semibold" className="text-[13px] text-ink mt-1 text-center" style={tnum}>
                    {resolvedTitle} · +{confirmation.entry.calories} kcal
                  </AppText>
                </View>
              ) : (
                <View className="pt-3.5 gap-3.5">
                  {errorMessage && (
                    <View className="p-3 bg-bad-soft rounded-2xl">
                      <AppText weight="semibold" className="text-xs text-bad text-center">
                        {errorMessage}
                      </AppText>
                    </View>
                  )}

                  {/* Quick Menu Selector Strip: Resolves "apa yang dicatat / mana nama makanannya" */}
                  <View>
                    <View className="flex-row items-center justify-between mb-2">
                      <AppText weight="semibold" className="text-[13px] text-ink">
                        {isDrinkSlot ? "Pilih minuman" : `Pilihan menu ${mealLabel(selectedMealType || "Breakfast").toLowerCase()}`}
                      </AppText>
                      <Pressable
                        onPress={handleEnableCustomMode}
                        hitSlop={8}
                        className="flex-row items-center gap-1"
                        accessibilityRole="button"
                        accessibilityLabel="Ketik nama makanan sendiri"
                      >
                        <LineIcon name="edit" size={12} color="#0e7a52" strokeWidth={2} />
                        <AppText weight="semibold" className="text-[12px] text-primary-text">
                          {isCustomMode ? "Pilih dari daftar" : "Ketik sendiri"}
                        </AppText>
                      </Pressable>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8, paddingRight: 4 }}
                    >
                      {menuOptions.map((item) => {
                        const isSelected = !isCustomMode && currentMeal.id === item.id;
                        return (
                          <PressableScale
                            key={item.id}
                            onPress={() => handleSelectPreset(item)}
                            pressedScale={0.96}
                            className={`px-3 py-2 rounded-[14px] flex-row items-center gap-2 border ${
                              isSelected
                                ? "bg-primary-light border-primary"
                                : "bg-card border-line"
                            }`}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            accessibilityLabel={`Pilih ${item.title}, ${item.calories} kalori`}
                          >
                            <View className="w-6 h-6 rounded-[7px] overflow-hidden bg-card-2 flex-shrink-0 border border-line">
                              <Image
                                source={
                                  item.imageUrl
                                    ? { uri: item.imageUrl }
                                    : getMealIllustration(
                                        item.svgIcon === "Drinks" ? "Drinks" : item.category
                                      )
                                }
                                style={{ width: "100%", height: "100%" }}
                                resizeMode="cover"
                              />
                            </View>
                            <View>
                              <AppText
                                weight="semibold"
                                numberOfLines={1}
                                className={`text-[12.5px] ${
                                  isSelected ? "text-primary-text" : "text-ink"
                                }`}
                                style={{ maxWidth: 145 }}
                              >
                                {item.title}
                              </AppText>
                              <AppText
                                weight="medium"
                                className="text-[10.5px] text-muted"
                                style={tnum}
                              >
                                {item.calories} kcal
                              </AppText>
                            </View>
                          </PressableScale>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* 1. Hero Meal & Live Nutrition Card (Preserving exact design from screenshot) */}
                  <View className="rounded-[18px] bg-card-2 border border-line p-3.5">
                    <View className="flex-row items-center">
                      <View className="w-14 h-14 rounded-[14px] bg-card items-center justify-center mr-3 overflow-hidden flex-shrink-0 border border-line">
                        <Image
                          source={
                            !isCustomMode && currentMeal.imageUrl
                              ? { uri: currentMeal.imageUrl }
                              : getMealIllustration(
                                  isDrinkSlot || currentMeal.svgIcon === "Drinks"
                                    ? "Drinks"
                                    : selectedMealType || currentMeal.category
                                )
                          }
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                      </View>

                      <View className="flex-1 min-w-0 mr-2.5">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <StatusPill
                            label={isDrinkSlot ? "Minuman" : mealLabel(selectedMealType || currentMeal.category)}
                            tone="accent"
                            dot={false}
                          />
                          <AppText weight="medium" className="text-[11px] text-muted">
                            · Nama menu
                          </AppText>
                        </View>
                        <AppText
                          weight="semibold"
                          numberOfLines={2}
                          className="text-[15.5px] text-ink leading-5 mt-1"
                        >
                          {resolvedTitle}
                        </AppText>
                      </View>

                      <View className="items-end flex-shrink-0">
                        <AppText
                          weight="bold"
                          className="text-[24px] text-primary-text"
                          style={[tnum, { letterSpacing: -0.5, lineHeight: 26 }]}
                        >
                          {totalCalories}
                        </AppText>
                        <AppText weight="semibold" className="text-[11.5px] text-muted">
                          kcal
                        </AppText>
                      </View>
                    </View>

                    {/* Optional Inline Custom Food Name & Calorie Editor */}
                    {isCustomMode && (
                      <View className="mt-3 pt-3 border-t border-line gap-2">
                        <View className="flex-row gap-2">
                          <View className="flex-[2]">
                            <AppText weight="semibold" className="text-[11.5px] text-muted mb-1">
                              Nama makanan / minuman
                            </AppText>
                            <TextInput
                              value={customTitle}
                              onChangeText={setCustomTitle}
                              placeholder="Contoh: Nasi Ayam Bakar"
                              placeholderTextColor="#8c9690"
                              className="h-10 px-3 rounded-[12px] bg-card border border-line text-[13.5px] text-ink"
                              style={{ fontFamily: "Urbanist_600SemiBold" }}
                            />
                          </View>
                          <View className="flex-1">
                            <AppText weight="semibold" className="text-[11.5px] text-muted mb-1">
                              Kalori / porsi
                            </AppText>
                            <TextInput
                              value={customCaloriesInput}
                              onChangeText={setCustomCaloriesInput}
                              keyboardType="numeric"
                              placeholder="250"
                              placeholderTextColor="#8c9690"
                              className="h-10 px-3 rounded-[12px] bg-card border border-line text-[13.5px] text-ink"
                              style={[{ fontFamily: "Urbanist_700Bold" }, tnum]}
                            />
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Accurate 4-Nutrient Bar Chart + Matching 4-Item Legend */}
                    <View className="mt-3 pt-2.5 border-t border-line">
                      <MixBar
                        height={8}
                        minSegmentWidth={6}
                        accessibilityLabel={`Komposisi nutrisi: Protein ${scaledProtein}g, Karbo ${scaledCarbs}g, Lemak ${scaledFat}g, Serat ${scaledFiber}g`}
                        segments={macroItems.map((m) => ({
                          key: m.key,
                          label: m.label,
                          value: m.grams,
                          color: m.color,
                        }))}
                      />
                      <View className="flex-row items-center justify-between flex-wrap gap-y-1 mt-2">
                        {macroItems.map((m) => (
                          <View key={m.key} className="flex-row items-center gap-1.5">
                            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                            <AppText weight="medium" className="text-[11.5px] text-muted">
                              {m.label}
                            </AppText>
                            <AppText weight="bold" className="text-[12px] text-ink" style={tnum}>
                              {m.grams}g
                            </AppText>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* 2. Single Unified Portion Control */}
                  <View className="flex-row justify-between items-center rounded-[18px] bg-card border border-line px-3.5 py-2.5">
                    <AppText weight="semibold" className="text-[14.5px] text-ink">
                      Porsi
                    </AppText>

                    <View className="flex-row items-center bg-card-2 border border-line rounded-full p-1 flex-shrink-0">
                      <PressableScale
                        onPress={handleDecrement}
                        disabled={quantity <= 0.5 || isSubmitting}
                        className="w-9 h-9 rounded-full bg-card border border-line items-center justify-center"
                        accessibilityRole="button"
                        accessibilityLabel="Kurangi porsi"
                      >
                        <LineIcon
                          name="minus"
                          size={15}
                          color={quantity <= 0.5 ? "#9aa39e" : "#121a16"}
                          strokeWidth={2.2}
                        />
                      </PressableScale>

                      <View className="w-16 items-center justify-center px-1">
                        <AppText weight="bold" className="text-[15px] text-ink" style={tnum}>
                          {quantity}x
                        </AppText>
                        <AppText weight="medium" className="text-[10px] text-muted -mt-0.5">
                          porsi
                        </AppText>
                      </View>

                      <PressableScale
                        onPress={handleIncrement}
                        disabled={quantity >= 10 || isSubmitting}
                        className="w-9 h-9 rounded-full bg-card border border-line items-center justify-center"
                        accessibilityRole="button"
                        accessibilityLabel="Tambah porsi"
                      >
                        <LineIcon
                          name="plus"
                          size={15}
                          color={quantity >= 10 ? "#9aa39e" : "#121a16"}
                          strokeWidth={2.2}
                        />
                      </PressableScale>
                    </View>
                  </View>

                  {/* 3. Meal Time Selection — Clean 2x2 Grid */}
                  <View>
                    <AppText weight="semibold" className="text-[13.5px] text-ink mb-2">
                      Waktu makan
                    </AppText>

                    <View className="gap-2">
                      {MEAL_TYPE_ROWS.map((row, rowIdx) => (
                        <View key={rowIdx} className="flex-row gap-2">
                          {row.map((type) => {
                            const isSelected = selectedMealType === type;
                            return (
                              <PressableScale
                                key={type}
                                onPress={() => handleMealTimeChange(type)}
                                disabled={isSubmitting}
                                pressedScale={0.97}
                                className={`flex-1 min-h-[46px] px-2.5 py-1.5 rounded-[14px] flex-row items-center gap-2 border ${
                                  isSelected ? "bg-block-ink border-block-ink" : "bg-card border-line-2"
                                }`}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected }}
                                accessibilityLabel={`Catat sebagai ${mealLabel(type)}`}
                              >
                                <View className="w-7 h-7 rounded-[8px] overflow-hidden bg-card-2 flex-shrink-0 border border-black/10">
                                  <Image
                                    source={getMealIllustration(type)}
                                    style={{ width: "100%", height: "100%" }}
                                    resizeMode="cover"
                                  />
                                </View>
                                <AppText
                                  weight="semibold"
                                  numberOfLines={1}
                                  className={`text-[13px] flex-1 ${isSelected ? "text-block-on-ink" : "text-ink"}`}
                                >
                                  {mealLabel(type)}
                                </AppText>
                                {isSelected && (
                                  <LineIcon name="check" size={14} color="#f2f6f3" strokeWidth={2.3} />
                                )}
                              </PressableScale>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* 4. Focused Primary Submit Action */}
                  <View className="pt-1">
                    <PillButton
                      label={isSubmitting ? "Menyimpan..." : "Simpan"}
                      variant="primary"
                      icon="check"
                      disabled={!isFormValid}
                      onPress={handleLog}
                      className="w-full"
                      accessibilityLabel="Simpan"
                    />
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
