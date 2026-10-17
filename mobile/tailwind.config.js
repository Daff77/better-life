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
          DEFAULT: "#1b7a53",
          dark: "#145c3e",
          light: "#eaf5ef",
          subtle: "rgba(27, 122, 83, 0.08)",
        },
        secondary: {
          DEFAULT: "#e2efe7",
          soft: "#f2f8f4",
        },
        accent: {
          teal: "#1e6074",
          "teal-dark": "#164757",
        },
        neutral: {
          dark: "#111827",
          muted: "#64748b",
          border: "#cbd5e1",
          "border-light": "#e2e8f0",
          bg: "#f8faf8",
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
