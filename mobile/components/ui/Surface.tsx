import React from "react";
import { View, ViewProps, StyleProp, ViewStyle, Platform } from "react-native";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";
import { LineIcon, LineIconName } from "./LineIcon";
import { Colors } from "@/constants/DesignTokens";

/*
 * Better Life surface kit.
 * Clean single-layer elevation without negative spread so both Native Android/iOS
 * and Web render soft, artifact-free card shadows.
 */

export const SURFACE_SHADOW = "0px 2px 8px rgba(16, 22, 40, 0.05)";
export const FLOAT_SHADOW = "0px 8px 20px rgba(8, 60, 38, 0.16)";

const tnum = { fontVariant: ["tabular-nums" as const] };

/* ------------------------------------------------------------------ Surface */

export interface SurfaceProps extends ViewProps {
  className?: string;
  /** Tighter padding for dense lists. */
  dense?: boolean;
  /** Omit padding when wrapping flush media/headers. */
  noPadding?: boolean;
}

export const Surface: React.FC<SurfaceProps> = ({
  className,
  dense,
  noPadding,
  style,
  children,
  ...props
}) => (
  <View
    {...props}
    className={`bg-card rounded-[22px] border border-line ${
      noPadding ? "" : dense ? "px-4 py-3" : "p-4 sm:p-5"
    } ${className ?? ""}`}
    style={[{ boxShadow: SURFACE_SHADOW } as ViewStyle, style]}
  >
    {children}
  </View>
);

/* -------------------------------------------------------------- RingButton */

export interface RingButtonProps {
  icon?: LineIconName;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** "ring": hairline outline. "solid": filled card circle. "onDark": for blocks. */
  variant?: "ring" | "solid" | "onDark" | "onLight";
  size?: "sm" | "md";
  color?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

/** Circular icon control. Visual size 36/44, always a 44pt hit area. */
export const RingButton: React.FC<RingButtonProps> = ({
  icon = "arrowUpRight",
  onPress,
  accessibilityLabel = "Tombol aksi",
  variant = "ring",
  size = "sm",
  color,
  disabled,
  children,
}) => {
  const dim = size === "sm" ? 36 : 44;
  const slop = size === "sm" ? 4 : 0;
  const skin =
    variant === "solid"
      ? "bg-card border border-line"
      : variant === "onDark"
      ? "border border-white/40"
      : variant === "onLight"
      ? "border border-black/20"
      : "border border-line-2";
  const iconColor = color ?? (variant === "onDark" ? "#f2f6f3" : Colors.neutral.dark);
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: slop, bottom: slop, left: slop, right: slop }}
      className={`rounded-full items-center justify-center flex-shrink-0 ${skin} ${
        Platform.OS === "web" ? "hover:bg-card-2" : ""
      }`}
      style={[
        { width: dim, height: dim },
        variant === "solid" ? ({ boxShadow: SURFACE_SHADOW } as ViewStyle) : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children ?? <LineIcon name={icon} size={size === "sm" ? 17 : 20} color={iconColor} />}
    </PressableScale>
  );
};

/* ---------------------------------------------------------------- CardHead */

export interface CardHeadProps {
  title: string;
  caption?: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}

/** Title row inside a surface: title, optional muted caption/subtitle, tools on the right. */
export const CardHead: React.FC<CardHeadProps> = ({
  title,
  caption,
  subtitle,
  right,
  className,
}) => {
  const resolvedCaption = caption ?? subtitle;
  return (
    <View className={`flex-row items-center justify-between gap-3 mb-3.5 min-h-[36px] ${className ?? ""}`}>
      <View className="flex-1 min-w-0">
        <AppText weight="semibold" className="text-[16px] text-ink leading-5" accessibilityRole="header">
          {title}
        </AppText>
        {resolvedCaption ? (
          <AppText weight="medium" className="text-[13px] text-muted mt-0.5" style={tnum}>
            {resolvedCaption}
          </AppText>
        ) : null}
      </View>
      {right ? <View className="flex-row items-center gap-2 flex-shrink-0">{right}</View> : null}
    </View>
  );
};

