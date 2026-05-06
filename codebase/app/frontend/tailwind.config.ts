import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#7C3AED",
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        secondary: {
          DEFAULT: "#EC4899",
          50: "#fdf2f8",
          100: "#fce7f3",
          200: "#fbcfe8",
          300: "#f9a8d4",
          400: "#f472b6",
          500: "#ec4899",
          600: "#db2777",
          700: "#be185d",
          800: "#9d174d",
          900: "#831843",
        },
        accent: {
          DEFAULT: "#06B6D4",
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
        },
        intent: {
          exploring: "#3b82f6",
          serious: "#7c3aed",
          discreet: "#6b7280",
          friendship: "#10b981",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "Outfit", "Inter", "sans-serif"],
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "swipe-left": {
          "0%": { transform: "translateX(0) rotate(0)", opacity: "1" },
          "100%": { transform: "translateX(-150%) rotate(-18deg)", opacity: "0" },
        },
        "swipe-right": {
          "0%": { transform: "translateX(0) rotate(0)", opacity: "1" },
          "100%": { transform: "translateX(150%) rotate(18deg)", opacity: "0" },
        },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "pulse-slow": "pulse-slow 3s ease-in-out infinite",
        "swipe-left": "swipe-left 0.35s ease-out forwards",
        "swipe-right": "swipe-right 0.35s ease-out forwards",
      },
      backgroundImage: {
        "elyra-gradient":
          "linear-gradient(135deg, #7C3AED 0%, #EC4899 50%, #06B6D4 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
