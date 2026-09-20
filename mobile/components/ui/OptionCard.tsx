import React from "react";
import { View, Pressable, PressableProps } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { AppText } from "./AppText";
import { Colors } from "@/constants/DesignTokens";
import { AnimationEasings } from "@/constants/AnimationTokens";

export interface OptionCardProps extends Omit<PressableProps, "children"> {
  title: string;
  subtitle?: string;
  selected?: boolean;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  multiSelect?: boolean;
  className?: string;
}

export const OptionCard: React.FC<OptionCardProps> = ({
  title,
  subtitle,
  selected = false,
  leftElement,
  rightElement,
  multiSelect = false,
  disabled,
  className,
  style,
  onPress,
  ...props
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.985, AnimationEasings.pressSpringConfig);
  };

  const handlePressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, AnimationEasings.pressSpringConfig);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className={`w-full min-h-[68px] p-4 rounded-xl border flex-row items-center justify-between mb-3 transition-all duration-150 hover:shadow-xs cursor-pointer ${
        selected
          ? "border-primary bg-[#edf8f2]"
          : "border-neutral-border bg-white"
      } ${
        disabled ? "opacity-45" : ""
      } ${className || ""}`}
      disabled={disabled}
      style={style}
      accessibilityRole={multiSelect ? "checkbox" : "radio"}
      accessibilityLabel={props.accessibilityLabel || (subtitle ? `${title}, ${subtitle}` : title)}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      {...props}
    >
      <Animated.View
        style={[
          {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          },
          animatedStyle,
        ]}
        pointerEvents="none"
      >
        <View className="flex-row items-center flex-1 mr-2">
          {/* Selection Indicator */}
          <View
            className={`w-6 h-6 rounded-full border-2 mr-3.5 items-center justify-center ${
              selected
                ? "border-primary bg-primary"
                : "border-neutral-border bg-white"
            }`}
          >
            {selected && (
              <View
                style={{
                  width: multiSelect ? 10 : 8,
                  height: multiSelect ? 10 : 8,
                  borderRadius: multiSelect ? 2 : 4,
                }}
                className="bg-white"
              />
            )}
          </View>

          {Boolean(leftElement) && <View className="mr-3">{leftElement}</View>}

          {/* Text Content */}
          <View className="flex-1">
            <AppText
              weight="extrabold"
              className={`text-[17px] ${
                selected ? "text-primary" : "text-neutral-dark"
              }`}
            >
              {title}
            </AppText>
            {Boolean(subtitle) && (
              <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
                {subtitle}
              </AppText>
            )}
          </View>
        </View>

        {Boolean(rightElement) && <View className="ml-2">{rightElement}</View>}
      </Animated.View>
    </Pressable>
  );
};

