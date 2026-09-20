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
    cardScale.value = withSpring(0.985, AnimationEasings.pressSpringConfig);
  };

  const handlePressOut = () => {
    if (!onPress) return;
    cardScale.value = withSpring(1, AnimationEasings.pressSpringConfig);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className={`bg-white rounded-2xl border border-neutral-border-light/80 p-4 mb-3.5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
        className || ""
      }`}
      style={style as any}
      accessibilityRole="button"
      {...props}
    >
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          },
          cardAnimatedStyle,
        ]}
        pointerEvents="none"
      >
        <View className="flex-row items-center flex-1 mr-3">
          {/* Visual Thumbnail */}
          <View className="w-16 h-16 rounded-2xl bg-secondary items-center justify-center mr-3.5 overflow-hidden">
            <View className="w-full h-full items-center justify-center">
              {svgName ? (
                <IconRenderer name={svgName} size={42} />
              ) : imageSource ? (
                <Image
                  source={imageSource}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <AppText weight="bold" className="text-2xl">
                  🥗
                </AppText>
              )}
            </View>
          </View>

          {/* Text Details */}
          <View className="flex-1">
            <AppText
              weight="extrabold"
              numberOfLines={1}
              className="text-base text-neutral-dark"
            >
              {title}
            </AppText>

            <View className="flex-row items-center gap-x-2 mt-1">
              <AppText weight="bold" className="text-xs text-primary">
                {calories} kcal
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted">
                •
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted">
                {prepTimeMinutes} min
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted">
                •
              </AppText>
              <AppText weight="medium" className="text-xs text-neutral-muted">
                {difficulty}
              </AppText>
            </View>
          </View>
        </View>

        {/* Category Pill Tag */}
        <Badge label={category} variant="secondary" size="sm" />
      </Animated.View>
    </Pressable>
  );
};

