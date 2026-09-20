import React, { useEffect } from "react";
import { View, ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  AnimationEasings,
  AnimationTimings,
  AnimationScales,
  AnimationDistances,
} from "@/constants/AnimationTokens";

export type TabIconType = "Home" | "Meals" | "Recipes" | "Profile";

interface AnimatedTabIconProps {
  name: TabIconType | string;
  focused: boolean;
  color: string | ColorValue;
  size?: number;
}

export const AnimatedTabIcon: React.FC<AnimatedTabIconProps> = ({
  name,
  focused,
  color,
  size = 22,
}) => {
  const scale = useSharedValue(focused ? AnimationScales.activeTab : 1);
  const translateY = useSharedValue(focused ? AnimationDistances.tabActiveY : 0);
  const indicatorWidth = useSharedValue(focused ? 14 : 0);
  const indicatorOpacity = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(focused ? AnimationScales.activeTab : 1, AnimationEasings.tabSpringConfig);
    translateY.value = withSpring(focused ? AnimationDistances.tabActiveY : 0, AnimationEasings.tabSpringConfig);
    indicatorWidth.value = withSpring(focused ? 14 : 0, AnimationEasings.tabSpringConfig);
    indicatorOpacity.value = withTiming(focused ? 1 : 0, { duration: AnimationTimings.microSlow });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    width: indicatorWidth.value,
    opacity: indicatorOpacity.value,
  }));

  const iconColor = typeof color === "string" ? color : focused ? "#22c55e" : "#64748b";

  const renderIconSvg = () => {
    switch (name) {
      case "Home":
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
              d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"
              fill={iconColor}
            />
          </Svg>
        );

      case "Meals":
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
              d="M8.5 4.5v-3a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0zm3.5 0v-3a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0zm3.5 0v-3a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0zm7.85 4.8l-1.85 1.4V8.5a1.5 1.5 0 0 0-1.5-1.5H4a1.5 1.5 0 0 0-1.5 1.5v2.2L.65 9.3a.75.75 0 0 0-.15.95l2.5 3.75v5.5A2.5 2.5 0 0 0 5.5 22h13a2.5 2.5 0 0 0 2.5-2.5V14l2.5-3.75a.75.75 0 0 0-.15-.95z"
              fill={iconColor}
            />
          </Svg>
        );

      case "Recipes":
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
              d="M19 2H6c-1.2 0-2 .8-2 2v16c0 1.2.8 2 2 2h13c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 18H6c-.55 0-1-.45-1-1s.45-1 1-1h12v2zm0-4H6V4h5v6l2-1.2 2 1.2V4h3v12z"
              fill={iconColor}
            />
          </Svg>
        );

      case "Profile":
      default:
        return (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm-7 18a7 7 0 0 1 14 0H5z"
              fill={iconColor}
            />
          </Svg>
        );
    }
  };

  return (
    <View className="items-center justify-center">
      <Animated.View style={animatedStyle}>
        {renderIconSvg()}
      </Animated.View>
      <Animated.View
        style={[
          {
            height: 2.5,
            borderRadius: 9999,
            backgroundColor: "#22c55e",
            marginTop: 4,
          },
          animatedIndicatorStyle,
        ]}
      />
    </View>
  );
};

