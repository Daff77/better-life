import React from "react";
import { Text, TextProps, TextStyle } from "react-native";
import { Fonts } from "@/constants/Theme";

type FontWeightKey = "regular" | "medium" | "semibold" | "bold" | "extrabold" | "black";

export interface AppTextProps extends TextProps {
  weight?: FontWeightKey;
  className?: string;
}

export const AppText: React.FC<AppTextProps> = ({
  weight = "regular",
  style,
  className,
  children,
  ...props
}) => {
  const fontStyle: TextStyle = {
    fontFamily: Fonts[weight],
  };

  return (
    <Text
      maxFontSizeMultiplier={props.maxFontSizeMultiplier ?? 1.35}
      style={[fontStyle, style]}
      className={className}
      {...props}
    >
      {children}
    </Text>
  );
};
