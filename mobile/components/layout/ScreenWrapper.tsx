import React from "react";
import { View, ViewProps, StatusBar, Platform } from "react-native";
import { SafeAreaView, SafeAreaViewProps } from "react-native-safe-area-context";

interface ScreenWrapperProps extends SafeAreaViewProps {
  className?: string;
  maxWidth?: "narrow" | "default" | "wide" | "full";
  noPadding?: boolean;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  className,
  maxWidth = "default",
  noPadding = false,
  children,
  style,
  edges = ["top", "left", "right"],
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
      className={`flex-1 ${className || "bg-neutral-bg"}`}
      style={[{ flex: 1, width: "100%" }, style]}
      edges={edges}
      {...props}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={Platform.OS === "android"}
      />
      <View
        className={`flex-1 w-full ${getMaxWidthClass()} self-center ${
          noPadding ? "px-0" : "px-4 sm:px-6 lg:px-8"
        }`}
      >
        {children}
      </View>
    </SafeAreaView>
  );
};
