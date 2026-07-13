import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#E8ECF0",
          muted: "#9AA8B5",
          dark: "#0A0E12",
        },
        brand: {
          DEFAULT: "#0A0E12",
          fuel: "#FFB020",
          fuelDim: "#E69500",
          accent: "#00D4AA",
        },
        surface: {
          DEFAULT: "#141A21",
          raised: "#1C2430",
          glass: "rgba(20, 26, 33, 0.88)",
          map: "#0D1117",
        },
        fuel: {
          yes: "#00C853",
          low: "#FF9100",
          no: "#FF3D00",
          unknown: "#90A4AE",
        },
        traffic: {
          free: "#00C853",
          slow: "#FF9100",
          jam: "#FF3D00",
        },
      },
      fontFamily: {
        display: ["var(--font-unbounded)", "system-ui", "sans-serif"],
        sans: ["var(--font-golos)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        dock: "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)",
        glow: "0 0 24px rgba(255, 176, 32, 0.25)",
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.7", transform: "scale(1.15)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
