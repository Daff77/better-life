import React from "react";
import {
  Image,
  ImageStyle,
  StyleProp,
  TouchableOpacity,
  View,
  ViewStyle,
  Platform,
} from "react-native";
import { BrandImages } from "@/constants/Assets";
import { AppText } from "./AppText";

export interface BrandLogoProps {
  size?: number;
  withText?: boolean;
  textSize?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
  subtitle?: string | boolean;
  orientation?: "horizontal" | "vertical";
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 32,
  withText = false,
  textSize = "base",
  subtitle = false,
  orientation = "horizontal",
  style,
  imageStyle,
  onPress,
  accessibilityLabel = "Better Life Logo",
}) => {
  const content = (
    <View
      className={`${
        orientation === "vertical"
          ? "items-center text-center gap-2"
          : "flex-row items-center gap-2.5"
      }`}
      style={style}
    >
      <Image
        source={BrandImages.logoPng}
        style={[
          {
            width: size,
            height: size,
          },
          imageStyle,
        ]}
        resizeMode="contain"
        accessibilityLabel={accessibilityLabel}
      />
      {withText && (
        <View className={orientation === "vertical" ? "items-center" : "justify-center"}>
          <AppText
            weight="bold"
            className={`text-${textSize} text-neutral-dark tracking-tight leading-none ${
              orientation === "vertical" ? "text-center" : ""
            }`}
          >
            Better Life
          </AppText>
          {subtitle && (
            <AppText
              weight="bold"
              className={`text-[9px] text-[#2c5840] tracking-wider uppercase mt-1 ${
                orientation === "vertical" ? "text-center" : ""
              }`}
            >
              {typeof subtitle === "string" ? subtitle : "Wellness & Nutrition"}
            </AppText>
          )}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        className={Platform.OS === "web" ? "cursor-pointer" : ""}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

