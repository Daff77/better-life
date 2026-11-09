import React from "react";
import { ActivityIndicator, StyleProp, ViewStyle } from "react-native";
import { AppText } from "./AppText";
import { PressableScale, PressableScaleProps } from "./PressableScale";

interface AppButtonProps extends Omit<PressableScaleProps, "children"> {
  title: string;
  variant?: "primary" | "secondary" | "outline";
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  variant = "primary",
  loading = false,
  disabled,
  className,
  style,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return "bg-primary";
      case "secondary":
        return "bg-secondary";
      case "outline":
        return "bg-transparent border border-primary";
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
    <PressableScale
      pressedScale={0.97}
      className={`h-[52px] rounded-xl flex-row items-center justify-center px-4 ${getVariantStyles()} ${
        className || ""
      }`}
      style={style}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#ffffff" : "#0e7a52"} />
      ) : (
        <AppText weight="bold" className={`text-[17px] ${getTextColor()}`}>
          {title}
        </AppText>
      )}
    </PressableScale>
  );
};
