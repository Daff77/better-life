export const Colors = {
  primary: {
    DEFAULT: "#0e7a52",
    dark: "#0a6544",
    light: "#e0ede6",
    subtle: "rgba(14, 122, 82, 0.08)",
    glow: "rgba(14, 122, 82, 0.2)",
  },
  secondary: {
    DEFAULT: "#f0f4f1",
    soft: "#f0f4f1",
  },
  accent: {
    teal: "#285c9c",
    tealDark: "#1f4a80",
  },
  neutral: {
    dark: "#121a16",
    darkSubtle: "#2e3a33",
    muted: "#56605a",
    border: "#d5dbd7",
    borderLight: "#e6eae7",
    bgPage: "#edf1ee",
    bgCard: "#fbfdfc",
  },
} as const;

/**
 * Weight keys are typographic roles. Urbanist reads heavy at large sizes, so
 * `black` (used for display figures and page titles) maps to Bold rather than
 * a literal 900: the reference language is confident, not shouty.
 */
export const Fonts = {
  regular: "Urbanist-Regular",
  medium: "Urbanist-Medium",
  semibold: "Urbanist-SemiBold",
  bold: "Urbanist-Bold",
  extrabold: "Urbanist-ExtraBold",
  black: "Urbanist-Bold",
} as const;
