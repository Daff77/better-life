import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  Modal,
  Pressable,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { AppText } from "./AppText";
import { Button } from "./Button";
import { Badge } from "./Badge";
import { IconRenderer, CloseIconSvg, CheckIconSvg, MinusIconSvg, PlusIconSvg } from "@/constants/Assets";
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

  // Initialize defaults whenever modal opens or meal changes
  useEffect(() => {
    if (visible && meal) {
      setQuantity(1);
      setIsSubmitting(false);
      setConfirmation(null);
      setErrorMessage(null);

      // Pre-select meal type if catalogue category matches standard journal categories
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
    }
  }, [visible, meal]);

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

      // Automatically dismiss modal after showing brief confirmation
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 900);
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage("Could not save to journal. Please try again.");
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
        {/* Backdrop as a separate full-screen layer */}
        <Pressable
          onPress={onClose}
          style={StyleSheet.absoluteFill}
          className="bg-black/50"
          accessibilityRole="button"
          accessibilityLabel="Dismiss modal backdrop"
        />

        {/* Sheet Container: Sibling to backdrop */}
        <View
          className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-neutral-border-light max-h-[92%] z-10"
        >
          {/* Header Bar */}
          <View className="flex-row justify-between items-center pb-3 border-b border-neutral-border-light">
            <View>
              <AppText weight="black" className="text-xl text-neutral-dark">
                Log to Daily Journal
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted">
                Track portion and live nutritional balance
              </AppText>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="w-9 h-9 rounded-full bg-neutral-surface items-center justify-center border border-neutral-border active:scale-95 transition-all"
              accessibilityRole="button"
              accessibilityLabel="Close meal log modal"
            >
              <CloseIconSvg size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            className="flex-shrink"
          >
            {/* Success Banner Confirmation */}
            {confirmation ? (
              <View
                className="my-5 p-5 rounded-2xl bg-[#daf2e5] border border-primary/30 items-center justify-center"
              >
                <View className="w-12 h-12 rounded-full bg-primary items-center justify-center mb-2 shadow-xs">
                  <CheckIconSvg size={22} color="#ffffff" strokeWidth={2.8} />
                </View>
                <AppText weight="black" className="text-base text-primary">
                  Added to {confirmation.mealType}
                </AppText>
                <AppText weight="semibold" className="text-xs text-neutral-dark mt-1 text-center">
                  {meal.title} • {confirmation.entry.calories} kcal logged
                </AppText>
              </View>
            ) : (
              <View>
                {/* Error Message if any */}
                {errorMessage && (
                  <View className="mt-3 p-3 bg-status-error/10 border border-status-error/20 rounded-xl">
                    <AppText weight="semibold" className="text-xs text-status-error text-center">
                      {errorMessage}
                    </AppText>
                  </View>
                )}

                {/* Meal Summary Row */}
                <View className="flex-row items-center py-3.5 border-b border-[#e5ece7]">
                  <View className="w-14 h-14 rounded-2xl bg-[#f2f8f4] items-center justify-center mr-3 border border-black/[0.08] overflow-hidden flex-shrink-0">
                    {meal.imageUrl ? (
                      <Image
                        source={{ uri: meal.imageUrl }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <IconRenderer name={meal.svgIcon} size={40} />
                    )}
                  </View>

                  <View className="flex-1 mr-2 min-w-0">
                    <AppText weight="extrabold" numberOfLines={1} className="text-base text-neutral-dark">
                      {meal.title}
                    </AppText>
                    <AppText
                      weight="medium"
                      className="text-xs text-neutral-muted mt-0.5"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {baseCalories} kcal per base serving
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

                {/* Live Macronutrient Breakdown Strip */}
                <View className="py-2.5 px-3 bg-[#f8faf8] rounded-xl border border-[#e5ece7] my-3 flex-row items-center justify-around">
                  <View className="items-center">
                    <AppText weight="extrabold" className="text-[10px] text-emerald-800 uppercase">
                      Protein
                    </AppText>
                    <AppText weight="black" className="text-xs text-neutral-dark mt-0.5">
                      {scaledProtein}g
                    </AppText>
                  </View>
                  <View className="w-px h-6 bg-[#e5ece7]" />
                  <View className="items-center">
                    <AppText weight="extrabold" className="text-[10px] text-amber-800 uppercase">
                      Carbs
                    </AppText>
                    <AppText weight="black" className="text-xs text-neutral-dark mt-0.5">
                      {scaledCarbs}g
                    </AppText>
                  </View>
                  <View className="w-px h-6 bg-[#e5ece7]" />
                  <View className="items-center">
                    <AppText weight="extrabold" className="text-[10px] text-sky-800 uppercase">
                      Fats
                    </AppText>
                    <AppText weight="black" className="text-xs text-neutral-dark mt-0.5">
                      {scaledFat}g
                    </AppText>
                  </View>
                  {scaledFiber > 0 && (
                    <>
                      <View className="w-px h-6 bg-[#e5ece7]" />
                      <View className="items-center">
                        <AppText weight="extrabold" className="text-[10px] text-teal-800 uppercase">
                          Fiber
                        </AppText>
                        <AppText weight="black" className="text-xs text-neutral-dark mt-0.5">
                          {scaledFiber}g
                        </AppText>
                      </View>
                    </>
                  )}
                </View>

                {/* Servings Stepper & Quick Pills */}
                <View className="py-3 border-b border-[#e5ece7]">
                  <View className="flex-row justify-between items-center mb-2.5">
                    <View>
                      <AppText weight="extrabold" className="text-xs text-neutral-dark uppercase tracking-wide">
                        Portion / Quantity
                      </AppText>
                      <AppText weight="medium" className="text-[11px] text-neutral-muted">
                        Select portions consumed
                      </AppText>
                    </View>

                    <View className="flex-row items-center bg-[#f2f8f4] rounded-2xl p-1 border border-[#e5ece7]">
                      <TouchableOpacity
                        onPress={handleDecrement}
                        disabled={quantity <= 0.5 || isSubmitting}
                        className={`w-11 h-11 rounded-xl items-center justify-center transition-all duration-150 ${
                          quantity <= 0.5 ? "opacity-30 bg-transparent" : "bg-white border border-[#e5ece7] shadow-2xs active:scale-[0.96]"
                        }`}
                        accessibilityRole="button"
                        accessibilityLabel="Decrease servings"
                      >
                        <MinusIconSvg size={16} color={quantity <= 0.5 ? "#9ca3af" : "#1f2937"} strokeWidth={2.4} />
                      </TouchableOpacity>

                      <View className="w-14 items-center justify-center">
                        <AppText
                          weight="black"
                          className="text-base text-neutral-dark"
                          style={{ fontVariant: ["tabular-nums"] }}
                        >
                          {quantity}x
                        </AppText>
                        <AppText weight="medium" className="text-[9px] text-neutral-muted -mt-0.5">
                          {quantity === 1 ? "portion" : "portions"}
                        </AppText>
                      </View>

                      <TouchableOpacity
                        onPress={handleIncrement}
                        disabled={quantity >= 10 || isSubmitting}
                        className={`w-11 h-11 rounded-xl items-center justify-center transition-all duration-150 ${
                          quantity >= 10 ? "opacity-30 bg-transparent" : "bg-white border border-[#e5ece7] shadow-2xs active:scale-[0.96]"
                        }`}
                        accessibilityRole="button"
                        accessibilityLabel="Increase servings"
                      >
                        <PlusIconSvg size={16} color={quantity >= 10 ? "#9ca3af" : "#1f2937"} strokeWidth={2.4} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Quick Portion Selector Chips */}
                  <View className="flex-row gap-1.5 pt-1">
                    {QUICK_PORTIONS.map((p) => {
                      const isSelected = quantity === p;
                      return (
                        <TouchableOpacity
                          key={p}
                          onPress={() => setQuantity(p)}
                          className={`flex-1 py-1.5 rounded-lg items-center justify-center border transition-all ${
                            isSelected
                              ? "bg-primary border-primary text-white"
                              : "bg-white border-[#e5ece7] hover:bg-emerald-50/50"
                          }`}
                          accessibilityRole="button"
                          accessibilityLabel={`Set portion to ${p}`}
                        >
                          <AppText
                            weight={isSelected ? "black" : "bold"}
                            className={`text-xs ${isSelected ? "text-white" : "text-neutral-dark"}`}
                          >
                            {p}x
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Meal Type Selection (Breakfast, Lunch, Dinner, Snack) */}
                <View className="py-3">
                  <AppText weight="extrabold" className="text-xs text-neutral-dark uppercase tracking-wide mb-2">
                    Meal Category
                  </AppText>

                  <View className={`flex-row flex-wrap gap-2 ${isNarrow ? "" : ""}`}>
                    {MEAL_TYPES.map((type) => {
                      const isSelected = selectedMealType === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          onPress={() => setSelectedMealType(type)}
                          disabled={isSubmitting}
                          className={`min-h-[44px] rounded-xl items-center justify-center border transition-all duration-150 active:scale-[0.98] ${
                            isNarrow ? "w-[48%]" : "flex-1"
                          } ${
                            isSelected
                              ? "bg-primary border-primary shadow-xs"
                              : "bg-neutral-surface border-neutral-border hover:bg-neutral-surface/80"
                          }`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          accessibilityLabel={`Log as ${type}`}
                        >
                          <AppText
                            weight={isSelected ? "black" : "bold"}
                            className={`text-xs ${isSelected ? "text-white" : "text-neutral-dark"}`}
                          >
                            {type}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Submit and Cancel Actions */}
                <View className="pt-2 pb-2 gap-2">
                  <Button
                    title={
                      isSubmitting
                        ? "Saving to Journal..."
                        : `Log ${totalCalories} kcal to ${selectedMealType || "Journal"}`
                    }
                    variant="primary"
                    loading={isSubmitting}
                    disabled={!isFormValid}
                    onPress={handleLog}
                    accessibilityLabel="Confirm log meal to journal"
                    className="w-full min-h-[48px]"
                  />

                  <TouchableOpacity
                    onPress={onClose}
                    disabled={isSubmitting}
                    className="w-full min-h-[44px] rounded-full items-center justify-center bg-transparent active:bg-neutral-100"
                    accessibilityRole="button"
                    accessibilityLabel="Cancel logging"
                  >
                    <AppText weight="bold" className="text-xs text-neutral-muted">
                      Cancel
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
