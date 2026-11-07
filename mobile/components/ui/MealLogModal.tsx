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
  useWindowDimensions,
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
import {
  IconRenderer,
  CloseIconSvg,
  CheckIconSvg,
  MinusIconSvg,
  PlusIconSvg,
} from "@/constants/Assets";
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

const MEAL_TYPES: JournalCategory[] = ["Breakfast", "Lunch", "Dinner", "Snack"];
const QUICK_PORTIONS = [0.5, 1, 1.5, 2, 3];

export const MealLogModal: React.FC<MealLogModalProps> = ({
  visible,
  meal,
  onClose,
  onSuccess,
}) => {
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;

  const [quantity, setQuantity] = useState<number>(1);
  const [selectedMealType, setSelectedMealType] = useState<JournalCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmation, setConfirmation] = useState<{
    entry: JournalEntry;
    mealType: JournalCategory;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sheet entrance animation (never from scale(0), starts at 0.96 + 16px rise)
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
  const scaledProtein = Math.round(((meal.nutrition?.proteinGrams ?? 0) * quantity) * 10) / 10;
  const scaledCarbs = Math.round(((meal.nutrition?.carbsGrams ?? 0) * quantity) * 10) / 10;
  const scaledFat = Math.round(((meal.nutrition?.fatGrams ?? 0) * quantity) * 10) / 10;
  const scaledFiber = Math.round(((meal.nutrition?.fiberGrams ?? 0) * quantity) * 10) / 10;

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
      }, 750);
    } catch {
      setIsSubmitting(false);
      setErrorMessage("Belum bisa menyimpan ke jurnal. Silakan coba lagi.");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-end sm:justify-center items-center p-0 sm:p-4"
      >
        <Pressable
          onPress={onClose}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(18, 24, 20, 0.45)" },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Tutup jendela pencatatan"
        />

        <Animated.View
          style={sheetAnimatedStyle}
          className="w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 border-t sm:border border-[#ebe9e2] max-h-[92%] z-10"
        >
          {/* Header */}
          <View className="flex-row justify-between items-center pb-3.5 border-b border-[#f0eee8]">
            <View className="flex-1 pr-3">
              <AppText weight="black" className="text-xl text-neutral-dark" style={{ letterSpacing: -0.4 }}>
                Catat ke jurnal
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
                Atur jumlah porsi dan waktu makan
              </AppText>
            </View>

            <PressableScale
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="w-10 h-10 rounded-full bg-[#f4f3ee] items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Tutup jendela"
            >
              <CloseIconSvg size={16} color="#5a625b" />
            </PressableScale>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            className="flex-shrink"
          >
            {confirmation ? (
              <View className="my-6 p-6 rounded-2xl bg-primary-light items-center justify-center">
                <View className="w-12 h-12 rounded-full bg-primary items-center justify-center mb-3">
                  <CheckIconSvg size={22} color="#ffffff" strokeWidth={2.8} />
                </View>
                <AppText weight="black" className="text-base text-primary">
                  Tercatat di {mealLabel(confirmation.mealType)}
                </AppText>
                <AppText
                  weight="semibold"
                  className="text-xs text-neutral-dark mt-1 text-center"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {meal.title} · +{confirmation.entry.calories} kcal
                </AppText>
              </View>
            ) : (
              <View>
                {errorMessage && (
                  <View className="mt-3 p-3 bg-status-error/10 border border-status-error/20 rounded-xl">
                    <AppText weight="semibold" className="text-xs text-status-error text-center">
                      {errorMessage}
                    </AppText>
                  </View>
                )}

                {/* Meal Summary Row */}
                <View className="flex-row items-center py-4 border-b border-[#f0eee8]">
                  <View className="w-14 h-14 rounded-2xl bg-[#f2f1ec] items-center justify-center mr-3 border border-black/[0.05] overflow-hidden flex-shrink-0">
                    {meal.imageUrl ? (
                      <Image
                        source={{ uri: meal.imageUrl }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <IconRenderer name={meal.svgIcon} size={34} />
                    )}
                  </View>

                  <View className="flex-1 mr-2 min-w-0">
                    <AppText weight="bold" numberOfLines={1} className="text-base text-neutral-dark">
                      {meal.title}
                    </AppText>
                    <AppText
                      weight="medium"
                      className="text-xs text-neutral-muted mt-0.5"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {baseCalories} kcal per porsi standar
                    </AppText>
                  </View>

                  <View className="items-end flex-shrink-0">
                    <View className="flex-row items-baseline">
                      <AppText
                        weight="black"
                        className="text-2xl text-primary"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {totalCalories}
                      </AppText>
                      <AppText weight="semibold" className="text-xs text-neutral-muted ml-1">
                        kcal
                      </AppText>
                    </View>
                  </View>
                </View>

                {/* Live Macronutrient Strip */}
                <View className="py-3 px-3 bg-[#f7f6f1] rounded-2xl my-3 flex-row items-center justify-around">
                  <View className="items-center">
                    <AppText weight="medium" className="text-[11px] text-neutral-muted">
                      Protein
                    </AppText>
                    <AppText
                      weight="bold"
                      className="text-sm text-primary mt-0.5"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {scaledProtein} g
                    </AppText>
                  </View>
                  <View className="w-px h-6 bg-[#e5e3dc]" />
                  <View className="items-center">
                    <AppText weight="medium" className="text-[11px] text-neutral-muted">
                      Karbo
                    </AppText>
                    <AppText
                      weight="bold"
                      className="text-sm text-[#52796f] mt-0.5"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {scaledCarbs} g
                    </AppText>
                  </View>
                  <View className="w-px h-6 bg-[#e5e3dc]" />
                  <View className="items-center">
                    <AppText weight="medium" className="text-[11px] text-neutral-muted">
                      Lemak
                    </AppText>
                    <AppText
                      weight="bold"
                      className="text-sm text-[#b45309] mt-0.5"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {scaledFat} g
                    </AppText>
                  </View>
                  {scaledFiber > 0 && (
                    <>
                      <View className="w-px h-6 bg-[#e5e3dc]" />
                      <View className="items-center">
                        <AppText weight="medium" className="text-[11px] text-neutral-muted">
                          Serat
                        </AppText>
                        <AppText
                          weight="bold"
                          className="text-sm text-neutral-dark mt-0.5"
                          style={{ fontVariant: ["tabular-nums"] }}
                        >
                          {scaledFiber} g
                        </AppText>
                      </View>
                    </>
                  )}
                </View>

                {/* Portion Stepper */}
                <View className="py-3 border-b border-[#f0eee8]">
                  <View className="flex-row justify-between items-center mb-2.5">
                    <View>
                      <AppText weight="bold" className="text-sm text-neutral-dark">
                        Jumlah porsi
                      </AppText>
                      <AppText weight="medium" className="text-xs text-neutral-muted">
                        Sesuaikan dengan porsi makan Anda
                      </AppText>
                    </View>

                    <View className="flex-row items-center bg-[#f4f3ee] rounded-2xl p-1">
                      <PressableScale
                        onPress={handleDecrement}
                        disabled={quantity <= 0.5 || isSubmitting}
                        className="w-11 h-11 rounded-xl bg-white items-center justify-center"
                        accessibilityRole="button"
                        accessibilityLabel="Kurangi porsi"
                      >
                        <MinusIconSvg size={16} color="#1c201d" strokeWidth={2.4} />
                      </PressableScale>

                      <View className="w-14 items-center justify-center">
                        <AppText
                          weight="black"
                          className="text-base text-neutral-dark"
                          style={{ fontVariant: ["tabular-nums"] }}
                        >
                          {quantity}x
                        </AppText>
                        <AppText weight="medium" className="text-[10px] text-neutral-muted -mt-0.5">
                          porsi
                        </AppText>
                      </View>

                      <PressableScale
                        onPress={handleIncrement}
                        disabled={quantity >= 10 || isSubmitting}
                        className="w-11 h-11 rounded-xl bg-white items-center justify-center"
                        accessibilityRole="button"
                        accessibilityLabel="Tambah porsi"
                      >
                        <PlusIconSvg size={16} color="#1c201d" strokeWidth={2.4} />
                      </PressableScale>
                    </View>
                  </View>

                  <View className="flex-row gap-1.5 pt-1">
                    {QUICK_PORTIONS.map((p) => {
                      const isSelected = quantity === p;
                      return (
                        <PressableScale
                          key={p}
                          onPress={() => setQuantity(p)}
                          pressedScale={0.95}
                          className={`flex-1 h-9 rounded-xl items-center justify-center border ${
                            isSelected
                              ? "bg-primary border-primary"
                              : "bg-white border-[#e3e1da]"
                          }`}
                          accessibilityRole="button"
                          accessibilityLabel={`Pilih ${p} porsi`}
                        >
                          <AppText
                            weight={isSelected ? "bold" : "medium"}
                            className={`text-xs ${isSelected ? "text-white" : "text-neutral-dark"}`}
                            style={{ fontVariant: ["tabular-nums"] }}
                          >
                            {p}x
                          </AppText>
                        </PressableScale>
                      );
                    })}
                  </View>
                </View>

                {/* Meal Time Selection */}
                <View className="py-3.5">
                  <AppText weight="bold" className="text-sm text-neutral-dark mb-2">
                    Waktu makan
                  </AppText>

                  <View className="flex-row flex-wrap gap-2">
                    {MEAL_TYPES.map((type) => {
                      const isSelected = selectedMealType === type;
                      return (
                        <PressableScale
                          key={type}
                          onPress={() => setSelectedMealType(type)}
                          disabled={isSubmitting}
                          pressedScale={0.96}
                          className={`min-h-[44px] rounded-xl items-center justify-center border ${
                            isNarrow ? "w-[48%]" : "flex-1"
                          } ${
                            isSelected
                              ? "bg-primary border-primary"
                              : "bg-white border-[#e3e1da]"
                          }`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          accessibilityLabel={`Catat sebagai ${mealLabel(type)}`}
                        >
                          <AppText
                            weight={isSelected ? "bold" : "medium"}
                            className={`text-xs ${isSelected ? "text-white" : "text-neutral-dark"}`}
                          >
                            {mealLabel(type)}
                          </AppText>
                        </PressableScale>
                      );
                    })}
                  </View>
                </View>

                {/* Submit & Cancel */}
                <View className="pt-2 pb-1 gap-2">
                  <Button
                    title={
                      isSubmitting
                        ? "Menyimpan..."
                        : `Catat ${totalCalories} kcal ke ${mealLabel(selectedMealType || "Breakfast")}`
                    }
                    variant="primary"
                    loading={isSubmitting}
                    disabled={!isFormValid}
                    onPress={handleLog}
                    accessibilityLabel="Konfirmasi catat makanan ke jurnal"
                    className="w-full min-h-[48px]"
                  />

                  <PressableScale
                    onPress={onClose}
                    disabled={isSubmitting}
                    className="w-full min-h-[44px] rounded-full items-center justify-center"
                    accessibilityRole="button"
                    accessibilityLabel="Batal mencatat"
                  >
                    <AppText weight="bold" className="text-xs text-neutral-muted">
                      Batal
                    </AppText>
                  </PressableScale>
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
