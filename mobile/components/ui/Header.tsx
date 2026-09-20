import React from "react";
import { View, TouchableOpacity } from "react-native";
import { AppText } from "./AppText";
import { IconButton } from "./IconButton";

export interface HeaderProps {
  title?: string;
  step?: {
    current: number;
    total: number;
  };
  onBack?: () => void;
  rightElement?: React.ReactNode;
  subtitle?: string;
  centered?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  step,
  onBack,
  rightElement,
  subtitle,
  centered = false,
}) => {
  return (
    <View className="w-full pt-3 pb-2 px-1">
      <View className="flex-row items-center justify-between min-h-[44px]">
        {/* Left: Back Button or Placeholder */}
        <View className="w-11 items-start">
          {onBack ? (
            <IconButton
              size={44}
              onPress={onBack}
              accessibilityLabel="Go back"
              icon={<AppText weight="bold" className="text-xl text-neutral-dark">‹</AppText>}
            />
          ) : null}
        </View>

        {/* Center: Title / Content */}
        <View className={`flex-1 ${centered ? "items-center" : "items-start px-2"}`}>
          {title ? (
            <AppText weight="extrabold" className="text-lg text-neutral-dark">
              {title}
            </AppText>
          ) : null}
          {subtitle ? (
            <AppText weight="medium" className="text-xs text-neutral-muted">
              {subtitle}
            </AppText>
          ) : null}
        </View>

        {/* Right: Step Counter or Action Element */}
        <View className="w-20 items-end justify-center">
          {step ? (
            <AppText weight="extrabold" className="text-sm text-neutral-muted">
              <AppText weight="extrabold" className="text-primary">
                Step {step.current}
              </AppText>
              {" of "}
              {step.total}
            </AppText>
          ) : (
            rightElement || null
          )}
        </View>
      </View>
    </View>
  );
};
