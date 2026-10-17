import React from "react";
import {
  View,
  TouchableOpacityProps,
  ImageSourcePropType,
  Image,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { AppText } from "./AppText";
import { Badge } from "./Badge";
import { IconRenderer, AppIconName } from "@/constants/Assets";
import { AnimationEasings } from "@/constants/AnimationTokens";

export interface RecipeCardProps extends Omit<TouchableOpacityProps, "children"> {
  title: string;
  category: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Drink";
  calories: number;
  prepTimeMinutes: number;
  difficulty?: "Easy" | "Medium" | "Hard";
  svgName?: AppIconName;
  imageUrl?: string;
  imageSource?: ImageSourcePropType;
  onPress?: () => void;
  className?: string;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  title,
  category,
  calories,
  prepTimeMinutes,
  difficulty = "Easy",
  svgName,
  imageUrl,
  imageSource,
  onPress,
  className,
  style,
  ...props
}) => {
  const cardScale = useSharedValue(1);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const handlePressIn = () => {
    if (!onPress) return;
    cardScale.value = withSpring(0.97, AnimationEasings.pressSpringConfig);
  };

  const handlePressOut = () => {
    if (!onPress) return;
    cardScale.value = withSpring(1, AnimationEasings.pressSpringConfig);
  };

  const effectiveImageSource = imageSource || (imageUrl ? { uri: imageUrl } : null);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className={`bg-white rounded-2xl border border-[#e5ece7] mb-4 overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
        className || ""
      }`}
      style={style as any}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${calories} calories, ${prepTimeMinutes} minutes preparation`}
      {...props}
    >
      <Animated.View style={cardAnimatedStyle} pointerEvents="none">
        {/* Visual Header Artwork with 1px Image Outline */}
        <View className="h-[156px] w-full bg-[#f2f8f4] items-center justify-center relative overflow-hidden border-b border-black/[0.06]">
          {effectiveImageSource ? (
            <>
              <Image
                source={effectiveImageSource}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
              <View className="absolute inset-x-0 top-0 h-12 bg-black/20" />
            </>
          ) : svgName ? (
            <IconRenderer name={svgName} size={64} />
          ) : (
            <AppText weight="bold" className="text-4xl">
              🥗
            </AppText>
          )}

          {/* Category Pill Tag */}
          <View className="absolute top-3 left-3">
            <Badge label={category} variant="accent" size="sm" />
          </View>

          {/* Prep Time Pill Tag */}
          <View className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-black/[0.06] flex-row items-center shadow-xs">
            <AppText
              weight="semibold"
              className="text-[11px] text-neutral-muted"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              ⏱ {prepTimeMinutes}m
            </AppText>
          </View>
        </View>

        {/* Card Body Information */}
        <View className="p-4">
          <View className="flex-row items-start justify-between mb-2">
            <AppText
              weight="extrabold"
              numberOfLines={1}
              className="text-[16px] text-neutral-dark flex-1 mr-2"
            >
              {title}
            </AppText>

            {/* Circular Explore Icon Indicator (Button-in-Button) */}
            <View className="w-6 h-6 rounded-full bg-[#f2f8f4] items-center justify-center border border-[#e5ece7]">
              <AppText weight="bold" className="text-xs text-primary leading-none">
                ↗
              </AppText>
            </View>
          </View>

          {/* Nutrition & Difficulty Metadata Row */}
          <View className="flex-row items-center justify-between pt-1 border-t border-[#f2f8f4]">
            <View className="flex-row items-baseline bg-[#eaf5ef] px-2.5 py-0.5 rounded-lg border border-[#cbe5d6]">
              <AppText
                weight="black"
                className="text-sm text-primary"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {calories}
              </AppText>
              <AppText weight="bold" className="text-[10px] text-neutral-muted ml-0.5">
                kcal
              </AppText>
            </View>

            <View className="px-2 py-0.5 bg-neutral-surface rounded-md border border-[#e5ece7]">
              <AppText weight="semibold" className="text-[11px] text-neutral-muted">
                {difficulty}
              </AppText>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

