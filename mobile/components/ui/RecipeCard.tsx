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
      className={`bg-white rounded-2xl border border-[#eae8e1] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#dcdfd9] cursor-pointer ${
        className || ""
      }`}
      style={style as any}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${calories} calories, ${prepTimeMinutes} minutes preparation`}
      {...props}
    >
      <Animated.View pointerEvents="none" style={cardAnimatedStyle}>
        {/* Visual Header Artwork */}
        <View className="h-[148px] w-full bg-[#f4f3ed] items-center justify-center relative overflow-hidden">
          {effectiveImageSource ? (
            <Image
              source={effectiveImageSource}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : svgName ? (
            <IconRenderer name={svgName} size={64} />
          ) : (
            <View className="w-12 h-12 rounded-xl bg-secondary-soft items-center justify-center">
              <IconRenderer name="Cook" size={24} color="#153e28" />
            </View>
          )}

          {/* Category Pill Tag (Restrained soft white badge) */}
          <View className="absolute top-2.5 left-2.5 bg-white/95 px-2.5 py-0.5 rounded-full border border-black/5 shadow-2xs">
            <AppText weight="bold" className="text-[10px] text-neutral-dark">
              {category}
            </AppText>
          </View>

          {/* Prep Time Tag */}
          <View className="absolute top-2.5 right-2.5 bg-white/95 px-2 py-0.5 rounded-full border border-black/5 flex-row items-center gap-1 shadow-2xs">
            <IconRenderer name="Clock" size={10} color="#b45309" />
            <AppText
              weight="bold"
              className="text-[10px] text-neutral-dark"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {prepTimeMinutes}m
            </AppText>
          </View>
        </View>

        {/* Card Body Information */}
        <View className="p-3.5">
          <AppText
            weight="bold"
            numberOfLines={1}
            className="text-sm sm:text-[15px] text-neutral-dark mb-1 leading-snug"
          >
            {title}
          </AppText>

          {/* Nutrition & Difficulty Metadata Row */}
          <View className="flex-row items-center justify-between pt-2.5 mt-1 border-t border-[#f4f2ec]">
            <View className="flex-row items-baseline">
              <AppText
                weight="black"
                className="text-xs sm:text-[13px] text-primary"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {calories}
              </AppText>
              <AppText weight="semibold" className="text-[11px] text-neutral-muted ml-0.5">
                kcal
              </AppText>
            </View>

            <AppText weight="medium" className="text-xs text-neutral-muted">
              {difficulty}
            </AppText>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

