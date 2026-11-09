import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "./AppText";
import { Button } from "./Button";
import { PressableScale } from "./PressableScale";
import { LineIcon } from "./LineIcon";
import { MixBar, SURFACE_SHADOW } from "./Surface";
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
import { FoodItem } from "@/data/mockRecipes";
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

export const MealLogModal: React.FC<MealLogModalProps> = ({
  visible,
  meal,
  onClose,
  onSuccess,
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedMealType, setSelectedMealType] = useState<JournalCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmation, setConfirmation] = useState<{
    entry: JournalEntry;
    mealType: JournalCategory;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sheetScale = useSharedValue<number>(AnimationScales.modalEntry);
  const sheetTranslateY = useSharedValue<number>(AnimationDistances.modalSlideY);
  const sheetOpacity = useSharedValue<number>(0);

  useEffect(() => {
    if (visible && meal) {
      setQuantity(1);
      setIsSubmitting(false);
      setConfirmation(null);
      setErrorMessage(null);

      if (
        meal.category === "Breakfast" ||
        meal.category === "Lunch" ||
        meal.category === "Dinner" ||
        meal.category === "Snack"
      ) {
        setSelectedMealType(meal.category);
      } else {
        setSelectedMealType("Breakfast");
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

  if (!meal) return null;

  const baseCalories = meal.calories || 0;
  const totalCalories = Math.round(baseCalories * quantity);
  const scaledProtein = Math.round((meal.nutrition?.proteinGrams ?? 0) * quantity * 10) / 10;
  const scaledCarbs = Math.round((meal.nutrition?.carbsGrams ?? 0) * quantity * 10) / 10;
  const scaledFat = Math.round((meal.nutrition?.fatGrams ?? 0) * quantity * 10) / 10;
  const scaledFiber = Math.round((meal.nutrition?.fiberGrams ?? 0) * quantity * 10) / 10;

  const kcalP = Math.max(1, scaledProtein * 4);
  const kcalC = Math.max(1, scaledCarbs * 4);
  const kcalF = Math.max(1, scaledFat * 9);
  const kcalSum = Math.max(1, kcalP + kcalC + kcalF);
  const pctP = Math.round((kcalP / kcalSum) * 100);
  const pctC = Math.round((kcalC / kcalSum) * 100);
  const pctF = Math.max(0, 100 - pctP - pctC);

  const isFormValid = !!selectedMealType && quantity > 0 && !isSubmitting;

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
        mealId: meal.id,
        title: meal.title,
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
          style={[sheetAnimatedStyle, { width: "100%", maxWidth: 480, maxHeight: "88%", zIndex: 10 }]}
        >
          <View
            style={{ boxShadow: SURFACE_SHADOW } as ViewStyle}
            className="w-full bg-card rounded-t-[24px] sm:rounded-[24px] px-5 pt-3 pb-5 border-t sm:border border-line"
          >
            {/* Subtle Sheet Handle */}
            <View className="w-9 h-1 rounded-full bg-line-2 self-center mb-2.5 sm:hidden" />

            {/* Compact Header with Quiet Close Control */}
            <View className="flex-row justify-between items-center pb-3">
              <AppText weight="semibold" className="text-[17px] text-ink" style={{ letterSpacing: -0.3 }}>
                Catat ke jurnal harian
              </AppText>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                className="w-8 h-8 rounded-full bg-card-2 items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Tutup jendela"
              >
                <LineIcon name="close" size={15} color="#56605a" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" className="flex-shrink">
              {confirmation ? (
                <View className="my-4 p-5 rounded-[18px] bg-primary-light items-center justify-center">
                  <View className="w-11 h-11 rounded-full bg-primary items-center justify-center mb-2.5">
                    <LineIcon name="check" size={20} color="#ffffff" strokeWidth={2.4} />
                  </View>
                  <AppText weight="bold" className="text-[16px] text-primary-text">
                    Tersimpan di {mealLabel(confirmation.mealType)}
                  </AppText>
                  <AppText weight="semibold" className="text-[13px] text-ink mt-1 text-center" style={tnum}>
                    {meal.title} · +{confirmation.entry.calories} kcal
                  </AppText>
                </View>
              ) : (
                <View className="gap-3.5">
                  {errorMessage && (
                    <View className="p-3 bg-bad-soft rounded-xl">
                      <AppText weight="semibold" className="text-xs text-bad text-center">
                        {errorMessage}
                      </AppText>
                    </View>
                  )}

                  {/* Meal Identity & Total Calorie Focal Box */}
                  <View className="flex-row items-center p-3 rounded-[16px] bg-card-2 border border-line">
                    <View className="w-13 h-13 rounded-[12px] bg-card items-center justify-center mr-3 overflow-hidden flex-shrink-0 border border-line">
                      <Image
                        source={
                          meal.imageUrl
                            ? { uri: meal.imageUrl }
                            : getMealIllustration(
                                meal.svgIcon === "Drinks"
                                  ? "Drinks"
                                  : selectedMealType || meal.category
                              )
                        }
                        style={{ width: 52, height: 52 }}
                        resizeMode="cover"
                      />
                    </View>

                    <View className="flex-1 mr-2 min-w-0">
                      <AppText weight="semibold" numberOfLines={2} className="text-[15px] text-ink leading-5">
                        {meal.title}
                      </AppText>
                      <AppText weight="medium" className="text-[12px] text-muted mt-0.5" style={tnum}>
                        {baseCalories} kcal / porsi
                      </AppText>
                    </View>

                    <View className="px-3 py-1.5 rounded-[12px] bg-primary-light items-end flex-shrink-0">
                      <AppText
                        weight="bold"
                        className="text-[20px] text-primary-text"
                        style={[tnum, { letterSpacing: -0.4, lineHeight: 22 }]}
                      >
                        {totalCalories}
                      </AppText>
                      <AppText weight="semibold" className="text-[10.5px] text-primary-text">
                        kcal total
                      </AppText>
                    </View>
                  </View>

                  {/* Contextual Macronutrient Breakdown */}
                  <View className="px-3.5 py-3 rounded-[16px] bg-card border border-line">
                    <View className="flex-row items-center justify-between mb-2">
                      <AppText weight="semibold" className="text-[12.5px] text-ink">
                        Komposisi makronutrisi
                      </AppText>
                      {scaledFiber > 0 && (
                        <AppText weight="medium" className="text-[11.5px] text-muted" style={tnum}>
                          Serat {scaledFiber} g
                        </AppText>
                      )}
                    </View>
                    <MixBar
                      height={8}
                      segments={[
                        { key: "p", value: kcalP, color: MACRO.protein },
                        { key: "c", value: kcalC, color: MACRO.carbs },
                        { key: "f", value: kcalF, color: MACRO.fat },
                      ]}
                    />
                    <View className="flex-row items-center justify-between mt-2.5">
                      {[
                        { label: "Protein", val: `${scaledProtein}g`, pct: `${pctP}%`, color: MACRO.protein },
                        { label: "Karbo", val: `${scaledCarbs}g`, pct: `${pctC}%`, color: MACRO.carbs },
                        { label: "Lemak", val: `${scaledFat}g`, pct: `${pctF}%`, color: MACRO.fat },
                      ].map((m) => (
                        <View key={m.label} className="flex-row items-center gap-1.5">
                          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                          <AppText weight="medium" className="text-[12px] text-muted">
                            {m.label}
                          </AppText>
                          <AppText weight="bold" className="text-[12.5px] text-ink" style={tnum}>
                            {m.val}
                          </AppText>
                          <AppText weight="medium" className="text-[11px] text-muted" style={tnum}>
                            ({m.pct})
                          </AppText>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Single Unified Portion Control (No Duplicate Quick-Chip Row) */}
                  <View className="flex-row items-center justify-between px-3.5 py-2.5 rounded-[16px] bg-card border border-line">
                    <View className="flex-1 mr-3">
                      <AppText weight="semibold" className="text-[14px] text-ink">
                        Jumlah porsi
                      </AppText>
                      <AppText weight="medium" className="text-[12px] text-muted">
                        Ketuk – atau + (kelipatan 0,5 porsi)
                      </AppText>
                    </View>

                    <View className="flex-row items-center bg-card-2 border border-line rounded-full p-1 flex-shrink-0">
                      <PressableScale
                        onPress={handleDecrement}
                        disabled={quantity <= 0.5 || isSubmitting}
                        className="w-9 h-9 rounded-full bg-card items-center justify-center"
                        accessibilityRole="button"
                        accessibilityLabel="Kurangi porsi"
                      >
                        <LineIcon name="minus" size={15} color="#121a16" strokeWidth={2.2} />
                      </PressableScale>

                      <View className="min-w-[64px] px-2 items-center justify-center">
                        <AppText weight="bold" className="text-[15px] text-ink" style={tnum}>
                          {quantity} porsi
                        </AppText>
                      </View>

                      <PressableScale
                        onPress={handleIncrement}
                        disabled={quantity >= 10 || isSubmitting}
                        className="w-9 h-9 rounded-full bg-card items-center justify-center"
                        accessibilityRole="button"
                        accessibilityLabel="Tambah porsi"
                      >
                        <LineIcon name="plus" size={15} color="#121a16" strokeWidth={2.2} />
                      </PressableScale>
                    </View>
                  </View>

                  {/* Clear Meal Time Selector */}
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
                                onPress={() => setSelectedMealType(type)}
                                disabled={isSubmitting}
                                pressedScale={0.97}
                                className={`flex-1 h-[44px] px-3 rounded-[14px] flex-row items-center justify-between border ${
                                  isSelected
                                    ? "bg-primary border-primary"
                                    : "bg-card border-line-2"
                                }`}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: isSelected }}
                                accessibilityLabel={`Catat sebagai ${mealLabel(type)}`}
                              >
                                <View className="flex-row items-center gap-2 min-w-0 flex-1">
                                  <View className="w-6 h-6 rounded-[7px] overflow-hidden bg-card-2 flex-shrink-0">
                                    <Image
                                      source={getMealIllustration(type)}
                                      style={{ width: "100%", height: "100%" }}
                                      resizeMode="cover"
                                    />
                                  </View>
                                  <AppText
                                    weight="semibold"
                                    numberOfLines={1}
                                    className={`text-[13px] flex-1 ${
                                      isSelected ? "text-white" : "text-ink"
                                    }`}
                                  >
                                    {mealLabel(type)}
                                  </AppText>
                                </View>
                                {isSelected && (
                                  <LineIcon name="check" size={14} color="#ffffff" strokeWidth={2.5} />
                                )}
                              </PressableScale>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Primary Action + Quiet Cancel Link Hierarchy */}
                  <View className="pt-1 items-center">
                    <Button
                      title={
                        isSubmitting
                          ? "Menyimpan..."
                          : `Simpan ke ${mealLabel(selectedMealType || "Breakfast")} · ${totalCalories} kcal`
                      }
                      variant="primary"
                      size="md"
                      loading={isSubmitting}
                      disabled={!isFormValid}
                      onPress={handleLog}
                      className="w-full"
                      accessibilityLabel="Konfirmasi catat makanan ke jurnal"
                    />

                    <Pressable
                      onPress={onClose}
                      disabled={isSubmitting}
                      hitSlop={8}
                      className="mt-2.5 py-1.5 px-4"
                      accessibilityRole="button"
                      accessibilityLabel="Batal mencatat"
                    >
                      <AppText weight="semibold" className="text-[13px] text-muted">
                        Batal
                      </AppText>
                    </Pressable>
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
