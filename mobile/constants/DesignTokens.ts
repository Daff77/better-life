/**
 * Better Life Design System Tokens
 * Source of truth extracted from better-life.css
 */

export const Colors = {
  // Brand: one emerald accent on a mint-grey canvas.
  primary: {
    DEFAULT: "#0e7a52",
    dark: "#0a6544",
    light: "#e0ede6",
    subtle: "rgba(14, 122, 82, 0.08)",
    glow: "rgba(14, 122, 82, 0.18)",
    text: "#0b6b47",
  },
  secondary: {
    DEFAULT: "#f0f4f1",
    soft: "#f0f4f1",
    muted: "rgba(240, 244, 241, 0.6)",
  },
  accent: {
    sage: "#3d4a43",
    sageDark: "#2e3a33",
    sageLight: "#f0f4f1",
    amber: "#8f4e00",
    amberLight: "#fbebd0",
  },
  status: {
    success: "#12714f",
    error: "#b3301b",
    warning: "#8f4e00",
    info: "#285c9c",
  },
  neutral: {
    dark: "#121a16",
    darkSubtle: "#2e3a33",
    muted: "#56605a",
    gray2: "#bfc7c2",
    border: "#d5dbd7",
    borderLight: "#e6eae7",
    bgPage: "#edf1ee",
    bgCard: "#fbfdfc",
    white: "#ffffff",
  },
  // Filled tiles. Each fill has a fixed foreground that clears WCAG AA.
  blocks: {
    mist: { bg: "#dfe6e1", fg: "#121a16", sub: "#3f4a44" },
    amber: { bg: "#f3b23c", fg: "#1b1406", sub: "#4a3510" },
    ink: { bg: "#141c18", fg: "#f2f6f3", sub: "#b3bdb7" },
    green: { bg: "#0e7a52", fg: "#ffffff", sub: "#d2eadf" },
  },
  // Macro data colours, shared by dashboard, analytics and logging.
  macros: {
    protein: "#0e7a52",
    carbs: "#f3b23c",
    fat: "#141c18",
    fiber: "#285c9c",
    track: "#dfe6e1",
  },
  // Meal categories map onto the block fills so a slot looks the same everywhere.
  categories: {
    breakfast: { text: "#7a4a00", bg: "#fbebd0", border: "#f3d48a", dot: "#f3b23c" },
    lunch: { text: "#0b6b47", bg: "#e0ede6", border: "#c9ddd2", dot: "#0e7a52" },
    dinner: { text: "#121a16", bg: "#e3e8e5", border: "#cfd6d2", dot: "#141c18" },
    snack: { text: "#2e3a33", bg: "#eef1ef", border: "#d5dbd7", dot: "#8a948e" },
    drink: { text: "#285c9c", bg: "#e0e8f3", border: "#c6d4e8", dot: "#285c9c" },
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
    regular: "Urbanist-Regular",
    medium: "Urbanist-Medium",
    semibold: "Urbanist-SemiBold",
    bold: "Urbanist-Bold",
    extrabold: "Urbanist-ExtraBold",
    black: "Urbanist-Bold",
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
    shadowColor: "#101628",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: "#101628",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  elevated: {
    shadowColor: "#101628",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 6,
  },
  button: {
    shadowColor: "#0e7a52",
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
