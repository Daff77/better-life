import React from "react";
import { View, Image, TouchableOpacity } from "react-native";
import { AppText } from "./AppText";
import { IconButton } from "./IconButton";
import { ChevronLeftIconSvg, BrandImages } from "@/constants/Assets";

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
  showLogo?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  step,
  onBack,
  rightElement,
  subtitle,
  centered = false,
  showLogo = false,
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
              icon={<ChevronLeftIconSvg size={22} color="#1f2937" />}
            />
          ) : null}
        </View>

        {/* Center: Title / Content / Logo */}
        <View className={`flex-1 ${centered ? "items-center" : "items-start px-2"}`}>
          {showLogo ? (
            <View className="flex-row items-center gap-2">
              <Image
                source={BrandImages.logoPng}
                style={{ width: 24, height: 24 }}
                resizeMode="contain"
                accessibilityLabel="Better Life Logo"
              />
              {title ? (
                <AppText weight="extrabold" className="text-lg text-neutral-dark">
                  {title}
                </AppText>
              ) : null}
            </View>
          ) : title ? (
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
