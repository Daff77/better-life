import React from "react";
import { View, ViewProps, useWindowDimensions } from "react-native";
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
  const { width } = useWindowDimensions();
  const isVeryNarrow = width < 370;

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
      shortLabel: "Protein",
      consumed: proteinGrams,
      target: targetProteinGrams,
      ratio: proteinRatio,
      percent: proteinPct,
      calories: Math.round(proteinGrams * 4),
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
      calories: Math.round(carbsGrams * 4),
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
      calories: Math.round(fatGrams * 9),
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
      className={`bg-white rounded-2xl border border-[#e5ece7] p-4 sm:p-5 shadow-2xs ${
        className || ""
      }`}
      style={style}
      {...props}
    >
      {/* Card Header */}
      <View className="flex-row items-center justify-between mb-3.5 pb-2.5 border-b border-[#f0f4f1]">
        <View className="flex-1 mr-2">
          <AppText weight="black" className="text-base text-neutral-dark">
            Macronutrient Balance
          </AppText>
          <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
            Protein, Carbs & Fats calibrated to target
          </AppText>
        </View>

        {fiberGrams !== undefined && fiberGrams > 0 && (
          <View className="bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60 flex-shrink-0">
            <AppText weight="bold" className="text-[11px] text-emerald-800">
              🌿 {fiberGrams}g Fiber
            </AppText>
          </View>
        )}
      </View>

      {/* Responsive Macros Layout */}
      {isVeryNarrow ? (
        /* 2-Column + 1-Full Width Spanning Layout for Narrow Mobile Viewports (<370px) */
        <View className="gap-2.5">
          <View className="flex-row gap-2.5">
            {macros.slice(0, 2).map((m) => (
              <View
                key={m.label}
                className={`flex-1 p-3 rounded-xl border ${m.borderTint} ${m.bgTint} justify-between`}
              >
                <View className="flex-row items-center justify-between mb-1.5">
                  <View className="flex-row items-center gap-1.5">
                    <View
                      style={{ backgroundColor: m.accentColor }}
                      className="w-2 h-2 rounded-full"
                    />
                    <AppText weight="extrabold" className={`text-xs ${m.badgeText}`}>
                      {m.shortLabel}
                    </AppText>
                  </View>
                  <AppText weight="extrabold" className="text-xs text-neutral-dark">
                    {m.percent}%
                  </AppText>
                </View>

                <View className="mb-2">
                  <View className="flex-row items-baseline">
                    <AppText weight="black" className="text-xl text-neutral-dark tracking-tight leading-none mr-1">
                      {m.consumed}
                    </AppText>
                    <AppText weight="bold" className="text-[11px] text-neutral-muted">
                      / {m.target}g
                    </AppText>
                  </View>
                  <AppText weight="medium" className="text-[10px] text-neutral-muted mt-0.5">
                    {m.calories} kcal
                  </AppText>
                </View>

                <ProgressBar
                  progress={m.ratio}
                  color={m.barColor}
                  backgroundColor={m.barBg}
                  height={5}
                />
              </View>
            ))}
          </View>

          {/* Third Item (Fats) Spans Full Width */}
          {macros.slice(2).map((m) => (
            <View
              key={m.label}
              className={`w-full p-3 rounded-xl border ${m.borderTint} ${m.bgTint}`}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-1.5">
                  <View
                    style={{ backgroundColor: m.accentColor }}
                    className="w-2 h-2 rounded-full"
                  />
                  <AppText weight="extrabold" className={`text-xs ${m.badgeText}`}>
                    {m.label}
                  </AppText>
                </View>
                <View className="flex-row items-center gap-2">
                  <AppText weight="black" className="text-sm text-neutral-dark">
                    {m.consumed} / {m.target}g
                  </AppText>
                  <AppText weight="extrabold" className="text-xs text-neutral-dark">
                    ({m.percent}%)
                  </AppText>
                </View>
              </View>

              <ProgressBar
                progress={m.ratio}
                color={m.barColor}
                backgroundColor={m.barBg}
                height={5}
              />
            </View>
          ))}
        </View>
      ) : (
        /* 3-Column Compact Grid for Viewports >= 370px */
        <View className="flex-row gap-2.5">
          {macros.map((m) => (
            <View
              key={m.label}
              className={`flex-1 p-3 rounded-xl border ${m.borderTint} ${m.bgTint} justify-between`}
            >
              {/* Top row: Label & Percent */}
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="flex-row items-center gap-1 flex-1 mr-1">
                  <View
                    style={{ backgroundColor: m.accentColor }}
                    className="w-2 h-2 rounded-full flex-shrink-0"
                  />
                  <AppText
                    weight="extrabold"
                    numberOfLines={1}
                    className={`text-[11px] sm:text-xs ${m.badgeText}`}
                  >
                    {m.shortLabel}
                  </AppText>
                </View>
                <AppText weight="extrabold" className="text-[11px] sm:text-xs text-neutral-dark">
                  {m.percent}%
                </AppText>
              </View>

              {/* Middle: Consumed & Target */}
              <View className="mb-2">
                <View className="flex-row items-baseline flex-wrap">
                  <AppText weight="black" className="text-lg sm:text-2xl text-neutral-dark tracking-tight leading-none mr-1">
                    {m.consumed}
                  </AppText>
                  <AppText weight="bold" className="text-[10px] sm:text-xs text-neutral-muted">
                    / {m.target}g
                  </AppText>
                </View>
                <AppText weight="medium" className="text-[10px] text-neutral-muted mt-0.5">
                  {m.calories} kcal
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
      )}
    </View>
  );
};
