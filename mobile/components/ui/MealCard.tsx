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

export interface MealCardProps {
  title?: string;
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Drink" | string;
  calories: number;
  description: string;
  prepTimeMinutes?: number;
  estimatedCostIdr?: number;
  imageSource?: ImageSourcePropType;
  svgElement?: React.ReactNode;
  onLogMeal?: () => void;
  onPress?: () => void;
  isLogging?: boolean;
  className?: string;
}

export const MealCard: React.FC<MealCardProps> = ({
  title,
  mealType,
  calories,
  description,
  prepTimeMinutes,
  estimatedCostIdr,
  imageSource,
  svgElement,
  onLogMeal,
  onPress,
  isLogging = false,
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

  return (
    <View
      className={`w-full bg-white rounded-2xl overflow-hidden border border-neutral-border-light shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
        className || ""
      }`}
    >
      {/* Top Clickable Region: Food Art, Title, Calories, and Description */}
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className={`w-full ${Platform.OS === "web" ? "cursor-pointer" : ""}`}
        accessibilityRole="button"
        accessibilityLabel={`${displayTitle}, ${calories} calories`}
      >
        <Animated.View style={cardAnimatedStyle} pointerEvents="none">
          {/* Top Food Illustration Header */}
          <View className="h-[114px] w-full bg-[#edf9f2] items-center justify-center relative overflow-hidden">
            <View className="w-full h-full items-center justify-center py-2">
              {svgElement ? (
                <View className="w-full h-full items-center justify-center">
                  {svgElement}
                </View>
              ) : imageSource ? (
                <Image
                  source={imageSource}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                />
              ) : (
                <AppText weight="bold" className="text-4xl text-primary opacity-60">
                  🥗
                </AppText>
              )}
            </View>

            {/* Category Pill Tag */}
            <View className="absolute top-2.5 left-3">
              <Badge label={mealType} variant="accent" size="sm" />
            </View>

            {/* Prep Time Tag */}
            {Boolean(prepTimeMinutes) && (
              <View className="absolute top-2.5 right-3 bg-white/95 px-2.5 py-0.5 rounded-full border border-neutral-border-light flex-row items-center">
                <AppText weight="semibold" className="text-[11px] text-neutral-muted">
                  ⏱ {prepTimeMinutes}m
                </AppText>
              </View>
            )}
          </View>

          {/* Card Text Info */}
          <View className="p-3.5 pt-3 pb-1">
            {/* Title and Calorie Row */}
            <View className="flex-row items-center justify-between mb-1">
              <AppText
                weight="extrabold"
                numberOfLines={1}
                className="text-[17px] text-neutral-dark flex-1 mr-2"
              >
                {displayTitle}
              </AppText>

              {/* Calorie Pill Highlight */}
              <View className="flex-row items-baseline bg-secondary-soft px-2 py-0.5 rounded-lg border border-secondary">
                <AppText weight="black" className="text-base text-primary">
                  {calories}
                </AppText>
                <AppText weight="bold" className="text-[11px] text-neutral-muted ml-0.5">
                  kcal
                </AppText>
              </View>
            </View>

            {/* Estimated Local Ingredient Cost (Product Differentiator) */}
            {estimatedCostIdr !== undefined && (
              <View className="flex-row items-center mb-1.5">
                <View className="bg-emerald-50/90 px-2 py-0.5 rounded-md border border-emerald-200/70">
                  <AppText weight="bold" className="text-[11px] text-emerald-800">
                    Rp {estimatedCostIdr.toLocaleString("id-ID")}{" "}
                    <AppText weight="medium" className="text-[10px] text-emerald-600">
                      (est.)
                    </AppText>
                  </AppText>
                </View>
              </View>
            )}

            {/* Description */}
            <AppText
              weight="medium"
              numberOfLines={2}
              className="text-xs text-neutral-muted leading-4"
            >
              {description}
            </AppText>
          </View>
        </Animated.View>
      </Pressable>

      {/* Sibling Bottom Action Region: CTA Log to Journal Button */}
      <View className="px-3.5 pb-3.5 pt-2">
        <Pressable
          onPress={onLogMeal}
          disabled={isLogging}
          className={`w-full h-[40px] rounded-xl flex-row items-center justify-center active:opacity-85 ${
            isLogging ? "bg-primary/70" : "bg-primary active:bg-primary-dark"
          } ${Platform.OS === "web" ? "cursor-pointer hover:bg-primary-dark transition-colors" : ""}`}
          accessibilityRole="button"
          accessibilityLabel={`Log ${displayTitle} to journal`}
        >
          {isLogging ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <View className="flex-row items-center justify-center">
              <AppText
                weight="bold"
                className="text-white text-base leading-none mr-1.5"
              >
                +
              </AppText>
              <AppText
                weight="extrabold"
                className="text-white text-xs tracking-wide"
              >
                Log to Journal
              </AppText>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
};

