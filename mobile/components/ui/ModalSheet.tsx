import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { AnimatedView } from "@/lib/nativewindInterop";
import {
  AnimationEasings,
  MotionCurves,
  MotionDurations,
  rubberband,
} from "@/constants/AnimationTokens";

export interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  variant?: "sheet" | "dialog";
  dismissible?: boolean;
  showHandle?: boolean;
  accessibilityLabel?: string;
  contentClassName?: string;
  contentStyle?: StyleProp<ViewStyle>;
  backdropClassName?: string;
  statusBarTranslucent?: boolean;
  children: React.ReactNode;
}

const SHEET_SPRING = {
  damping: 26,
  stiffness: 280,
  mass: 0.72,
  overshootClamping: true,
};

const drawerEase = Easing.bezier(...MotionCurves.drawer);
const outEase = Easing.bezier(...MotionCurves.out);

/**
 * Shared animated modal/sheet wrapper with smooth enter & exit transitions,
 * NativeWind-safe `AnimatedView`, Web Escape + backdrop dismissal, mobile swipe-to-dismiss
 * (`PanResponder` with rubber-band overshoot resistance), and full reduced-motion support.
 */
export const ModalSheet: React.FC<ModalSheetProps> = ({
  visible,
  onClose,
  variant = "sheet",
  dismissible = true,
  showHandle,
  accessibilityLabel,
  contentClassName = "",
  contentStyle,
  backdropClassName = "",
  statusBarTranslucent = true,
  children,
}) => {
  const reduceMotion = Boolean(useReducedMotion());
  const [mounted, setMounted] = useState(visible);

  const backdropProgress = useSharedValue(visible ? 1 : 0);
  const panelProgress = useSharedValue(visible ? 1 : 0);
  const dragY = useSharedValue(0);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const dismissibleRef = useRef(dismissible);
  dismissibleRef.current = dismissible;
  const isDismissingByDragRef = useRef(false);

  const handleCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (handleCloseTimerRef.current) {
      clearTimeout(handleCloseTimerRef.current);
      handleCloseTimerRef.current = null;
    }

    if (visible) {
      isDismissingByDragRef.current = false;
      setMounted(true);
      dragY.value = 0;

      if (reduceMotion) {
        backdropProgress.value = withTiming(1, { duration: 120, easing: outEase });
        panelProgress.value = withTiming(1, { duration: 120, easing: outEase });
      } else {
        backdropProgress.value = withTiming(1, {
          duration: MotionDurations.enter,
          easing: drawerEase,
        });
        panelProgress.value =
          variant === "sheet"
            ? withSpring(1, SHEET_SPRING)
            : withSpring(1, AnimationEasings.entranceSpringConfig);
      }
    } else if (mounted) {
      if (isDismissingByDragRef.current) {
        setMounted(false);
        dragY.value = 0;
        isDismissingByDragRef.current = false;
        return;
      }

      const exitDuration = reduceMotion ? 110 : MotionDurations.exit;
      backdropProgress.value = withTiming(0, {
        duration: exitDuration,
        easing: outEase,
      });
      panelProgress.value = withTiming(0, {
        duration: exitDuration,
        easing: outEase,
      });

      handleCloseTimerRef.current = setTimeout(() => {
        setMounted(false);
        dragY.value = 0;
        isDismissingByDragRef.current = false;
      }, exitDuration + 16);
    }

    return () => {
      if (handleCloseTimerRef.current) {
        clearTimeout(handleCloseTimerRef.current);
      }
    };
  }, [visible, reduceMotion, variant, mounted, backdropProgress, panelProgress, dragY]);

  useEffect(() => {
    return () => {
      cancelAnimation(backdropProgress);
      cancelAnimation(panelProgress);
      cancelAnimation(dragY);
    };
  }, [backdropProgress, panelProgress, dragY]);

  useEffect(() => {
    if (!visible || !dismissible || Platform.OS !== "web") return;
    if (typeof window === "undefined") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible, dismissible]);

  const finishDragDismiss = () => {
    onCloseRef.current();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          variant === "sheet" && dismissibleRef.current && !reduceMotion,
        onMoveShouldSetPanResponder: (_, gesture) =>
          variant === "sheet" &&
          dismissibleRef.current &&
          !reduceMotion &&
          Math.abs(gesture.dy) > 4 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy >= 0) {
            dragY.value = gesture.dy;
          } else {
            dragY.value = rubberband(gesture.dy, 56, 0.35);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 90 || gesture.vy > 0.65) {
            isDismissingByDragRef.current = true;
            backdropProgress.value = withTiming(0, {
              duration: MotionDurations.exit,
              easing: outEase,
            });
            dragY.value = withTiming(
              380,
              { duration: MotionDurations.exit, easing: drawerEase },
              (finished) => {
                if (finished) {
                  runOnJS(finishDragDismiss)();
                }
              }
            );
          } else {
            dragY.value = withSpring(0, {
              ...SHEET_SPRING,
              velocity: gesture.vy,
            });
          }
        },
        onPanResponderTerminate: () => {
          if (!isDismissingByDragRef.current) {
            dragY.value = withSpring(0, SHEET_SPRING);
          }
        },
      }),
    [variant, reduceMotion, dragY, backdropProgress]
  );

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    const dragFade = Math.max(0, Math.min(1, dragY.value / 240));
    return {
      opacity: backdropProgress.value * (1 - dragFade * 0.55),
    };
  });

  const panelAnimatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return {
        opacity: panelProgress.value,
      };
    }

    if (variant === "dialog") {
      return {
        opacity: panelProgress.value,
        transform: [
          { scale: 0.94 + panelProgress.value * 0.06 },
          { translateY: (1 - panelProgress.value) * 10 },
        ],
      };
    }

    return {
      opacity: Math.min(1, panelProgress.value * 1.15),
      transform: [{ translateY: (1 - panelProgress.value) * 36 + dragY.value }],
    };
  });

  if (!mounted) {
    return null;
  }

  const resolvedShowHandle = showHandle ?? (variant === "sheet" && dismissible);
  const alignmentClasses =
    variant === "dialog"
      ? "justify-center items-center p-5"
      : "justify-end sm:justify-center sm:items-center sm:p-6";

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent={statusBarTranslucent}
      onRequestClose={() => {
        if (dismissible) onClose();
      }}
    >
      <AnimatedView
        animatedStyle={backdropAnimatedStyle}
        className={`flex-1 bg-black/50 ${alignmentClasses} ${backdropClassName}`.trim()}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          accessible={false}
          importantForAccessibility="no"
          onPress={() => {
            if (dismissible) onClose();
          }}
        />
        <AnimatedView
          animatedStyle={panelAnimatedStyle}
          className={contentClassName}
          style={contentStyle}
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
        >
          {resolvedShowHandle ? (
            <View
              {...panResponder.panHandlers}
              className="items-center pt-3 pb-2.5 sm:hidden"
            >
              <View
                style={{
                  width: 38,
                  height: 4,
                  borderRadius: 999,
                  backgroundColor: "#cbd5e1",
                }}
              />
            </View>
          ) : null}
          {children}
        </AnimatedView>
      </AnimatedView>
    </Modal>
  );
};
