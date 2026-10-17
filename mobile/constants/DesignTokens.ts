/**
 * Better Life Design System Tokens
 * Source of truth extracted from better-life.css
 */

export const Colors = {
  // Brand Palette - Refined Wellness Sage & Emerald SaaS
  primary: {
    DEFAULT: "#1b7a53",
    dark: "#145c3e",
    light: "#eaf5ef",
    subtle: "rgba(27, 122, 83, 0.08)",
    glow: "rgba(27, 122, 83, 0.20)",
  },
  secondary: {
    DEFAULT: "#e2efe7",
    soft: "#f2f8f4",
    muted: "rgba(226, 239, 231, 0.5)",
  },
  accent: {
    teal: "#1e6074",
    tealDark: "#164757",
    tealLight: "rgba(30, 96, 116, 0.12)",
  },
  status: {
    success: "#1b7a53",
    error: "#dc2626",
    warning: "#d97706",
    info: "#1e6074",
  },
  neutral: {
    dark: "#111827",
    darkSubtle: "#374151",
    muted: "#4b5563",
    gray2: "#cbd5e1",
    border: "#cbd5e1",
    borderLight: "#e5ece7",
    bgPage: "#f8faf8",
    bgCard: "#ffffff",
    white: "#ffffff",
  },
  // Semantic category colors for meals and journal entries
  categories: {
    breakfast: {
      text: "#92400e",
      bg: "#fef3c7",
      border: "#fde68a",
      dot: "#f59e0b",
    },
    lunch: {
      text: "#065f46",
      bg: "#d1fae5",
      border: "#a7f3d0",
      dot: "#10b981",
    },
    dinner: {
      text: "#3730a3",
      bg: "#e0e7ff",
      border: "#c7d2fe",
      dot: "#6366f1",
    },
    snack: {
      text: "#9d174d",
      bg: "#fce7f3",
      border: "#fbcfe8",
      dot: "#ec4899",
    },
    drink: {
      text: "#155e75",
      bg: "#cffafe",
      border: "#a5f3fc",
      dot: "#06b6d4",
    },
  },
} as const;

export const Breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  maxContent: 1120,
} as const;

export const Typography = {
  fontFamily: {
    regular: "Akatab-Regular",
    medium: "Akatab-Medium",
    semibold: "Akatab-SemiBold",
    bold: "Akatab-Bold",
    extrabold: "Akatab-ExtraBold",
    black: "Akatab-Black",
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 28,
    "4xl": 32,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.35,
    relaxed: 1.5,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  pill: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  elevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 6,
  },
  button: {
    shadowColor: "#1b7a53",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
} as const;

export const Opacity = {
  disabled: 0.45,
  pressed: 0.75,
  hover: 0.9,
  subtle: 0.12,
} as const;

export const AnimationTiming = {
  micro: 150,     // button click, checkmark toggle
  fast: 250,      // dropdown, sheet open
  normal: 350,    // card enter, modal transition
  page: 500,      // screen transitions
} as const;
