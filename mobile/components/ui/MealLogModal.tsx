import React, { useState, useEffect } from "react";
import {
  View,
  Modal,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StyleSheet,
  TextInput,
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
  initialCategory?: JournalCategory;
  customMode?: boolean;
  onClose: () => void;
  onSuccess?: (entry: JournalEntry) => void;
}

const MEAL_TYPES: JournalCategory[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

export const MealLogModal: React.FC<MealLogModalProps> = ({
  visible,
  meal,
  initialCategory,
  customMode = false,
  onClose,
  onSuccess,
}) => {
  const [isCustom, setIsCustom] = useState<boolean>(customMode || !meal);
  const [customTitle, setCustomTitle] = useState<string>("");
  const [customCalories, setCustomCalories] = useState<string>("");
  const [customProtein, setCustomProtein] = useState<string>("");
  const [customCarbs, setCustomCarbs] = useState<string>("");
  const [customFat, setCustomFat] = useState<string>("");

  const [quantity, setQuantity] = useState<number>(1);
  const [selectedMealType, setSelectedMealType] = useState<JournalCategory>(
    initialCategory || "Breakfast"
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmation, setConfirmation] = useState<{
    entry: JournalEntry;
    mealType: JournalCategory;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize defaults whenever modal opens or meal/category changes
  useEffect(() => {
    if (visible) {
      setQuantity(1);
      setIsSubmitting(false);
      setConfirmation(null);
      setErrorMessage(null);

      const determinedCustom = customMode || !meal;
      setIsCustom(determinedCustom);

      if (determinedCustom) {
        setCustomTitle("");
        setCustomCalories("");
        setCustomProtein("");
        setCustomCarbs("");
        setCustomFat("");
      }

      if (initialCategory) {
        setSelectedMealType(initialCategory);
      } else if (
        meal &&
        (meal.category === "Breakfast" ||
          meal.category === "Lunch" ||
          meal.category === "Dinner" ||
          meal.category === "Snack")
      ) {
        setSelectedMealType(meal.category);
      } else {
        setSelectedMealType("Breakfast");
      }
    }
  }, [visible, meal, initialCategory, customMode]);

  if (!visible) return null;

  const baseCalories = isCustom
    ? parseInt(customCalories, 10) || 0
    : meal?.calories || 0;
  const totalCalories = baseCalories * quantity;

  const proteinPerServing = isCustom
    ? parseInt(customProtein, 10) || 0
    : meal?.nutrition?.proteinGrams || 0;
  const carbsPerServing = isCustom
    ? parseInt(customCarbs, 10) || 0
    : meal?.nutrition?.carbsGrams || 0;
  const fatPerServing = isCustom
    ? parseInt(customFat, 10) || 0
    : meal?.nutrition?.fatGrams || 0;

  const totalProtein = proteinPerServing * quantity;
  const totalCarbs = carbsPerServing * quantity;
  const totalFat = fatPerServing * quantity;

  const isFormValid =
    !!selectedMealType &&
    quantity >= 1 &&
    !isSubmitting &&
    (isCustom ? customTitle.trim().length > 0 && baseCalories > 0 : !!meal);

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
    if (!isFormValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const entryTitle = isCustom ? customTitle.trim() : meal?.title || "Logged Meal";

      const entry = await useJournalStore.getState().addEntry({
        mealId: isCustom ? undefined : meal?.id,
        title: entryTitle,
        category: selectedMealType,
        calories: totalCalories,
        baseCalories,
        proteinGrams: proteinPerServing,
        carbsGrams: carbsPerServing,
        fatGrams: fatPerServing,
        quantity,
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
            <View className="my-5 p-4 rounded-2xl bg-[#daf2e5] border border-primary/30 items-center justify-center">
              <View className="w-10 h-10 rounded-full bg-primary items-center justify-center mb-2">
                <AppText weight="black" className="text-white text-lg">
                  ✓
                </AppText>
              </View>
              <AppText weight="extrabold" className="text-base text-primary">
                Added to {confirmation.mealType}
              </AppText>
              <AppText weight="semibold" className="text-xs text-neutral-dark mt-0.5">
                {confirmation.entry.title} • {confirmation.entry.calories} kcal
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

              {/* Mode Toggle: Catalog vs Custom */}
              {meal && (
                <View className="flex-row bg-neutral-surface rounded-xl p-1 mt-3 mb-2 border border-neutral-border-light">
                  <TouchableOpacity
                    onPress={() => setIsCustom(false)}
                    className={`flex-1 py-1.5 rounded-lg items-center justify-center ${
                      !isCustom ? "bg-white shadow-xs border border-neutral-border-light" : ""
                    }`}
                  >
                    <AppText weight={!isCustom ? "bold" : "medium"} className={`text-xs ${!isCustom ? "text-primary" : "text-neutral-muted"}`}>
                      Recipe Item
                    </AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setIsCustom(true)}
                    className={`flex-1 py-1.5 rounded-lg items-center justify-center ${
                      isCustom ? "bg-white shadow-xs border border-neutral-border-light" : ""
                    }`}
                  >
                    <AppText weight={isCustom ? "bold" : "medium"} className={`text-xs ${isCustom ? "text-primary" : "text-neutral-muted"}`}>
                      Custom Food
                    </AppText>
                  </TouchableOpacity>
                </View>
              )}

              {/* Meal Summary Row (Catalog Mode) */}
              {!isCustom && meal && (
                <View className="flex-row items-center py-3 border-b border-neutral-border-light">
                  <View className="w-12 h-12 rounded-2xl bg-secondary-soft items-center justify-center mr-3 border border-secondary">
                    <IconRenderer name={meal.svgIcon} size={34} />
                  </View>

                  <View className="flex-1 mr-2">
                    <AppText weight="extrabold" numberOfLines={1} className="text-sm text-neutral-dark">
                      {meal.title}
                    </AppText>
                    <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
                      {baseCalories} kcal per serving
                    </AppText>
                  </View>

                  <View className="items-end">
                    <View className="flex-row items-baseline bg-secondary-soft px-2.5 py-1 rounded-lg border border-secondary">
                      <AppText weight="black" className="text-base text-primary">
                        {totalCalories}
                      </AppText>
                      <AppText weight="bold" className="text-[10px] text-neutral-muted ml-0.5">
                        kcal
                      </AppText>
                    </View>
                  </View>
                </View>
              )}

              {/* Custom Food Form Inputs */}
              {isCustom && (
                <View className="py-2.5 border-b border-neutral-border-light gap-y-2">
                  <View>
                    <AppText weight="bold" className="text-[11px] text-neutral-muted uppercase tracking-wider mb-1">
                      Food / Meal Name *
                    </AppText>
                    <TextInput
                      value={customTitle}
                      onChangeText={setCustomTitle}
                      placeholder="e.g. Avocado Toast with Egg"
                      placeholderTextColor="#94a3b8"
                      className="bg-neutral-surface border border-neutral-border rounded-xl px-3.5 py-2 text-sm text-neutral-dark font-medium"
                    />
                  </View>

                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <AppText weight="bold" className="text-[11px] text-neutral-muted uppercase tracking-wider mb-1">
                        Calories (kcal) *
                      </AppText>
                      <TextInput
                        value={customCalories}
                        onChangeText={setCustomCalories}
                        placeholder="350"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        className="bg-neutral-surface border border-neutral-border rounded-xl px-3.5 py-2 text-sm text-neutral-dark font-bold"
                      />
                    </View>
                    <View className="flex-1">
                      <AppText weight="bold" className="text-[11px] text-rose-600 uppercase tracking-wider mb-1">
                        Protein (g)
                      </AppText>
                      <TextInput
                        value={customProtein}
                        onChangeText={setCustomProtein}
                        placeholder="18"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        className="bg-neutral-surface border border-rose-200 rounded-xl px-3 py-2 text-sm text-neutral-dark font-medium"
                      />
                    </View>
                  </View>

                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <AppText weight="bold" className="text-[11px] text-amber-600 uppercase tracking-wider mb-1">
                        Carbs (g)
                      </AppText>
                      <TextInput
                        value={customCarbs}
                        onChangeText={setCustomCarbs}
                        placeholder="32"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        className="bg-neutral-surface border border-amber-200 rounded-xl px-3 py-2 text-sm text-neutral-dark font-medium"
                      />
                    </View>
                    <View className="flex-1">
                      <AppText weight="bold" className="text-[11px] text-sky-600 uppercase tracking-wider mb-1">
                        Fat (g)
                      </AppText>
                      <TextInput
                        value={customFat}
                        onChangeText={setCustomFat}
                        placeholder="12"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        className="bg-neutral-surface border border-sky-200 rounded-xl px-3 py-2 text-sm text-neutral-dark font-medium"
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Macro Nutritional Summary Pill Row */}
              {(totalProtein > 0 || totalCarbs > 0 || totalFat > 0) && (
                <View className="flex-row gap-2 py-2.5 border-b border-neutral-border-light">
                  <View className="flex-1 bg-rose-50 border border-rose-100 rounded-xl py-1.5 px-2 items-center">
                    <AppText weight="medium" className="text-[10px] text-rose-600">
                      Protein
                    </AppText>
                    <AppText weight="extrabold" className="text-xs text-rose-700">
                      {totalProtein}g
                    </AppText>
                  </View>
                  <View className="flex-1 bg-amber-50 border border-amber-100 rounded-xl py-1.5 px-2 items-center">
                    <AppText weight="medium" className="text-[10px] text-amber-600">
                      Carbs
                    </AppText>
                    <AppText weight="extrabold" className="text-xs text-amber-700">
                      {totalCarbs}g
                    </AppText>
                  </View>
                  <View className="flex-1 bg-sky-50 border border-sky-100 rounded-xl py-1.5 px-2 items-center">
                    <AppText weight="medium" className="text-[10px] text-sky-600">
                      Fat
                    </AppText>
                    <AppText weight="extrabold" className="text-xs text-sky-700">
                      {totalFat}g
                    </AppText>
                  </View>
                </View>
              )}

              {/* Servings Stepper */}
              <View className="py-3 border-b border-neutral-border-light">
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
                      className={`w-8 h-8 rounded-xl items-center justify-center transition-all duration-150 ${
                        quantity <= 1 ? "opacity-30 bg-transparent" : "bg-white border border-neutral-border shadow-xs hover:scale-105 active:scale-95"
                      }`}
                      accessibilityRole="button"
                      accessibilityLabel="Decrease servings"
                    >
                      <AppText weight="black" className="text-base text-neutral-dark">
                        −
                      </AppText>
                    </TouchableOpacity>

                    <View className="w-10 items-center justify-center">
                      <AppText weight="black" className="text-sm text-neutral-dark">
                        {quantity}
                      </AppText>
                      <AppText weight="medium" className="text-[9px] text-neutral-muted -mt-0.5">
                        {quantity === 1 ? "serv." : "servs."}
                      </AppText>
                    </View>

                    <TouchableOpacity
                      onPress={handleIncrement}
                      disabled={quantity >= 10 || isSubmitting}
                      className={`w-8 h-8 rounded-xl items-center justify-center transition-all duration-150 ${
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
              <View className="py-3">
                <AppText weight="extrabold" className="text-xs text-neutral-dark uppercase tracking-wide mb-2">
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
                        className={`flex-1 min-h-[40px] rounded-xl items-center justify-center border transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] ${
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
              <View className="pt-2 pb-1">
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

