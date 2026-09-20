import React from "react";
import { View, ViewProps } from "react-native";
import { AppText } from "./AppText";

export interface DividerProps extends ViewProps {
  label?: string;
}

export const Divider: React.FC<DividerProps> = ({ label, className, ...props }) => {
  if (!label) {
    return (
      <View
        className={`w-full h-[1px] bg-neutral-border-light my-4 ${className || ""}`}
        {...props}
      />
    );
  }

  return (
    <View className={`flex-row items-center w-full my-4 ${className || ""}`} {...props}>
      <View className="flex-1 h-[1px] bg-neutral-border-light" />
      <AppText weight="semibold" className="px-3 text-neutral-muted text-sm uppercase">
        {label}
      </AppText>
      <View className="flex-1 h-[1px] bg-neutral-border-light" />
    </View>
  );
};
