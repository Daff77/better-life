import React from "react";
import { View, ViewProps } from "react-native";
import { AppText } from "./AppText";

export interface NutritionCardProps extends ViewProps {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams?: number;
  totalCalories?: number;
}

export const NutritionCard: React.FC<NutritionCardProps> = ({
  proteinGrams,
  carbsGrams,
  fatGrams,
  fiberGrams,
  totalCalories,
  className,
  style,
  ...props
}) => {
  return (
    <View
      className={`bg-white rounded-2xl border border-neutral-border-light/80 p-4 shadow-sm ${
        className || ""
      }`}
      style={style}
      {...props}
    >
      <View className="flex-row items-center justify-between pb-3 border-b border-neutral-border-light/60">
        <AppText weight="extrabold" className="text-sm text-neutral-dark">
          Nutritional Breakdown
        </AppText>
        {totalCalories !== undefined && (
          <AppText weight="black" className="text-base text-primary">
            {totalCalories}{" "}
            <AppText weight="bold" className="text-xs text-neutral-muted">
              kcal
            </AppText>
          </AppText>
        )}
      </View>

      <View className="flex-row justify-around items-center pt-3">
        {/* Protein */}
        <View className="items-center">
          <AppText weight="medium" className="text-xs text-neutral-muted mb-0.5">
            Protein
          </AppText>
          <AppText weight="black" className="text-lg text-primary">
            {proteinGrams}g
          </AppText>
        </View>

        {/* Carbs */}
        <View className="items-center">
          <AppText weight="medium" className="text-xs text-neutral-muted mb-0.5">
            Carbs
          </AppText>
          <AppText weight="black" className="text-lg text-accent-teal">
            {carbsGrams}g
          </AppText>
        </View>

        {/* Fat */}
        <View className="items-center">
          <AppText weight="medium" className="text-xs text-neutral-muted mb-0.5">
            Fat
          </AppText>
          <AppText weight="black" className="text-lg text-neutral-dark">
            {fatGrams}g
          </AppText>
        </View>

        {/* Fiber */}
        {fiberGrams !== undefined && (
          <View className="items-center">
            <AppText weight="medium" className="text-xs text-neutral-muted mb-0.5">
              Fiber
            </AppText>
            <AppText weight="black" className="text-lg text-neutral-muted">
              {fiberGrams}g
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
};
