import React from "react";
import { View, ViewProps } from "react-native";
import { AppText } from "./AppText";

export interface BadgeProps extends ViewProps {
  label: string;
  variant?: "primary" | "secondary" | "accent" | "outline";
  size?: "sm" | "md";
}

/**
 * Status label. Use only for a real state (Premium, Aktif), never as decoration.
 * - primary: forest fill, for an active state.
 * - secondary: sage tint, for neutral metadata.
 * - accent: amber tint, reserved for premium / attention.
 * - outline: hairline forest border.
 */
export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = "primary",
  size = "md",
  className,
  ...props
}) => {
  const container = {
    primary: "bg-primary",
    secondary: "bg-primary-light",
    accent: "bg-[#fdf3e3]",
    outline: "border border-[#cfdcd3] bg-transparent",
  }[variant];

  const text = {
    primary: "text-white",
    secondary: "text-primary",
    accent: "text-[#8a4106]",
    outline: "text-primary",
  }[variant];

  return (
    <View
      className={`rounded-md self-start items-center justify-center ${
        size === "sm" ? "px-1.5 py-0.5" : "px-2 py-0.5"
      } ${container} ${className || ""}`}
      {...props}
    >
      <AppText weight="bold" className={`${size === "sm" ? "text-[10px]" : "text-[11px]"} ${text}`}>
        {label}
      </AppText>
    </View>
  );
};
