import React from "react";
import { View } from "react-native";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";

export interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
}

/** Single-select filter pill. Selected state is a forest fill; idle is a hairline outline. */
export const FilterChip: React.FC<FilterChipProps> = ({ label, selected, onPress, icon }) => (
  <PressableScale
    onPress={onPress}
    pressedScale={0.96}
    className={`h-10 px-4 rounded-full flex-row items-center justify-center ${
      selected ? "bg-primary" : "bg-white border border-[#e3e1da]"
    }`}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    accessibilityLabel={`Filter ${label}`}
  >
    {icon ? <View className="mr-1.5">{icon}</View> : null}
    <AppText weight={selected ? "bold" : "medium"} className={`text-[13px] ${selected ? "text-white" : "text-neutral-dark"}`}>
      {label}
    </AppText>
  </PressableScale>
);

