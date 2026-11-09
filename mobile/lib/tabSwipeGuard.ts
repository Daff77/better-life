import React from "react";
import { ViewStyle } from "react-native";

/**
 * Lightweight coordination flag so horizontal ScrollViews (recipe carousels,
 * filter strips) can scroll natively without triggering the parent tab-swipe
 * gesture in `app/(app)/(tabs)/_layout.tsx`.
 */

let lastHorizontalTouchTimestamp = 0;
let isHorizontalDragging = false;

export const markHorizontalScrollTouchStart = () => {
  lastHorizontalTouchTimestamp = Date.now();
  isHorizontalDragging = true;
};

export const markHorizontalScrollTouchEnd = () => {
  isHorizontalDragging = false;
  lastHorizontalTouchTimestamp = Date.now();
};

export const isHorizontalScrollActive = (): boolean => {
  if (isHorizontalDragging) return true;
  // Brief 180ms cooldown after releasing a horizontal carousel drag
  return Date.now() - lastHorizontalTouchTimestamp < 180;
};

export const horizontalScrollTouchProps = {
  onTouchStart: markHorizontalScrollTouchStart,
  onTouchEnd: markHorizontalScrollTouchEnd,
  onTouchCancel: markHorizontalScrollTouchEnd,
  onScrollBeginDrag: markHorizontalScrollTouchStart,
  onScrollEndDrag: markHorizontalScrollTouchEnd,
};

/**
 * Context carrying the Reanimated horizontal swipe style for tab scenes
 * so the page content slides while the floating bottom tab bar remains fixed.
 */
export const TabSwipeSceneContext = React.createContext<any>(null);