/* ---------------------------------------------------------------- PageHead */

export interface PageHeadProps {
  title: string;
  caption?: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}

/** Screen title on the canvas. Large, tight, no eyebrow. */
export const PageHead: React.FC<PageHeadProps> = ({
  title,
  caption,
  subtitle,
  right,
  className,
}) => {
  const resolvedCaption = caption ?? subtitle;
  return (
    <View className={`flex-row items-end justify-between gap-3 mb-4 ${className ?? ""}`}>
      <View className="flex-1 min-w-0">
        {resolvedCaption ? (
          <AppText weight="medium" className="text-[13.5px] text-muted mb-1 capitalize" style={tnum}>
            {resolvedCaption}
          </AppText>
        ) : null}
        <AppText
          weight="semibold"
          className="text-[26px] sm:text-[34px] text-ink"
          style={{ letterSpacing: -0.7, lineHeight: 32 }}
          accessibilityRole="header"
        >
          {title}
        </AppText>
      </View>
      {right ? <View className="flex-row items-center gap-2 flex-shrink-0">{right}</View> : null}
    </View>
  );
};

/* -------------------------------------------------------------------- Stat */

export interface StatProps {
  icon: LineIconName;
  value: React.ReactNode;
  label: string;
  accent?: boolean;
  tag?: React.ReactNode;
  className?: string;
}

