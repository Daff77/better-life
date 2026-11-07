import React from "react";
import {
  View,
  TouchableOpacityProps,
  ImageSourcePropType,
  Image,
} from "react-native";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";
import { IconRenderer, AppIconName, CrownIconSvg } from "@/constants/Assets";
import { mealLabel, DIFFICULTY_LABELS } from "@/constants/MealLabels";

export interface RecipeCardProps extends Omit<TouchableOpacityProps, "children"> {
  title: string;
  category: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Drink";
  calories: number;
  prepTimeMinutes: number;
  difficulty?: "Easy" | "Medium" | "Hard";
  svgName?: AppIconName;
  imageUrl?: string;
  imageSource?: ImageSourcePropType;
  isPremium?: boolean;
  isLocked?: boolean;
  onPress?: () => void;
  className?: string;
}

/**
 * Recipe tile. The photo carries the card; text below is meta, title, kcal.
 * The only overlay is the Premium lock, because it changes what a tap does.
 */
export const RecipeCard: React.FC<RecipeCardProps> = ({
  title,
  category,
  calories,
  prepTimeMinutes,
  difficulty = "Easy",
  svgName,
  imageUrl,
  imageSource,
  isPremium,
  isLocked,
  onPress,
  className,
}) => {
  const effectiveImageSource = imageSource || (imageUrl ? { uri: imageUrl } : null);

  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.985}
      className={`bg-white rounded-2xl border border-[#ebe9e2] overflow-hidden ${className || ""}`}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${calories} kalori, ${prepTimeMinutes} menit${isLocked ? ", resep premium terkunci" : ""}`}
    >
      <View className="h-[150px] w-full bg-[#f2f1ec] items-center justify-center">
        {effectiveImageSource ? (
          <Image source={effectiveImageSource} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : svgName ? (
          <IconRenderer name={svgName} size={64} />
        ) : (
          <IconRenderer name="Cook" size={26} color="#153e28" />
        )}

        {isPremium && (
          <View className="absolute top-2.5 left-2.5 bg-white px-2 py-1 rounded-md flex-row items-center gap-1">
            <CrownIconSvg size={11} color="#b45309" />
            <AppText weight="bold" className="text-[10px] text-[#8a4106]">
              {isLocked ? "Premium" : "Premium terbuka"}
            </AppText>
          </View>
        )}
      </View>

      <View className="px-3.5 pt-3 pb-3.5">
        <AppText weight="medium" numberOfLines={1} className="text-[11px] text-neutral-muted">
          {mealLabel(category)} · {prepTimeMinutes} mnt · {DIFFICULTY_LABELS[difficulty] ?? difficulty}
        </AppText>
        <AppText weight="bold" numberOfLines={2} className="text-[15px] text-neutral-dark leading-snug mt-0.5 min-h-[40px]">
          {title}
        </AppText>
        <AppText weight="bold" className="text-[13px] text-primary mt-1.5" style={{ fontVariant: ["tabular-nums"] }}>
          {calories} kcal
        </AppText>
      </View>
    </PressableScale>
  );
};
