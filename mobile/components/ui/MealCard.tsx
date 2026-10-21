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
      className={`w-full bg-white rounded-2xl overflow-hidden border border-[#e5ece7] shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
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
        <Animated.View style={[cardAnimatedStyle, { pointerEvents: "none" }]}>
          {/* Top Food Image Header with 1px Crisp Outline */}
          <View className="h-[156px] w-full bg-[#f2f8f4] items-center justify-center relative overflow-hidden border-b border-black/[0.06]">
            {effectiveImageSource ? (
              <>
                <Image
                  source={effectiveImageSource}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
                {/* Subtle top vignette for badge contrast */}
                <View className="absolute inset-x-0 top-0 h-12 bg-black/20" />
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

            {/* Category Pill Tag */}
            <View className="absolute top-3 left-3">
              <Badge label={mealType} variant="accent" size="sm" />
            </View>

            {/* Prep Time Tag with Clean Vector Clock */}
            {Boolean(prepTimeMinutes) && (
              <View className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-black/[0.06] flex-row items-center gap-1 shadow-xs">
                <IconRenderer name="Clock" size={11} color="#64748b" />
                <AppText weight="semibold" className="text-[11px] text-neutral-muted" style={{ fontVariant: ["tabular-nums"] }}>
                  {prepTimeMinutes}m
                </AppText>
              </View>
            )}
          </View>

          {/* Card Text Info */}
          <View className="p-4 pt-3.5 pb-1">
            {/* Title and Calorie Row */}
            <View className="flex-row items-center justify-between mb-1.5">
              <AppText
                weight="extrabold"
                numberOfLines={1}
                className="text-[16px] text-neutral-dark flex-1 mr-2"
              >
                {displayTitle}
              </AppText>

              {/* Calorie Display with Tabular Numbers */}
              <View className="flex-row items-baseline">
                <AppText
                  weight="black"
                  className="text-base text-primary"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {calories}
                </AppText>
                <AppText weight="semibold" className="text-xs text-neutral-muted ml-0.5">
                  kcal
                </AppText>
              </View>
            </View>

            {/* Estimated Local Ingredient Cost (Tabular Numbers) */}
            {estimatedCostIdr !== undefined && (
              <View className="flex-row items-center mb-1.5">
                <AppText
                  weight="semibold"
                  className="text-xs text-emerald-800"
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  Rp {estimatedCostIdr.toLocaleString("id-ID")}{" "}
                  <AppText weight="regular" className="text-[11px] text-neutral-muted">
                    (est.)
                  </AppText>
                </AppText>
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

      {/* Sibling Bottom Action Region: Nested CTA Log to Journal Button */}
      <View className="px-4 pb-4 pt-2">
        <Pressable
          onPress={onLogMeal}
          disabled={isLogging}
          className={`w-full min-h-[46px] rounded-xl flex-row items-center justify-center active:scale-[0.96] transition-all duration-150 ${
            isLogging ? "bg-primary/70" : "bg-primary active:bg-primary-dark"
          } ${Platform.OS === "web" ? "cursor-pointer hover:bg-primary-dark shadow-xs" : ""}`}
          accessibilityRole="button"
          accessibilityLabel={`Log ${displayTitle} to journal`}
        >
          {isLogging ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <View className="flex-row items-center justify-center">
              <View className="w-5 h-5 rounded-full bg-white/20 items-center justify-center mr-2">
                <AppText weight="black" className="text-white text-xs leading-none">
                  +
                </AppText>
              </View>
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

