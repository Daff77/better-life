/**
 * Better Life Design System Tokens
 * Source of truth extracted from better-life.css
 */

export const Colors = {
  // Brand Palette
  primary: {
    DEFAULT: "#67c090",
    dark: "#5aa07c",
    light: "#ddf4e7",
    subtle: "rgba(103, 192, 144, 0.12)",
    glow: "rgba(103, 192, 144, 0.28)",
  },
  secondary: {
    DEFAULT: "#daf2e5",
    soft: "#edf9f2",
    muted: "rgba(218, 242, 229, 0.4)",
  },
  accent: {
    teal: "#26667f",
    tealDark: "#1e4f62",
    tealLight: "rgba(38, 102, 127, 0.12)",
  },
  status: {
    success: "#67c090",
    error: "#e05353",
    warning: "#f5a623",
    info: "#26667f",
  },
  neutral: {
    dark: "#191919",
    darkSubtle: "#333333",
    muted: "#888888",
    gray2: "#cfcfcf",
    border: "#cfcfcf",
    borderLight: "#e0e0e0",
    bgPage: "#f4f7f6",
    bgCard: "#ffffff",
    white: "#ffffff",
  },
  // Semantic category colors for meals and journal entries
  categories: {
    breakfast: {
      text: "#b45309",
      bg: "#fef3c7",
      border: "#fde68a",
      dot: "#f59e0b",
    },
    lunch: {
      text: "#047857",
      bg: "#d1fae5",
      border: "#a7f3d0",
      dot: "#10b981",
    },
    dinner: {
      text: "#4338ca",
      bg: "#e0e7ff",
      border: "#c7d2fe",
      dot: "#6366f1",
    },
    snack: {
      text: "#be185d",
      bg: "#fce7f3",
      border: "#fbcfe8",
      dot: "#ec4899",
    },
    drink: {
      text: "#0e7490",
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
    shadowColor: "#67c090",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
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
