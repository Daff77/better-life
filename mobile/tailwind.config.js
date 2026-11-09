/** @type {import('tailwindcss').Config} */
/*
 * Better Life tokens. Mint-grey canvas, near-white surfaces, one emerald accent,
 * and three "block" fills (amber, ink, mist) used for meal slots and macro data.
 * Legacy names (primary, secondary, neutral, accent.sage) are kept and remapped so
 * older screens inherit the new palette without per-file rewrites.
 */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./features/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Surfaces. `white` is warmed slightly so bg-white cards match the canvas family.
        white: "#fbfdfc",
        canvas: "#edf1ee",
        card: { DEFAULT: "#fbfdfc", 2: "#f0f4f1" },
        ink: { DEFAULT: "#121a16", 2: "#2e3a33" },
        muted: "#56605a",
        line: { DEFAULT: "#e6eae7", 2: "#d5dbd7" },

        // Blocks: filled tiles for meal slots and macro segments.
        block: {
          mist: "#dfe6e1",
          amber: "#f3b23c",
          "on-amber": "#1b1406",
          ink: "#141c18",
          "on-ink": "#f2f6f3",
        },

        // Status
        good: { DEFAULT: "#12714f", soft: "#dcece4" },
        bad: { DEFAULT: "#b3301b", soft: "#f6e0db" },
        warn: { DEFAULT: "#8f4e00", soft: "#fbebd0" },
        info: { DEFAULT: "#285c9c", soft: "#e0e8f3" },

        primary: {
          DEFAULT: "#0e7a52",
          dark: "#0a6544",
          light: "#e0ede6",
          subtle: "rgba(14, 122, 82, 0.08)",
          text: "#0b6b47",
        },
        secondary: {
          DEFAULT: "#f0f4f1",
          soft: "#f0f4f1",
        },
        accent: {
          DEFAULT: "#0e7a52",
          sage: "#3d4a43",
          "sage-dark": "#2e3a33",
          amber: "#8f4e00",
        },
        neutral: {
          dark: "#121a16",
          muted: "#56605a",
          border: "#d5dbd7",
          "border-light": "#e6eae7",
          bg: "#edf1ee",
        },
      },
      fontFamily: {
        regular: ["Urbanist-Regular"],
        medium: ["Urbanist-Medium"],
        semibold: ["Urbanist-SemiBold"],
        bold: ["Urbanist-Bold"],
        extrabold: ["Urbanist-ExtraBold"],
        black: ["Urbanist-ExtraBold"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
      },
    },
  },
  plugins: [],
};
