/**
 * Better Life Design System Tokens
 * Source of truth extracted from better-life.css
 */

export const Colors = {
  // Brand Palette - Editorial Wellness: Deep Forest Green & Restrained Sage
  primary: {
    DEFAULT: "#153e28",
    dark: "#0f2e1e",
    light: "#eaf2ec",
    subtle: "rgba(21, 62, 40, 0.06)",
    glow: "rgba(21, 62, 40, 0.12)",
  },
  secondary: {
    DEFAULT: "#e4ede7",
    soft: "#f2f7f4",
    muted: "rgba(228, 237, 231, 0.6)",
  },
  accent: {
    sage: "#52796f",
    sageDark: "#3a564f",
    sageLight: "#edf3ef",
    amber: "#b45309",
    amberLight: "#fef3c7",
  },
  status: {
    success: "#153e28",
    error: "#b91c1c",
    warning: "#b45309",
    info: "#3a564f",
  },
  neutral: {
    dark: "#1c201d",
    darkSubtle: "#323734",
    muted: "#5a625b",
    gray2: "#c2cac4",
    border: "#dcdfd9",
    borderLight: "#eae8e1",
    bgPage: "#faf9f5",
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
