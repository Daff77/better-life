import React from "react";
import { View, Pressable, PressableProps, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { AnimationEasings } from "@/constants/AnimationTokens";

interface CardProps extends Omit<PressableProps, "children"> {
  children?: React.ReactNode;
  elevated?: boolean;
  className?: string;
  pressable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  elevated = false,
  pressable = false,
  className,
  children,
  style,
  onPress,
  ...props
}) => {
  const isInteractive = pressable || !!onPress;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!isInteractive) return;
    scale.value = withSpring(0.985, AnimationEasings.pressSpringConfig);
  };

  const handlePressOut = () => {
    if (!isInteractive) return;
    scale.value = withSpring(1, AnimationEasings.pressSpringConfig);
  };

  if (!isInteractive) {
    const resolvedStyle = typeof style === "function" ? style({ pressed: false }) : style;
    return (
      <View
        className={`bg-white rounded-2xl p-4 border border-neutral-border-light/60 ${
          elevated ? "shadow-md" : "shadow-sm"
        } ${className || ""}`}
        style={resolvedStyle}
      >
        {children}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className={`bg-white rounded-2xl p-4 border border-neutral-border-light/60 ${
        elevated ? "shadow-md" : "shadow-sm"
      } ${
        Platform.OS === "web"
          ? "hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer"
          : ""
      } ${className || ""}`}
      style={style}
      {...props}
    >
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

