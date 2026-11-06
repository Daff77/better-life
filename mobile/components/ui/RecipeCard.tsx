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
import { IconRenderer, AppIconName, CrownIconSvg } from "@/constants/Assets";
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
  isPremium?: boolean;
  isLocked?: boolean;
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
  isPremium,
  isLocked,
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
      className={`bg-white rounded-2xl border border-[#eaeaea] overflow-hidden ${
        className || ""
      }`}
      style={style as any}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${calories} calories, ${prepTimeMinutes} minutes preparation`}
      {...props}
    >
      <Animated.View pointerEvents="none" style={cardAnimatedStyle}>
        {/* Visual Header Artwork */}
        <View className="h-[148px] w-full bg-[#f4f4f5] items-center justify-center relative overflow-hidden">
          {effectiveImageSource ? (
            <Image
              source={effectiveImageSource}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : svgName ? (
            <IconRenderer name={svgName} size={64} />
          ) : (
            <View className="w-12 h-12 rounded-xl bg-[#f4f4f5] border border-[#e4e4e7] items-center justify-center">
              <IconRenderer name="Cook" size={24} color="#71717a" />
            </View>
          )}

          {/* Category Pill Tag (Minimalist soft neutral badge) */}
          <View className="absolute top-2.5 left-2.5 bg-white/95 px-2.5 py-0.5 rounded-md border border-[#e4e4e7]">
            <AppText weight="bold" className="text-[10px] text-[#52525b]">
              {category}
            </AppText>
          </View>

          {/* Prep Time Tag */}
          <View className="absolute top-2.5 right-2.5 bg-white/95 px-2 py-0.5 rounded-md border border-[#e4e4e7] flex-row items-center gap-1">
            <IconRenderer name="Clock" size={10} color="#71717a" />
            <AppText
              weight="bold"
              className="text-[10px] text-[#52525b]"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {prepTimeMinutes}m
            </AppText>
          </View>

          {/* Premium Special Indicator */}
          {isPremium && (
            <View className="absolute bottom-2.5 left-2.5 bg-[#fbf3db] px-2 py-0.5 rounded-md border border-[#f5e3ba] flex-row items-center gap-1">
              <CrownIconSvg size={10} color="#956400" />
              <AppText weight="bold" className="text-[9px] text-[#956400] tracking-wider uppercase">
                {isLocked ? "Premium" : "Chef Special"}
              </AppText>
            </View>
          )}
        </View>

        {/* Card Body Information */}
        <View className="p-3.5">
          <AppText
            weight="bold"
            numberOfLines={1}
            className="text-sm sm:text-[15px] text-[#18181b] mb-1 leading-snug"
          >
            {title}
          </AppText>

          {/* Nutrition & Difficulty Metadata Row */}
          <View className="flex-row items-center justify-between pt-2.5 mt-1 border-t border-[#f4f4f5]">
            <View className="flex-row items-baseline">
              <AppText
                weight="black"
                className="text-xs sm:text-[13px] text-[#18181b]"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {calories}
              </AppText>
              <AppText weight="semibold" className="text-[11px] text-[#71717a] ml-0.5">
                kcal
              </AppText>
            </View>

            <AppText weight="medium" className="text-xs text-[#71717a]">
              {difficulty}
            </AppText>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

