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
      className={`w-full bg-white rounded-2xl overflow-hidden border border-[#e5ece7] shadow-2xs transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
        className || ""
      }`}
    >
      {/* Clickable Food Art & Details */}
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className={`w-full ${Platform.OS === "web" ? "cursor-pointer" : ""}`}
        accessibilityRole="button"
        accessibilityLabel={`${displayTitle}, ${calories} calories`}
      >
        <Animated.View pointerEvents="none" style={cardAnimatedStyle}>
          {/* Top Food Image Header */}
          <View className="h-[148px] w-full bg-[#f2f8f4] items-center justify-center relative overflow-hidden border-b border-black/[0.06]">
            {effectiveImageSource ? (
              <>
                <Image
                  source={effectiveImageSource}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
                <View className="absolute inset-x-0 top-0 h-10 bg-black/20" />
              </>
            ) : (
              <View className="w-full h-full items-center justify-center py-2">
                {svgElement ? (
                  <View className="w-full h-full items-center justify-center">
                    {svgElement}
                  </View>
                ) : (
                  <View className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200/60 items-center justify-center">
                    <IconRenderer name="Cook" size={26} color="#1b7a53" />
                  </View>
                )}
              </View>
            )}

            {/* Category Pill Tag (Semi-transparent dark badge) */}
            <View className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-sm px-2.5 py-0.5 rounded-md">
              <AppText weight="bold" className="text-[10px] text-white">
                {mealType}
              </AppText>
            </View>

            {/* Prep Time Tag */}
            {Boolean(prepTimeMinutes) && (
              <View className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-md border border-black/[0.06] flex-row items-center gap-1 shadow-xs">
                <IconRenderer name="Clock" size={10} color="#d97706" />
                <AppText weight="bold" className="text-[10px] text-neutral-dark" style={{ fontVariant: ["tabular-nums"] }}>
                  {prepTimeMinutes}m
                </AppText>
              </View>
            )}
          </View>

          {/* Card Text Info */}
          <View className="p-3.5 pb-3">
            {/* Title */}
            <AppText
              weight="extrabold"
              numberOfLines={1}
              className="text-sm text-neutral-dark mb-1 leading-snug"
            >
              {displayTitle}
            </AppText>

            {/* Calories & Estimated Cost Row */}
            <View className="flex-row items-center gap-2 mb-1.5 flex-wrap">
              <AppText
                weight="black"
                className="text-xs text-emerald-600"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {calories} kcal
              </AppText>

              {estimatedCostIdr !== undefined && (
                <AppText
                  weight="medium"
                  className="text-xs text-neutral-400"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  Rp {estimatedCostIdr.toLocaleString("id-ID")}{" "}
                  <AppText weight="regular" className="text-[10px] text-neutral-400">
                    (est.)
                  </AppText>
                </AppText>
              )}
            </View>

            {/* Description (2 lines) */}
            <AppText
              weight="medium"
              numberOfLines={2}
              className="text-[11px] text-neutral-muted leading-relaxed"
            >
              {description}
            </AppText>
          </View>
        </Animated.View>
      </Pressable>

      {/* Optional Sibling Bottom Log Button */}
      {showLogButton && (
        <View className="px-3.5 pb-3.5 pt-1">
          <Pressable
            onPress={onLogMeal}
            disabled={isLogging}
            className={`w-full min-h-[40px] rounded-xl flex-row items-center justify-center active:scale-[0.96] transition-all duration-150 ${
              isLogging ? "bg-primary/70" : "bg-primary active:bg-primary-dark"
            } ${Platform.OS === "web" ? "cursor-pointer hover:bg-primary-dark shadow-xs" : ""}`}
            accessibilityRole="button"
            accessibilityLabel={`Log ${displayTitle} to journal`}
          >
            {isLogging ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <View className="flex-row items-center justify-center">
                <AppText weight="bold" className="text-white text-xs">
                  + Log to Journal
                </AppText>
              </View>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
};

