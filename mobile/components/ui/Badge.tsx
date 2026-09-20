import React from "react";
import { View, ViewProps } from "react-native";
import { AppText } from "./AppText";

export interface BadgeProps extends ViewProps {
  label: string;
  variant?: "primary" | "secondary" | "accent" | "outline";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = "primary",
  size = "md",
  className,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return "bg-primary text-white";
      case "secondary":
        return "bg-secondary text-accent-teal";
      case "accent":
        return "bg-accent-teal text-white";
      case "outline":
        return "border border-primary bg-transparent text-primary";
    }
  };

  const getSizeStyles = () => {
    return size === "sm" ? "px-2 py-0.5" : "px-3 py-1";
  };

  const getTextColor = () => {
    switch (variant) {
      case "primary":
      case "accent":
        return "text-white";
      case "secondary":
        return "text-accent-teal";
      case "outline":
        return "text-primary";
    }
  };

  return (
    <View
      className={`rounded-full self-start items-center justify-center ${getSizeStyles()} ${getVariantStyles()} ${className || ""}`}
      {...props}
    >
      <AppText weight="bold" className={`text-xs ${getTextColor()}`}>
        {label}
      </AppText>
    </View>
  );
};
