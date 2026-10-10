import React, { useState, useEffect } from "react";
import {
  View,
  Modal,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from "react-native";
import { AppText } from "./AppText";
import { Button } from "./Button";
import { Badge } from "./Badge";
import { IconRenderer } from "@/constants/Assets";
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
  const totalCalories = baseCalories * quantity;
  const isFormValid = !!selectedMealType && quantity >= 1 && !isSubmitting;

  const handleIncrement = () => {
    if (quantity < 10) {
      setQuantity((q) => q + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  const handleLog = async () => {
    // Prevent accidental rapid double-tap or invalid submission
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
        proteinGrams: meal.nutrition?.proteinGrams ?? 0,
        carbsGrams: meal.nutrition?.carbsGrams ?? 0,
        fatGrams: meal.nutrition?.fatGrams ?? 0,
        fiberGrams: meal.nutrition?.fiberGrams ?? 0,
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
      }, 1000);
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
      <View className="flex-1 justify-end sm:justify-center items-center p-0 sm:p-4">
        {/* Backdrop as a separate full-screen layer */}
        <Pressable
          onPress={onClose}
          style={StyleSheet.absoluteFill}
          className="bg-black/50"
          accessibilityRole="button"
          accessibilityLabel="Dismiss modal backdrop"
        />

        {/* Sheet Container: Sibling to backdrop, NOT inside it */}
        <View
          className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border-t sm:border border-neutral-border-light z-10"
        >
          {/* Header Bar */}
          <View className="flex-row justify-between items-center pb-3 border-b border-neutral-border-light">
            <View>
              <AppText weight="black" className="text-xl text-neutral-dark">
                Log to Journal
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted">
                Record your meal and calorie intake
              </AppText>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="w-8 h-8 rounded-full bg-neutral-surface items-center justify-center border border-neutral-border hover:bg-neutral-border-light transition-colors"
              accessibilityRole="button"
              accessibilityLabel="Close meal log modal"
            >
              <AppText weight="bold" className="text-base text-neutral-muted">
                ✕
              </AppText>
            </TouchableOpacity>
          </View>

          {/* Success Banner Confirmation */}
          {confirmation ? (
            <View
              className="my-5 p-4 rounded-2xl bg-[#daf2e5] border border-primary/30 items-center justify-center"
            >
              <View className="w-10 h-10 rounded-full bg-primary items-center justify-center mb-2">
                <AppText weight="black" className="text-white text-lg">
                  ✓
                </AppText>
              </View>
              <AppText weight="extrabold" className="text-base text-primary">
                Added to {confirmation.mealType}
              </AppText>
              <AppText weight="semibold" className="text-xs text-neutral-dark mt-0.5">
                {meal.title} • {confirmation.entry.calories} kcal
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
              <View className="flex-row items-center py-4 border-b border-neutral-border-light">
                <View className="w-14 h-14 rounded-2xl bg-secondary-soft items-center justify-center mr-3.5 border border-secondary">
                  <IconRenderer name={meal.svgIcon} size={40} />
                </View>

                <View className="flex-1 mr-2">
                  <AppText weight="extrabold" numberOfLines={1} className="text-base text-neutral-dark">
                    {meal.title}
                  </AppText>
                  <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
                    {baseCalories} kcal per serving
                  </AppText>
                </View>

                <View className="items-end">
                  <View className="flex-row items-baseline bg-secondary-soft px-2.5 py-1 rounded-lg border border-secondary">
                    <AppText weight="black" className="text-lg text-primary">
                      {totalCalories}
                    </AppText>
                    <AppText weight="bold" className="text-xs text-neutral-muted ml-0.5">
                      kcal
                    </AppText>
                  </View>
                </View>
              </View>

              {/* Servings Stepper */}
              <View className="py-4 border-b border-neutral-border-light">
                <View className="flex-row justify-between items-center">
                  <View>
                    <AppText weight="extrabold" className="text-xs text-neutral-dark uppercase tracking-wide">
                      Servings / Quantity
                    </AppText>
                    <AppText weight="medium" className="text-[11px] text-neutral-muted">
                      How much did you consume?
                    </AppText>
                  </View>

                  <View className="flex-row items-center bg-neutral-surface rounded-2xl p-1 border border-neutral-border">
                    <TouchableOpacity
                      onPress={handleDecrement}
                      disabled={quantity <= 1 || isSubmitting}
                      className={`w-9 h-9 rounded-xl items-center justify-center transition-all duration-150 ${
                        quantity <= 1 ? "opacity-30 bg-transparent" : "bg-white border border-neutral-border shadow-xs hover:scale-105 active:scale-95"
                      }`}
                      accessibilityRole="button"
                      accessibilityLabel="Decrease servings"
                    >
                      <AppText weight="black" className="text-base text-neutral-dark">
                        −
                      </AppText>
                    </TouchableOpacity>

                    <View className="w-12 items-center justify-center">
                      <AppText weight="black" className="text-base text-neutral-dark">
                        {quantity}
                      </AppText>
                      <AppText weight="medium" className="text-[9px] text-neutral-muted -mt-0.5">
                        {quantity === 1 ? "serv." : "servs."}
                      </AppText>
                    </View>

                    <TouchableOpacity
                      onPress={handleIncrement}
                      disabled={quantity >= 10 || isSubmitting}
                      className={`w-9 h-9 rounded-xl items-center justify-center transition-all duration-150 ${
                        quantity >= 10 ? "opacity-30 bg-transparent" : "bg-white border border-neutral-border shadow-xs hover:scale-105 active:scale-95"
                      }`}
                      accessibilityRole="button"
                      accessibilityLabel="Increase servings"
                    >
                      <AppText weight="black" className="text-base text-neutral-dark">
                        +
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Meal Type Selection (Breakfast, Lunch, Dinner, Snack) */}
              <View className="py-4">
                <AppText weight="extrabold" className="text-xs text-neutral-dark uppercase tracking-wide mb-2.5">
                  Consumed As (Meal Type)
                </AppText>

                <View className="flex-row gap-2">
                  {MEAL_TYPES.map((type) => {
                    const isSelected = selectedMealType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setSelectedMealType(type)}
                        disabled={isSubmitting}
                        className={`flex-1 min-h-[44px] rounded-xl items-center justify-center border transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] ${
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

              {/* Submit CTA */}
              <View className="pt-2 pb-2">
                <Button
                  title={
                    isSubmitting
                      ? "Recording..."
                      : `Log ${totalCalories} kcal to ${selectedMealType || "Journal"}`
                  }
                  variant="primary"
                  loading={isSubmitting}
                  disabled={!isFormValid}
                  onPress={handleLog}
                  accessibilityLabel="Confirm log meal to journal"
                  className="w-full"
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};