/** Headline metric: circular icon, figure, short label. */
export const Stat: React.FC<StatProps> = ({ icon, value, label, accent, tag, className }) => (
  <View className={`flex-row items-center gap-2.5 min-w-0 ${className ?? ""}`}>
    <View
      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full items-center justify-center flex-shrink-0 ${
        accent ? "bg-primary" : "bg-card border border-line"
      }`}
      style={accent ? undefined : ({ boxShadow: SURFACE_SHADOW } as ViewStyle)}
    >
      <LineIcon name={icon} size={18} color={accent ? "#ffffff" : Colors.neutral.darkSubtle} />
    </View>
    <View className="flex-1 min-w-0">
      <View className="flex-row items-center flex-wrap gap-x-1.5">
        <AppText
          weight="semibold"
          className="text-[18px] sm:text-[20px] text-ink"
          style={[tnum, { letterSpacing: -0.2, lineHeight: 22 }]}
        >
          {value}
        </AppText>
        {tag}
      </View>
      <AppText weight="medium" numberOfLines={1} className="text-[12px] text-muted leading-4 mt-0.5">
        {label}
      </AppText>
    </View>
  </View>
);

/* -------------------------------------------------------------- StatusPill */

export type Tone = "good" | "ok" | "warn" | "bad" | "accent" | "plain" | "neutral" | "info";

const TONES: Record<Tone, { bg: string; fg: string }> = {
  good: { bg: "bg-good-soft", fg: "#12714f" },
  ok: { bg: "bg-good-soft", fg: "#12714f" },
  warn: { bg: "bg-warn-soft", fg: "#8f4e00" },
  bad: { bg: "bg-bad-soft", fg: "#b3301b" },
  accent: { bg: "bg-primary-light", fg: "#0b6b47" },
  info: { bg: "bg-info-soft", fg: "#285c9c" },
  plain: { bg: "bg-card-2", fg: "#2e3a33" },
  neutral: { bg: "bg-card-2", fg: "#2e3a33" },
};

export const StatusPill: React.FC<{ label: string; tone?: Tone; dot?: boolean; className?: string }> = ({
  label,
  tone = "accent",
  dot = true,
  className,
}) => (
  <View className={`flex-row items-center gap-1.5 h-6 px-2.5 rounded-full self-start ${TONES[tone].bg} ${className ?? ""}`}>
    {dot ? <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TONES[tone].fg }} /> : null}
    <AppText weight="semibold" className="text-[12px]" style={[{ color: TONES[tone].fg }, tnum]}>
      {label}
    </AppText>
  </View>
);

/* ------------------------------------------------------------------ MixBar */

export interface MixSegment {
  key?: string;
  label?: string;
  value: number;
  color: string;
  /** Mist segments get a hairline so they read on the card. */
  outlined?: boolean;
}

/** Proportional bar of rounded segments. Used for calorie composition and plan mix. */
export const MixBar: React.FC<{ segments: MixSegment[]; height?: number; accessibilityLabel?: string }> = ({
  segments,
  height = 40,
  accessibilityLabel,
}) => {
  const visible = segments.filter((s) => s.value > 0);
  return (
    <View
      className="flex-row gap-1.5"
      style={{ height }}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {visible.map((s, idx) => (
        <View
          key={s.key ?? s.label ?? String(idx)}
          style={{
            flexGrow: s.value,
            flexBasis: 0,
            minWidth: 14,
            backgroundColor: s.color,
            borderRadius: Math.min(14, height / 2.6),
            borderWidth: s.outlined ? 1 : 0,
            borderColor: "rgba(16, 32, 24, 0.12)",
          }}
        />
      ))}
    </View>
  );
};

/* -------------------------------------------------------------- ColorBlock */

export type BlockTone = keyof typeof Colors.blocks;

export const blockColors = (tone: BlockTone) => Colors.blocks[tone];

export interface ColorBlockProps {
  tone: BlockTone;
  className?: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  children?: React.ReactNode;
}

/** Filled tile. Foreground colours come from `blockColors(tone)`. */
export const ColorBlock: React.FC<ColorBlockProps> = ({
  tone,
  className,
  style,
  onPress,
  accessibilityLabel,
  children,
}) => {
  const blockStyle = [
    { backgroundColor: Colors.blocks[tone].bg },
    tone === "mist" ? { borderWidth: 1, borderColor: "rgba(16, 32, 24, 0.08)" } : null,
    style,
  ];
  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        pressedScale={0.985}
        className={`rounded-[20px] px-3.5 py-3 sm:px-4 sm:py-3.5 ${className ?? ""}`}
        style={blockStyle}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </PressableScale>
    );
  }
  return (
    <View className={`rounded-[20px] px-3.5 py-3 sm:px-4 sm:py-3.5 ${className ?? ""}`} style={blockStyle}>
      {children}
    </View>
  );
};

/* ---------------------------------------------------------------- ListRow */

export interface ListRowProps {
  leading?: React.ReactNode;
  left?: React.ReactNode;
  title: string;
  caption?: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
  first?: boolean;
  accessibilityLabel?: string;
}

/** Ruled row. Rows divide with a hairline, never with nested cards. */
export const ListRow: React.FC<ListRowProps> = ({
  leading,
  left,
  title,
  caption,
  subtitle,
  trailing,
  right,
  onPress,
  last,
  accessibilityLabel,
}) => {
  const resolvedLeading = leading ?? left;
  const resolvedCaption = caption ?? subtitle;
  const resolvedTrailing = trailing ?? right;
  const content = (
    <>
      {resolvedLeading}
      <View className="flex-1 min-w-0">
        <AppText weight="semibold" numberOfLines={2} className="text-[14.5px] text-ink leading-5">
          {title}
        </AppText>
        {resolvedCaption ? (
          <AppText weight="medium" numberOfLines={2} className="text-[12.5px] text-muted mt-0.5 leading-4" style={tnum}>
            {resolvedCaption}
          </AppText>
        ) : null}
      </View>
      {resolvedTrailing}
    </>
  );
  const cls = `flex-row items-center gap-3 py-3 min-h-[56px] ${last ? "" : "border-b border-line"}`;
  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        pressedScale={0.985}
        className={cls}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
      >
        {content}
      </PressableScale>
    );
  }
  return <View className={cls}>{content}</View>;
};

/** Small circular glyph for list rows. */
export const RowIcon: React.FC<{
  icon?: LineIconName;
  tone?: "plain" | "soft" | "accent" | "green" | "amber" | "ink";
  children?: React.ReactNode;
}> = ({ icon = "sparkle", tone = "plain", children }) => {
  const skin =
    tone === "accent" || tone === "green"
      ? { bg: "bg-primary-light", c: "#0b6b47" }
      : tone === "amber"
      ? { bg: "bg-warn-soft", c: "#8f4e00" }
      : tone === "ink"
      ? { bg: "bg-block-ink", c: "#f2f6f3" }
      : { bg: "bg-card-2 border border-line", c: Colors.neutral.darkSubtle };
  return (
    <View className={`w-9 h-9 rounded-full items-center justify-center flex-shrink-0 ${skin.bg}`}>
      {children ?? <LineIcon name={icon} size={17} color={skin.c} />}
    </View>
  );
};

/* -------------------------------------------------------------- Segmented */

export interface SegmentedProps<T extends string> {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  accessibilityLabel?: string;
  stretch?: boolean;
}

/** Pill segmented control. Selected segment lifts onto a card-coloured thumb. */
export function Segmented<T extends string>({ options, value, onChange, accessibilityLabel, stretch }: SegmentedProps<T>) {
  return (
    <View
      className={`flex-row bg-card-2 border border-line rounded-full p-[3px] ${stretch ? "w-full self-stretch" : "self-start"}`}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressableScale
            key={o.value}
            onPress={() => onChange(o.value)}
            pressedScale={0.96}
            className={`h-9 px-3.5 rounded-full items-center justify-center ${stretch ? "flex-1" : ""} ${
              on ? "bg-card" : ""
            }`}
            style={on ? ({ boxShadow: "0px 1px 2px rgba(0,0,0,0.08)" } as ViewStyle) : undefined}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
          >
            <AppText
              weight="semibold"
              numberOfLines={1}
              className={`text-[13px] ${on ? "text-ink" : "text-muted"}`}
            >
              {o.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------ PillButton */

export interface PillButtonProps {
  label: string;
  onPress?: () => void;
  icon?: LineIconName | React.ReactNode;
  variant?: "primary" | "plain" | "soft" | "ink" | "dark" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  accessibilityLabel?: string;
  className?: string;
}

/** Pill action. Primary is emerald and appears at most once per view. */
export const PillButton: React.FC<PillButtonProps> = ({
  label,
  onPress,
  icon,
  variant = "plain",
  size = "md",
  disabled,
  accessibilityLabel,
  className,
}) => {
  const skin =
    variant === "primary"
      ? { box: "bg-primary", text: "text-white", icon: "#ffffff" }
      : variant === "ink" || variant === "dark"
      ? { box: "bg-block-ink", text: "text-block-on-ink", icon: "#f2f6f3" }
      : variant === "ghost"
      ? { box: "bg-card border border-line", text: "text-ink", icon: Colors.neutral.dark }
      : { box: "bg-card border border-line-2", text: "text-ink", icon: Colors.neutral.dark };
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center justify-center gap-2 rounded-full ${
        size === "sm" ? "h-10 px-3.5" : "h-11 px-4"
      } ${skin.box} ${className ?? ""}`}
      style={variant === "primary" ? ({ boxShadow: "0px 4px 10px rgba(14, 122, 82, 0.22)" } as ViewStyle) : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
    >
      {icon ? (
        typeof icon === "string" ? (
          <LineIcon name={icon as LineIconName} size={size === "sm" ? 16 : 18} color={skin.icon} strokeWidth={1.9} />
        ) : (
          icon
        )
      ) : null}
      <AppText
        weight="semibold"
        numberOfLines={1}
        className={`${size === "sm" ? "text-[13px]" : "text-[13.5px]"} ${skin.text}`}
      >
        {label}
      </AppText>
    </PressableScale>
  );
};
