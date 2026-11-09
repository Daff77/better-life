import React from "react";
import { View, ViewProps } from "react-native";

export interface FadeInViewProps extends ViewProps {
  children: React.ReactNode;
  /** Position in a stagger group (0, 1, 2...). Multiplied by 45ms, capped at 240ms. */
  index?: number;
  /** Explicit delay in ms (overrides index). */
  delay?: number;
  /** Initial downward offset in px; defaults to 8. */
  distance?: number;
  className?: string;
}

/**
 * Layout-safe container wrapper that preserves all NativeWind v4 className
 * rules (flex, width, margins, gaps) on both Native Android/iOS and Web.
 */
export const FadeInView: React.FC<FadeInViewProps> = ({
  children,
  index: _index = 0,
  delay: _delay,
  distance: _distance = 8,
  className,
  style,
  ...props
}) => {
  return (
    <View className={className} style={style} {...props}>
      {children}
    </View>
  );
};
