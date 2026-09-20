import React from "react";
import { View, StatusBar, Platform } from "react-native";
import { SafeAreaView, SafeAreaViewProps } from "react-native-safe-area-context";

interface ScreenWrapperProps extends SafeAreaViewProps {
  className?: string;
  maxWidth?: "mobile" | "narrow" | "default" | "wide" | "full";
  contentClassName?: string;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  className,
  maxWidth = "mobile",
  contentClassName = "",
  children,
  style,
  ...props
}) => {
  const getMaxWidthClass = () => {
    switch (maxWidth) {
      case "mobile":
        return "max-w-[460px]";
      case "narrow":
        return "max-w-[540px]";
      case "wide":
        return "max-w-[800px]";
      case "full":
        return "max-w-full";
      case "default":
      default:
        return "max-w-[460px]";
    }
  };

  const isWeb = Platform.OS === "web";

  return (
    <View className={`flex-1 ${isWeb ? "bg-[#eef5f1] items-center justify-center" : "bg-neutral-bg"}`}>
      <SafeAreaView
        className={`flex-1 w-full bg-white ${isWeb ? `${getMaxWidthClass()} shadow-xl border-x border-neutral-border-light/60` : ""} ${className || ""}`}
        style={style}
        {...props}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View className={`flex-1 w-full ${contentClassName}`}>
          {children}
        </View>
      </SafeAreaView>
    </View>
  );
};

