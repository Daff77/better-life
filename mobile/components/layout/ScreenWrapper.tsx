import React from "react";
import { View, ViewProps, StatusBar } from "react-native";
import { SafeAreaView, SafeAreaViewProps } from "react-native-safe-area-context";

interface ScreenWrapperProps extends SafeAreaViewProps {
  className?: string;
  maxWidth?: "narrow" | "default" | "wide" | "full";
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  className,
  maxWidth = "default",
  children,
  style,
  ...props
}) => {
  const getMaxWidthClass = () => {
    switch (maxWidth) {
      case "narrow":
        return "max-w-[540px]";
      case "wide":
        return "max-w-[1280px]";
      case "full":
        return "max-w-full";
      case "default":
      default:
        return "max-w-[1120px]";
    }
  };

  return (
    <SafeAreaView
      className={`flex-1 bg-neutral-bg ${className || ""}`}
      style={style}
      {...props}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View className={`flex-1 w-full ${getMaxWidthClass()} self-center`}>
        {children}
      </View>
    </SafeAreaView>
  );
};
