import React from "react";
import {
  View,
  ViewProps,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import Animated from "react-native-reanimated";
import { cssInterop } from "nativewind";

const BaseAnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface InteropAnimatedViewProps extends ViewProps {
  className?: string;
  style?: StyleProp<ViewStyle>;
  animatedStyle?: any;
  entering?: any;
  exiting?: any;
  layout?: any;
  children?: React.ReactNode;
}

/**
 * Bridge component that separates NativeWind `className` style resolution from
 * Reanimated `useAnimatedStyle` worklet descriptors.
 *
 * Why this is needed:
 * - On Native (Android/iOS), `react-native-css-interop` merges `className` and `props.style`
 *   into a single object via `Object.assign`. If a Reanimated `animatedStyle` (which carries
 *   `.viewDescriptors`) is passed in `props.style`, Reanimated's `PropsFilter` replaces the
 *   entire merged object with `handle.initial.value`, wiping out all `className` layout styles.
 * - By passing `animatedStyle` as a separate prop and combining `[style, animatedStyle]`
 *   inside the component after `cssInterop` has resolved `className -> style`, both NativeWind
 *   classes and Reanimated UI-thread animations work together on Expo Go (Android/iOS) and Web.
 */
const RawAnimatedView = React.forwardRef<View, InteropAnimatedViewProps>(
  ({ style, animatedStyle, children, ...props }, ref) =>
    React.createElement(
      Animated.View as React.ComponentType<any>,
      {
        ...props,
        ref,
        style: animatedStyle ? [style, animatedStyle] : style,
      },
      children
    )
);
RawAnimatedView.displayName = "InteropAnimatedView";

export const AnimatedView = cssInterop(RawAnimatedView, {
  className: "style",
});

export interface InteropAnimatedPressableProps extends Omit<PressableProps, "style"> {
  className?: string;
  style?: StyleProp<ViewStyle>;
  animatedStyle?: any;
  entering?: any;
  exiting?: any;
  layout?: any;
  children?: React.ReactNode;
}

const RawAnimatedPressable = React.forwardRef<View, InteropAnimatedPressableProps>(
  ({ style, animatedStyle, children, ...props }, ref) =>
    React.createElement(
      BaseAnimatedPressable as React.ComponentType<any>,
      {
        ...props,
        ref,
        style: animatedStyle ? [style, animatedStyle] : style,
      },
      children
    )
);
RawAnimatedPressable.displayName = "InteropAnimatedPressable";

export const AnimatedPressable = cssInterop(RawAnimatedPressable, {
  className: "style",
});
