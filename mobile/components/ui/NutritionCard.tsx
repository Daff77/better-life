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
  targetProteinGrams = 120,
  targetCarbsGrams = 200,
  targetFatGrams = 60,
  className,
  style,
  ...props
}) => {
  const proteinRatio =
    targetProteinGrams > 0 ? Math.min(1.0, proteinGrams / targetProteinGrams) : 0;
  const carbsRatio =
    targetCarbsGrams > 0 ? Math.min(1.0, carbsGrams / targetCarbsGrams) : 0;
  const fatRatio =
    targetFatGrams > 0 ? Math.min(1.0, fatGrams / targetFatGrams) : 0;

  const proteinPct = Math.round(proteinRatio * 100);
  const carbsPct = Math.round(carbsRatio * 100);
  const fatPct = Math.round(fatRatio * 100);

  const macros = [
    {
      label: "Protein",
      consumed: proteinGrams,
      target: targetProteinGrams,
      ratio: proteinRatio,
      percent: proteinPct,
      calories: proteinGrams * 4,
      accentColor: "#059669",
      bgTint: "bg-emerald-50/60",
      borderTint: "border-emerald-200/70",
      badgeText: "text-emerald-800",
      barColor: "#059669",
      barBg: "#d1fae5",
    },
    {
      label: "Carbohydrates",
      shortLabel: "Carbs",
      consumed: carbsGrams,
      target: targetCarbsGrams,
      ratio: carbsRatio,
      percent: carbsPct,
      calories: carbsGrams * 4,
      accentColor: "#d97706",
      bgTint: "bg-amber-50/60",
      borderTint: "border-amber-200/70",
      badgeText: "text-amber-800",
      barColor: "#d97706",
      barBg: "#fef3c7",
    },
    {
      label: "Healthy Fats",
      shortLabel: "Fats",
      consumed: fatGrams,
      target: targetFatGrams,
      ratio: fatRatio,
      percent: fatPct,
      calories: fatGrams * 9,
      accentColor: "#0284c7",
      bgTint: "bg-sky-50/60",
      borderTint: "border-sky-200/70",
      badgeText: "text-sky-800",
      barColor: "#0284c7",
      barBg: "#e0f2fe",
    },
  ];

  return (
    <View
      className={`bg-white rounded-2xl border border-[#e5ece7] p-5 shadow-2xs ${
        className || ""
      }`}
      style={style}
      {...props}
    >
      {/* Card Header */}
      <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-[#f0f4f1]">
        <View>
          <AppText weight="black" className="text-base text-neutral-dark">
            Macronutrient Balance
          </AppText>
          <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
            Daily target breakdown & energy distribution
          </AppText>
        </View>

        {fiberGrams !== undefined && fiberGrams > 0 && (
          <View className="bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
            <AppText weight="bold" className="text-[11px] text-emerald-800">
              🌿 {fiberGrams}g Fiber
            </AppText>
          </View>
        )}
      </View>

      {/* 3 Consistent Macro Cards Grid */}
      <View className="flex-col md:flex-row gap-3">
        {macros.map((m) => (
          <View
            key={m.label}
            className={`flex-1 p-3.5 rounded-xl border ${m.borderTint} ${m.bgTint} justify-between`}
          >
            {/* Top row: Label & Percent */}
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-1.5">
                <View
                  style={{ backgroundColor: m.accentColor }}
                  className="w-2 h-2 rounded-full"
                />
                <AppText weight="extrabold" className={`text-xs ${m.badgeText}`}>
                  {m.shortLabel || m.label}
                </AppText>
              </View>
              <AppText weight="extrabold" className="text-xs text-neutral-dark">
                {m.percent}%
              </AppText>
            </View>

            {/* Middle: Consumed & Target */}
            <View className="mb-2.5">
              <View className="flex-row items-baseline">
                <AppText weight="black" className="text-2xl text-neutral-dark tracking-tight leading-none mr-1">
                  {m.consumed}
                </AppText>
                <AppText weight="bold" className="text-xs text-neutral-muted">
                  / {m.target}g
                </AppText>
              </View>
              <AppText weight="medium" className="text-[11px] text-neutral-muted mt-0.5">
                {m.calories} kcal contributed
              </AppText>
            </View>

            {/* Bottom: Proportional Progress Bar */}
            <ProgressBar
              progress={m.ratio}
              color={m.barColor}
              backgroundColor={m.barBg}
              height={5}
            />
          </View>
        ))}
      </View>
    </View>
  );
};
