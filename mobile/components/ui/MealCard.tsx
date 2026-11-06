import React from "react";
import {
  View,
  Image,
  ImageSourcePropType,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { AppText } from "./AppText";
import { Badge } from "./Badge";
import { AnimationEasings } from "@/constants/AnimationTokens";
import { IconRenderer } from "@/constants/Assets";

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
  className?: string;
}

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
  className,
}) => {
  const displayTitle = title || mealType;
  const cardScale = useSharedValue(1);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const handlePressIn = () => {
    if (!onPress) return;
    cardScale.value = withSpring(0.985, AnimationEasings.pressSpringConfig);
  };

  const handlePressOut = () => {
    if (!onPress) return;
    cardScale.value = withSpring(1, AnimationEasings.pressSpringConfig);
  };

  const effectiveImageSource = imageSource || (imageUrl ? { uri: imageUrl } : null);

  return (
    <View
      className={`w-full bg-white rounded-2xl overflow-hidden border border-[#eaeaea] flex-col justify-between ${
        className || ""
      }`}
    >
      {/* Clickable Food Art & Details */}
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className="w-full"
        accessibilityRole="button"
        accessibilityLabel={`${displayTitle}, ${calories} calories`}
      >
        <Animated.View pointerEvents="none" style={cardAnimatedStyle}>
          {/* Top Food Image Header */}
          <View className="h-[148px] w-full bg-[#f4f4f5] items-center justify-center relative overflow-hidden">
            {effectiveImageSource ? (
              <Image
                source={effectiveImageSource}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full items-center justify-center py-2">
                {svgElement ? (
                  <View className="w-full h-full items-center justify-center">
                    {svgElement}
                  </View>
                ) : (
                  <View className="w-12 h-12 rounded-xl bg-[#f4f4f5] border border-[#e4e4e7] items-center justify-center">
                    <IconRenderer name="Cook" size={24} color="#71717a" />
                  </View>
                )}
              </View>
            )}

            {/* Category Pill Tag (Minimalist soft neutral badge) */}
            <View className="absolute top-2.5 left-2.5 bg-white/95 px-2.5 py-0.5 rounded-md border border-[#e4e4e7]">
              <AppText weight="bold" className="text-[10px] text-[#52525b]">
                {mealType}
              </AppText>
            </View>

            {/* Prep Time Tag */}
            {Boolean(prepTimeMinutes) && (
              <View className="absolute top-2.5 right-2.5 bg-white/95 px-2 py-0.5 rounded-md border border-[#e4e4e7] flex-row items-center gap-1">
                <IconRenderer name="Clock" size={10} color="#71717a" />
                <AppText weight="bold" className="text-[10px] text-[#52525b]" style={{ fontVariant: ["tabular-nums"] }}>
                  {prepTimeMinutes}m
                </AppText>
              </View>
            )}
          </View>

          {/* Card Text Info */}
          <View className="p-3.5 pb-2">
            {/* Title */}
            <AppText
              weight="bold"
              numberOfLines={1}
              className="text-sm sm:text-[15px] text-[#18181b] leading-snug"
            >
              {displayTitle}
            </AppText>

            {/* Description (2 lines, predictable height) */}
            <AppText
              weight="medium"
              numberOfLines={2}
              className="text-xs text-[#71717a] leading-relaxed mt-1 min-h-[34px]"
            >
              {description}
            </AppText>
          </View>
        </Animated.View>
      </Pressable>

      {/* Pinned Bottom Action & Metadata Strip */}
      <View className="px-3.5 pb-3 pt-2.5 border-t border-[#f4f4f5] flex-row items-center justify-between mt-auto">
        {/* Calories & Estimated Cost */}
        <View className="flex-row items-baseline gap-1.5 flex-1 mr-2 min-w-0 flex-wrap">
          <AppText
            weight="black"
            className="text-xs sm:text-[13px] text-[#18181b]"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {calories} kcal
          </AppText>
          {estimatedCostIdr !== undefined && (
            <AppText
              weight="medium"
              numberOfLines={1}
              className="text-[11px] text-[#71717a]"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              · Rp {estimatedCostIdr.toLocaleString("id-ID")}
            </AppText>
          )}
        </View>

        {/* Quick Log Button */}
        {showLogButton && (
          <Pressable
            onPress={onLogMeal}
            disabled={isLogging}
            className={`min-h-[32px] px-3.5 py-1.5 rounded-lg bg-[#18181b] flex-row items-center justify-center ${
              isLogging ? "opacity-70" : "active:opacity-85"
            }`}
            accessibilityRole="button"
            accessibilityLabel={`Log ${displayTitle} to journal`}
          >
            {isLogging ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <AppText weight="bold" className="text-white text-xs">
                + Log
              </AppText>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
};

