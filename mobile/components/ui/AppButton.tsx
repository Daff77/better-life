import React from "react";
import { TouchableOpacity, TouchableOpacityProps, ActivityIndicator } from "react-native";
import { AppText } from "./AppText";

interface AppButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "outline";
  loading?: boolean;
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  variant = "primary",
  loading = false,
  disabled,
  className,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return "bg-primary active:bg-primary-dark";
      case "secondary":
        return "bg-secondary active:bg-secondary-soft";
      case "outline":
        return "bg-transparent border border-primary active:bg-primary-subtle";
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "primary":
        return "text-white";
      case "secondary":
        return "text-accent-teal";
      case "outline":
        return "text-primary";
    }
  };

  return (
    <TouchableOpacity
      className={`h-[52px] rounded-xl flex-row items-center justify-center px-4 ${getVariantStyles()} ${
        disabled ? "opacity-50" : ""
      } ${className || ""}`}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#ffffff" : "#67c090"} />
      ) : (
        <AppText weight="bold" className={`text-[17px] ${getTextColor()}`}>
          {title}
        </AppText>
      )}
    </TouchableOpacity>
  );
};
