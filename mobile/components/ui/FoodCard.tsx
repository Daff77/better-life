import React from "react";
import { View, Image, TouchableOpacity, ImageSourcePropType } from "react-native";
import { AppText } from "./AppText";
import { Badge } from "./Badge";

export interface FoodCardProps {
  title: string;
  calories: number;
  prepTimeMinutes?: number;
  category?: string;
  imageSource?: ImageSourcePropType;
  onPress?: () => void;
}

export const FoodCard: React.FC<FoodCardProps> = ({
  title,
  calories,
  prepTimeMinutes,
  category,
  imageSource,
  onPress,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="bg-white rounded-2xl border border-neutral-border-light/80 p-4 mb-3.5 shadow-sm flex-row items-center justify-between"
    >
      <View className="flex-row items-center flex-1 mr-3">
        {imageSource ? (
          <Image
            source={imageSource}
            style={{ width: 56, height: 56, borderRadius: 12 }}
            resizeMode="cover"
            className="mr-3"
          />
        ) : (
          <View className="w-14 h-14 rounded-xl bg-secondary-soft items-center justify-center mr-3 border border-secondary">
            <AppText weight="bold" className="text-2xl">
              🥑
            </AppText>
          </View>
        )}
        <View className="flex-1">
          <AppText weight="extrabold" className="text-base text-neutral-dark">
            {title}
          </AppText>
          <View className="flex-row items-center gap-x-2 mt-1">
            <AppText weight="bold" className="text-xs text-primary">
              {calories} kcal
            </AppText>
            {Boolean(prepTimeMinutes) && (
              <>
                <AppText weight="medium" className="text-xs text-neutral-muted">•</AppText>
                <AppText weight="medium" className="text-xs text-neutral-muted">
                  {prepTimeMinutes} min
                </AppText>
              </>
            )}
          </View>
        </View>
      </View>

      {category ? <Badge label={category} variant="secondary" size="sm" /> : null}
    </TouchableOpacity>
  );
};
