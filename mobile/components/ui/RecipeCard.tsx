import React from "react";
import {
  View,
  TouchableOpacityProps,
  ImageSourcePropType,
  Image,
  ViewStyle,
} from "react-native";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";
import { LineIcon } from "./LineIcon";
import { SURFACE_SHADOW, StatusPill } from "./Surface";
import { AppIconName, getMealIllustration } from "@/constants/Assets";
import { mealLabel, DIFFICULTY_LABELS } from "@/constants/MealLabels";

export interface RecipeCardProps extends Omit<TouchableOpacityProps, "children"> {
  title: string;
  category: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Drink";
  calories: number;
  prepTimeMinutes: number;
  difficulty?: "Easy" | "Medium" | "Hard";
  description?: string;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  svgName?: AppIconName;
  imageUrl?: string;
  imageSource?: ImageSourcePropType;
  isPremium?: boolean;
  isLocked?: boolean;
  onPress?: () => void;
  className?: string;
}

/**
 * Recipe tile. Uses the shared surface elevation and a clean status pill for Premium recipes.
 */
export const RecipeCard: React.FC<RecipeCardProps> = ({
  title,
  category,
  calories,
  prepTimeMinutes,
  difficulty = "Easy",
  description,
  proteinGrams,
  carbsGrams,
  fatGrams,
  svgName,
  imageUrl,
  imageSource,
  isPremium,
  isLocked,
  onPress,
  className,
}) => {
  const effectiveImageSource =
    imageSource || (imageUrl ? { uri: imageUrl } : getMealIllustration(category || svgName));

  const hasMacros =
    proteinGrams !== undefined && carbsGrams !== undefined && fatGrams !== undefined;

  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.985}
      className={`bg-card rounded-[20px] border border-line overflow-hidden ${className || ""}`}
      style={{ boxShadow: SURFACE_SHADOW } as ViewStyle}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${calories} kalori, ${prepTimeMinutes} menit${
        isLocked ? ", resep premium terkunci" : ""
      }`}
    >
      <View className="h-[154px] w-full bg-card-2 items-center justify-center">
        <Image source={effectiveImageSource} style={{ width: "100%", height: "100%" }} resizeMode="cover" />

        {isPremium && (
          <View className="absolute top-3 left-3">
            <StatusPill
              label={isLocked ? "Premium" : "Premium terbuka"}
              tone={isLocked ? "warn" : "good"}
            />
          </View>
        )}
      </View>

      <View className="px-4 pt-3 pb-3.5">
        <AppText weight="semibold" numberOfLines={1} className="text-[12px] text-muted">
          {mealLabel(category)} · {prepTimeMinutes} mnt · {DIFFICULTY_LABELS[difficulty] ?? difficulty}
        </AppText>
        <AppText
          weight="semibold"
          numberOfLines={1}
          className="text-[16px] text-ink leading-5 mt-1"
        >
          {title}
        </AppText>
        {Boolean(description) && (
          <AppText
            weight="regular"
            numberOfLines={1}
            className="text-[12.5px] text-muted mt-0.5"
          >
            {description}
          </AppText>
        )}
        <View className="flex-row items-center justify-between mt-2.5 pt-2 border-t border-line">
          <View className="flex-row items-center gap-2 flex-1 mr-2">
            <AppText
              weight="bold"
              className="text-[14px] text-primary-text"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {calories} kcal
            </AppText>
            <AppText
              weight="medium"
              numberOfLines={1}
              className="text-[12px] text-muted"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {hasMacros
                ? `· P ${proteinGrams}g · K ${carbsGrams}g · L ${fatGrams}g`
                : "· Per porsi"}
            </AppText>
          </View>
          <View className="w-7 h-7 rounded-full border border-line-2 items-center justify-center flex-shrink-0">
            <LineIcon name={isLocked ? "lock" : "arrowUpRight"} size={14} color="#2e3a33" />
          </View>
        </View>
      </View>
    </PressableScale>
  );
};
