import React from "react";
import { View, ViewProps } from "react-native";
import { AppText } from "./AppText";
import { ProgressBar } from "./ProgressBar";

export interface NutritionCardProps extends ViewProps {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams?: number;
  totalCalories?: number;
  targetProteinGrams?: number;
  targetCarbsGrams?: number;
  targetFatGrams?: number;
}

export const NutritionCard: React.FC<NutritionCardProps> = ({
  proteinGrams,
  carbsGrams,
  fatGrams,
  fiberGrams,
  totalCalories,
  targetProteinGrams,
  targetCarbsGrams,
  targetFatGrams,
  className,
  style,
  ...props
}) => {
  const proteinRatio =
    targetProteinGrams && targetProteinGrams > 0
      ? Math.min(1.0, proteinGrams / targetProteinGrams)
      : 0;
  const carbsRatio =
    targetCarbsGrams && targetCarbsGrams > 0
      ? Math.min(1.0, carbsGrams / targetCarbsGrams)
      : 0;
  const fatRatio =
    targetFatGrams && targetFatGrams > 0
      ? Math.min(1.0, fatGrams / targetFatGrams)
      : 0;

  return (
    <View
      className={`bg-white rounded-3xl border border-neutral-border-light/80 p-5 shadow-sm ${
        className || ""
      }`}
      style={style}
      {...props}
    >
      <View className="flex-row items-center justify-between pb-3 border-b border-neutral-border-light/60">
        <View>
          <AppText weight="extrabold" className="text-base text-neutral-dark">
            Macronutrient Balance
          </AppText>
          <AppText weight="medium" className="text-xs text-neutral-muted">
            Tracked from today's meals
          </AppText>
        </View>
        {totalCalories !== undefined && (
          <View className="items-end">
            <AppText weight="black" className="text-base text-primary">
              {totalCalories}{" "}
              <AppText weight="bold" className="text-xs text-neutral-muted">
                kcal
              </AppText>
            </AppText>
          </View>
        )}
      </View>

      <View className="flex-row justify-between items-start pt-4 gap-2">
        {/* Protein */}
        <View className="flex-1 items-center bg-emerald-50/50 rounded-2xl p-2.5 border border-emerald-100/60">
          <AppText weight="bold" className="text-xs text-emerald-800 mb-0.5">
            Protein
          </AppText>
          <AppText weight="black" className="text-lg text-emerald-700">
            {proteinGrams}g
          </AppText>
          {targetProteinGrams !== undefined && (
            <AppText weight="semibold" className="text-[10px] text-emerald-600/80 mb-2">
              of {targetProteinGrams}g
            </AppText>
          )}
          {targetProteinGrams !== undefined && (
            <ProgressBar progress={proteinRatio} variant="primary" height="sm" />
          )}
        </View>

        {/* Carbs */}
        <View className="flex-1 items-center bg-teal-50/50 rounded-2xl p-2.5 border border-teal-100/60">
          <AppText weight="bold" className="text-xs text-teal-800 mb-0.5">
            Carbs
          </AppText>
          <AppText weight="black" className="text-lg text-teal-700">
            {carbsGrams}g
          </AppText>
          {targetCarbsGrams !== undefined && (
            <AppText weight="semibold" className="text-[10px] text-teal-600/80 mb-2">
              of {targetCarbsGrams}g
            </AppText>
          )}
          {targetCarbsGrams !== undefined && (
            <ProgressBar progress={carbsRatio} variant="secondary" height="sm" />
          )}
        </View>

        {/* Fat */}
        <View className="flex-1 items-center bg-amber-50/50 rounded-2xl p-2.5 border border-amber-100/60">
          <AppText weight="bold" className="text-xs text-amber-800 mb-0.5">
            Fat
          </AppText>
          <AppText weight="black" className="text-lg text-amber-700">
            {fatGrams}g
          </AppText>
          {targetFatGrams !== undefined && (
            <AppText weight="semibold" className="text-[10px] text-amber-600/80 mb-2">
              of {targetFatGrams}g
            </AppText>
          )}
          {targetFatGrams !== undefined && (
            <ProgressBar progress={fatRatio} variant="accent" height="sm" />
          )}
        </View>
      </View>
    </View>
  );
};
