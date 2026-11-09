import React from "react";
import { View, PressableProps, StyleProp, ViewStyle } from "react-native";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";

export interface OptionCardProps extends Omit<PressableProps, "children" | "style"> {
  title: string;
  subtitle?: string;
  selected?: boolean;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  multiSelect?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
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
  return (
    <PressableScale
      onPress={onPress}
      pressedScale={0.985}
      className={`w-full min-h-[68px] p-4 rounded-xl border flex-row items-center justify-between mb-3 ${
        selected
          ? "border-primary bg-[#edf8f2]"
          : "border-neutral-border bg-white"
      } ${className || ""}`}
      disabled={disabled}
      style={style}
      accessibilityRole={multiSelect ? "checkbox" : "radio"}
      accessibilityLabel={props.accessibilityLabel || (subtitle ? `${title}, ${subtitle}` : title)}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      {...props}
    >
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          pointerEvents: "none",
        }}
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
      </View>
    </PressableScale>
  );
};
