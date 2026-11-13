import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#07090f", 900: "#0b0e17", 800: "#111523", 700: "#1a1f31", 600: "#262c44" },
        mist: { 100: "#e6e9f5", 300: "#aab1cc", 500: "#6c7596" },
        accent: { blue: "#6d8cff", violet: "#a07bff", cyan: "#4fd6e8" },
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
