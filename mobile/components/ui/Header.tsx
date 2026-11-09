import React from "react";
import { View } from "react-native";
import { AppText } from "./AppText";
import { RingButton, StatusPill } from "./Surface";
import { LineIcon } from "./LineIcon";

export interface HeaderProps {
  title?: string;
  step?: {
    current: number;
    total: number;
  };
  onBack?: () => void;
  rightElement?: React.ReactNode;
  rightComponent?: React.ReactNode;
  subtitle?: string;
  centered?: boolean;
  showLogo?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  step,
  onBack,
  rightElement,
  rightComponent,
  subtitle,
  centered = false,
  showLogo = false,
}) => {
  const resolvedRight = rightElement ?? rightComponent;
  return (
    <View className="w-full pt-3 pb-2.5">
      <View className="flex-row items-center justify-between min-h-[44px] gap-3">
        {/* Left: Back Button */}
        {onBack ? (
          <RingButton
            icon="arrowLeft"
            variant="solid"
            size="md"
            onPress={onBack}
            accessibilityLabel="Kembali"
          />
        ) : showLogo ? (
          <View className="flex-row items-center gap-2.5">
            <View className="w-9 h-9 rounded-[11px] bg-primary items-center justify-center">
              <LineIcon name="leaf" size={18} color="#ffffff" strokeWidth={2} />
            </View>
            <AppText weight="bold" className="text-[18px] text-ink" style={{ letterSpacing: -0.3 }}>
              {title || "Better Life"}
            </AppText>
          </View>
        ) : (
          <View className="w-11" />
        )}

        {/* Center: Title & Subtitle */}
        {!showLogo && (
          <View className={`flex-1 min-w-0 ${centered ? "items-center" : "items-start"}`}>
            {title ? (
              <AppText
                weight="semibold"
                numberOfLines={1}
                className="text-[19px] text-ink"
                style={{ letterSpacing: -0.3 }}
              >
                {title}
              </AppText>
            ) : null}
            {subtitle ? (
              <AppText weight="medium" numberOfLines={1} className="text-[12.5px] text-muted mt-0.5">
                {subtitle}
              </AppText>
            ) : null}
          </View>
        )}

        {/* Right: Step Counter or Custom Action */}
        <View className="items-end justify-center">
          {step ? (
            <StatusPill label={`Langkah ${step.current} / ${step.total}`} tone="accent" dot={false} />
          ) : (
            resolvedRight || (centered ? <View className="w-11" /> : null)
          )}
        </View>
      </View>
    </View>
  );
};
