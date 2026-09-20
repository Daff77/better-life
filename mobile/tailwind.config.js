/** @type {import('tailwindcss').Config} */
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
        primary: {
          DEFAULT: "#67c090",
          dark: "#5aa07c",
          light: "#ddf4e7",
          subtle: "rgba(103, 192, 144, 0.12)",
        },
        secondary: {
          DEFAULT: "#daf2e5",
          soft: "#edf9f2",
        },
        accent: {
          teal: "#26667f",
          "teal-dark": "#1e4f62",
        },
        neutral: {
          dark: "#191919",
          muted: "#888888",
          border: "#cfcfcf",
          "border-light": "#e0e0e0",
          bg: "#f4f7f6",
        },
      },
      fontFamily: {
        regular: ["Akatab-Regular"],
        medium: ["Akatab-Medium"],
        semibold: ["Akatab-SemiBold"],
        bold: ["Akatab-Bold"],
        extrabold: ["Akatab-ExtraBold"],
        black: ["Akatab-Black"],
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
