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
      <Animated.View pointerEvents="none" style={cardAnimatedStyle}>
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
            <View className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-200/60 items-center justify-center">
              <IconRenderer name="Cook" size={28} color="#1b7a53" />
            </View>
          )}

          {/* Category Pill Tag */}
          <View className="absolute top-3 left-3">
            <Badge label={category} variant="accent" size="sm" />
          </View>

          {/* Prep Time Pill Tag with Vector Clock */}
          <View className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-black/[0.06] flex-row items-center gap-1 shadow-xs">
            <IconRenderer name="Clock" size={11} color="#64748b" />
            <AppText
              weight="semibold"
              className="text-[11px] text-neutral-muted"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {prepTimeMinutes}m
            </AppText>
          </View>
        </View>

        {/* Card Body Information */}
        <View className="p-4">
          <View className="flex-row items-start justify-between mb-2">
            <AppText
              weight="extrabold"
              numberOfLines={1}
              className="text-[16px] text-neutral-dark flex-1"
            >
              {title}
            </AppText>
          </View>

          {/* Nutrition & Difficulty Metadata Row */}
          <View className="flex-row items-center justify-between pt-2 border-t border-[#f2f8f4]">
            <View className="flex-row items-baseline">
              <AppText
                weight="black"
                className="text-sm text-primary"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {calories}
              </AppText>
              <AppText weight="semibold" className="text-xs text-neutral-muted ml-0.5">
                kcal
              </AppText>
            </View>

            <AppText weight="semibold" className="text-xs text-neutral-muted">
              {difficulty}
            </AppText>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

