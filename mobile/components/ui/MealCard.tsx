import React from "react";
import {
  View,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
} from "react-native";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";
import { IconRenderer, PlusIconSvg } from "@/constants/Assets";
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
  /** "stack": image on top (grids, carousels). "row": thumbnail left (phone lists). */
  layout?: "stack" | "row";
  className?: string;
}

/**
 * Meal tile. One surface, one image, three facts (name, kcal, price) and one action.
 * Category and prep time move into the meta line so the photo stays clean.
 */
export const MealCard: React.FC<MealCardProps> = ({
  title,
  mealType,
  calories,
  description,
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
  const effectiveImageSource = imageSource || (imageUrl ? { uri: imageUrl } : null);

  const meta = [
    mealLabel(mealType),
    prepTimeMinutes ? `${prepTimeMinutes} mnt` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const artwork = effectiveImageSource ? (
    <Image source={effectiveImageSource} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
  ) : svgElement ? (
    <View className="w-full h-full items-center justify-center">{svgElement}</View>
  ) : (
    <View className="w-full h-full items-center justify-center">
      <IconRenderer name="Cook" size={26} color="#153e28" />
    </View>
  );

  const logButton = showLogButton ? (
    <PressableScale
      onPress={onLogMeal}
      disabled={isLogging}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      className="w-9 h-9 rounded-full bg-primary items-center justify-center"
      accessibilityRole="button"
      accessibilityLabel={`Catat ${displayTitle} ke jurnal`}
    >
      {isLogging ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <PlusIconSvg size={16} color="#ffffff" strokeWidth={2.4} />
      )}
    </PressableScale>
  ) : null;

  const priceAndKcal = (
    <View className="flex-row items-baseline flex-wrap">
      <AppText weight="bold" className="text-[13px] text-neutral-dark" style={{ fontVariant: ["tabular-nums"] }}>
        {calories} kcal
      </AppText>
      {estimatedCostIdr !== undefined && (
        <AppText
          weight="medium"
          numberOfLines={1}
          className="text-xs text-neutral-muted ml-1.5"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          Rp {estimatedCostIdr.toLocaleString("id-ID")}
        </AppText>
      )}
    </View>
  );

  if (layout === "row") {
    return (
      <View
        className={`w-full flex-row items-center bg-white rounded-2xl border border-[#ebe9e2] p-2.5 ${className || ""}`}
      >
        <PressableScale
          onPress={onPress}
          pressedScale={0.985}
          className="flex-1 flex-row items-center min-w-0"
          accessibilityRole="button"
          accessibilityLabel={`${displayTitle}, ${calories} kalori`}
        >
          <View className="w-[72px] h-[72px] rounded-xl overflow-hidden bg-[#f2f1ec] border border-black/[0.05]">
            {artwork}
          </View>
          <View className="flex-1 min-w-0 ml-3 mr-2">
            <AppText weight="medium" numberOfLines={1} className="text-[11px] text-neutral-muted">
              {meta}
            </AppText>
            <AppText weight="bold" numberOfLines={2} className="text-[15px] text-neutral-dark leading-snug mt-0.5">
              {displayTitle}
            </AppText>
            <View className="mt-1">{priceAndKcal}</View>
          </View>
        </PressableScale>
        {logButton}
      </View>
    );
  }

  return (
    <View
      className={`w-full bg-white rounded-2xl overflow-hidden border border-[#ebe9e2] ${className || ""}`}
    >
      <PressableScale
        onPress={onPress}
        pressedScale={0.985}
        accessibilityRole="button"
        accessibilityLabel={`${displayTitle}, ${calories} kalori`}
      >
        <View className="h-[136px] w-full bg-[#f2f1ec]">{artwork}</View>
        <View className="px-3.5 pt-3">
          <AppText weight="medium" numberOfLines={1} className="text-[11px] text-neutral-muted">
            {meta}
          </AppText>
          <AppText weight="bold" numberOfLines={1} className="text-[15px] text-neutral-dark leading-snug mt-0.5">
            {displayTitle}
          </AppText>
          <AppText weight="regular" numberOfLines={2} className="text-xs text-neutral-muted leading-relaxed mt-1 min-h-[34px]">
            {description}
          </AppText>
        </View>
      </PressableScale>
      <View className="px-3.5 pb-3 pt-2 flex-row items-center justify-between">
        <View className="flex-1 min-w-0 mr-2">{priceAndKcal}</View>
        {logButton}
      </View>
    </View>
  );
};
