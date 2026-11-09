import React, { useContext } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, SafeAreaViewProps } from "react-native-safe-area-context";
import { AnimatedView } from "@/lib/nativewindInterop";
import { TabSwipeSceneContext } from "@/lib/tabSwipeGuard";

interface ScreenWrapperProps extends SafeAreaViewProps {
  className?: string;
  maxWidth?: "narrow" | "default" | "wide" | "full";
  noPadding?: boolean;
  statusBarStyle?: "dark" | "light" | "auto";
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  className,
  maxWidth = "default",
  noPadding = false,
  statusBarStyle,
  children,
  style,
  edges = ["top", "left", "right"],
  ...props
}) => {
  const tabSwipeStyle = useContext(TabSwipeSceneContext);

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

  const isDarkBg =
    className?.includes("bg-[#0") ||
    className?.includes("bg-[#1") ||
    className?.includes("bg-neutral-dark") ||
    className?.includes("bg-black");

  return (
    <SafeAreaView
      className={`flex-1 ${className || "bg-neutral-bg"}`}
      style={[{ flex: 1, width: "100%" }, style]}
      edges={edges}
      {...props}
    >
      <StatusBar style={statusBarStyle || (isDarkBg ? "light" : "dark")} />
      <AnimatedView
        className={`flex-1 w-full ${getMaxWidthClass()} self-center ${
          noPadding ? "px-0" : "px-4 sm:px-6 lg:px-8"
        }`}
        animatedStyle={tabSwipeStyle || undefined}
      >
        {children}
      </AnimatedView>
    </SafeAreaView>
  );
};
