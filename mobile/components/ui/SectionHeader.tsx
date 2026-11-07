import React from "react";
import { View } from "react-native";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";

export interface SectionHeaderProps {
  title: string;
  caption?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Section title that sits on the page canvas, outside the card it introduces.
 * Keeps cards free of their own header rows, so content starts at the top edge.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  caption,
  actionLabel,
  onAction,
  className,
}) => (
  <View className={`flex-row items-end justify-between mb-2.5 px-0.5 ${className || ""}`}>
    <View className="flex-1 min-w-0 mr-3">
      <AppText weight="bold" className="text-[17px] text-neutral-dark" style={{ letterSpacing: -0.2 }}>
        {title}
      </AppText>
      {Boolean(caption) && (
        <AppText weight="medium" className="text-xs text-neutral-muted mt-0.5">
          {caption}
        </AppText>
      )}
    </View>
    {Boolean(actionLabel && onAction) && (
      <PressableScale
        onPress={onAction}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="min-h-[32px] justify-center"
        accessibilityRole="link"
        accessibilityLabel={`${actionLabel}: ${title}`}
      >
        <AppText weight="bold" className="text-[13px] text-primary">
          {actionLabel}
        </AppText>
      </PressableScale>
    )}
  </View>
);

