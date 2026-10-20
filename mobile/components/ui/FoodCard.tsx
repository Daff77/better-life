import React from "react";
import { View, Image, Pressable, ImageSourcePropType, Platform } from "react-native";
import { AppText } from "./AppText";
import { Badge } from "./Badge";
import { IconRenderer } from "@/constants/Assets";

export interface FoodCardProps {
  title: string;
  calories: number;
  prepTimeMinutes?: number;
  category?: string;
  imageUrl?: string;
  imageSource?: ImageSourcePropType;
  onPress?: () => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({
  title,
  calories,
  prepTimeMinutes,
  category,
  imageUrl,
  imageSource,
  onPress,
}) => {
  const effectiveImage = imageSource || (imageUrl ? { uri: imageUrl } : null);

  return (
    <Pressable
      onPress={onPress}
      className={`bg-white rounded-2xl border border-neutral-border-light/80 p-4 mb-3.5 shadow-sm flex-row items-center justify-between active:scale-[0.98] transition-all duration-150 ${
        Platform.OS === "web" ? "cursor-pointer hover:border-emerald-500/40" : ""
      }`}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${calories} calories`}
    >
      <View className="flex-row items-center flex-1 mr-3">
        {effectiveImage ? (
          <Image
            source={effectiveImage}
            style={{ width: 56, height: 56, borderRadius: 12 }}
            resizeMode="cover"
            className="mr-3 border border-black/[0.04]"
          />
        ) : (
          <View className="w-14 h-14 rounded-xl bg-secondary-soft items-center justify-center mr-3 border border-secondary">
            <IconRenderer name="Cook" size={24} color="#1b7a53" />
          </View>
        )}
        <View className="flex-1">
          <AppText weight="extrabold" className="text-base text-neutral-dark">
            {title}
          </AppText>
          <View className="flex-row items-center gap-x-2 mt-1">
            <AppText
              weight="bold"
              className="text-xs text-primary"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {calories} kcal
            </AppText>
            {Boolean(prepTimeMinutes) && (
              <>
                <AppText weight="medium" className="text-xs text-neutral-muted">•</AppText>
                <AppText
                  weight="medium"
                  className="text-xs text-neutral-muted"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {prepTimeMinutes} min
                </AppText>
              </>
            )}
          </View>
        </View>
      </View>

      {category ? <Badge label={category} variant="secondary" size="sm" /> : null}
    </Pressable>
  );
};
