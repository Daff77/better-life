import React from "react";
import { View, ViewStyle } from "react-native";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";
import { SURFACE_SHADOW } from "./Surface";

export interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
}

/**
 * Single-select filter pill. Selected state lifts onto a dark ink pill (matching Vialo's active tab pill);
 * idle sits on a card-colored pill with a hairline ring.
 */
export const FilterChip: React.FC<FilterChipProps> = ({ label, selected, onPress, icon }) => (
  <PressableScale
    onPress={onPress}
    pressedScale={0.96}
    className={`h-10 px-4 rounded-full flex-row items-center justify-center ${
      selected ? "bg-block-ink" : "bg-card border border-line"
    }`}
    style={selected ? undefined : ({ boxShadow: SURFACE_SHADOW } as ViewStyle)}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    accessibilityLabel={`Filter ${label}`}
  >
    {icon ? <View className="mr-1.5">{icon}</View> : null}
    <AppText
      weight="semibold"
      className={`text-[13.5px] ${selected ? "text-block-on-ink" : "text-ink-2"}`}
    >
      {label}
    </AppText>
  </PressableScale>
);
