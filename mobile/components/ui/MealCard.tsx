import React from "react";
import {
  View,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
} from "react-native";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";
import { PlusIconSvg, getMealIllustration } from "@/constants/Assets";
import { SURFACE_SHADOW } from "./Surface";
import { mealLabel } from "@/constants/MealLabels";

export interface MealCardProps {
  title?: string;
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Drink" | string;
  calories: number;
  description: string;
  prepTimeMinutes?: number;
  estimatedCostIdr?: number;
  imageUrl?: string;
  imageSource?: ImageSourcePropType;
  svgElement?: React.ReactNode;
  onLogMeal?: () => void;
  onPress?: () => void;
  isLogging?: boolean;
  showLogButton?: boolean;
  /** "stack": compact vertical card (carousels/grids). "row": horizontal list tile (mobile lists). */
  layout?: "stack" | "row";
  className?: string;
}

const tnum = { fontVariant: ["tabular-nums" as const] };

export const MealCard: React.FC<MealCardProps> = ({
  title,
  mealType,
  calories,
  prepTimeMinutes,
  estimatedCostIdr,
  imageUrl,
  imageSource,
  svgElement,
  onLogMeal,
  onPress,
  isLogging = false,
  showLogButton = false,
  layout = "stack",
  className,
}) => {
  const displayTitle = title || mealType;
  const effectiveImageSource = imageSource || (imageUrl ? { uri: imageUrl } : getMealIllustration(mealType));

  const meta = [
    mealLabel(mealType),
    prepTimeMinutes ? `${prepTimeMinutes} mnt` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const artwork = svgElement ? (
    <View className="w-full h-full items-center justify-center">{svgElement}</View>
  ) : (
    <Image source={effectiveImageSource} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
  );

  const logButton = showLogButton ? (
    <PressableScale
      onPress={onLogMeal}
      disabled={isLogging}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      className="h-8 px-3 rounded-full bg-primary flex-row items-center justify-center gap-1 flex-shrink-0"
      accessibilityRole="button"
      accessibilityLabel={`Catat ${displayTitle} ke jurnal`}
    >
      {isLogging ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <>
          <PlusIconSvg size={13} color="#ffffff" strokeWidth={2.5} />
          <AppText weight="bold" className="text-[12px] text-white">
            Catat
          </AppText>
        </>
      )}
    </PressableScale>
  ) : null;

  if (layout === "row") {
    return (
      <View
        className={`w-full flex-row items-center bg-card rounded-[18px] border border-line p-2.5 pr-3 ${className || ""}`}
        style={{ boxShadow: SURFACE_SHADOW } as any}
      >
        <PressableScale
          onPress={onPress}
          pressedScale={0.985}
          className="flex-1 flex-row items-center min-w-0 mr-2.5"
          accessibilityRole="button"
          accessibilityLabel={`${displayTitle}, ${calories} kalori`}
        >
          <View className="w-16 h-16 rounded-[13px] overflow-hidden bg-card-2 flex-shrink-0 border border-line">
            {artwork}
          </View>
          <View className="flex-1 min-w-0 ml-3">
            <AppText weight="medium" numberOfLines={1} className="text-[11.5px] text-muted">
              {meta}
            </AppText>
            <AppText weight="semibold" numberOfLines={2} className="text-[14.5px] text-ink leading-[19px] mt-0.5">
              {displayTitle}
            </AppText>
            <View className="flex-row items-center gap-2 mt-1">
              <AppText weight="bold" className="text-[13px] text-primary-text" style={tnum}>
                {calories} kcal
              </AppText>
              {estimatedCostIdr !== undefined && (
                <AppText weight="medium" className="text-[12px] text-muted" style={tnum}>
                  · Rp {estimatedCostIdr.toLocaleString("id-ID")}
                </AppText>
              )}
            </View>
          </View>
        </PressableScale>
        {logButton}
      </View>
    );
  }

  return (
    <View
      className={`w-full bg-card rounded-[18px] overflow-hidden border border-line ${className || ""}`}
      style={{ boxShadow: SURFACE_SHADOW } as any}
    >
      <PressableScale
        onPress={onPress}
        pressedScale={0.985}
        accessibilityRole="button"
        accessibilityLabel={`${displayTitle}, ${calories} kalori`}
      >
        <View className="h-[104px] w-full bg-card-2 relative">
          {artwork}
          <View
            className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full"
            style={{ backgroundColor: "rgba(18, 26, 22, 0.78)" }}
          >
            <AppText weight="bold" className="text-[11px] text-white" style={tnum}>
              {calories} kcal
            </AppText>
          </View>
        </View>
        <View className="px-3 pt-2.5">
          <AppText weight="medium" numberOfLines={1} className="text-[11.5px] text-muted">
            {meta}
          </AppText>
          <AppText
            weight="semibold"
            numberOfLines={2}
            className="text-[14.5px] text-ink leading-[19px] mt-0.5 min-h-[38px]"
          >
            {displayTitle}
          </AppText>
        </View>
      </PressableScale>
      <View className="px-3 pb-2.5 pt-2 flex-row items-center justify-between">
        <AppText weight="semibold" numberOfLines={1} className="text-[12px] text-muted flex-1 mr-2" style={tnum}>
          {estimatedCostIdr !== undefined ? `Rp ${estimatedCostIdr.toLocaleString("id-ID")}` : `${calories} kcal`}
        </AppText>
        {logButton}
      </View>
    </View>
  );
};
