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
          DEFAULT: "#153e28",
          dark: "#0f2e1e",
          light: "#eaf2ec",
          subtle: "rgba(21, 62, 40, 0.06)",
        },
        secondary: {
          DEFAULT: "#e4ede7",
          soft: "#f2f7f4",
        },
        accent: {
          sage: "#52796f",
          "sage-dark": "#3a564f",
          amber: "#b45309",
        },
        neutral: {
          dark: "#1c201d",
          muted: "#5a625b",
          border: "#dcdfd9",
          "border-light": "#eae8e1",
          bg: "#faf9f5",
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
