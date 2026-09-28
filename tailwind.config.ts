import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Meridian brand — from the logo.
        // `brand` = the navy/royal blue (primary). `leaf` = the green accent.
        brand: {
          50: "#eef4fc",
          100: "#d9e6f9",
          200: "#b8cdf1",
          300: "#8bade4",
          400: "#5885d3",
          500: "#3463bd",
          600: "#234da3",
          700: "#1c3e85",
          800: "#17336b",
          900: "#0f2350",
          950: "#0a1836",
          DEFAULT: "#234da3",
          dark: "#17336b",
        },
        leaf: {
          50: "#eff8ee",
          100: "#d6efd2",
          200: "#b0e0a9",
          300: "#82cd78",
          400: "#55b64b",
          500: "#37a12d",
          600: "#2b8523",
          700: "#236a1e",
          800: "#1f551c",
          900: "#1a4619",
          DEFAULT: "#37a12d",
          dark: "#2b8523",
        },
        // Sky-blue highlights (the globe).
        sky: {
          50: "#eff8ff",
          100: "#dbeefe",
          200: "#bfe1fe",
          300: "#93cffd",
          400: "#60b4fa",
          500: "#3b96f5",
          600: "#2478ea",
          700: "#1c60d7",
        },
      },
      fontFamily: {
        // Apple guidance: platform system font first (SF Pro on Apple).
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          "system-ui",
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        display: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          "system-ui",
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,35,80,0.04), 0 8px 24px rgba(15,35,80,0.06)",
        lift: "0 12px 32px rgba(15,35,80,0.12)",
        glow: "0 0 0 1px rgba(35,77,163,0.08), 0 18px 48px rgba(35,77,163,0.18)",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(120deg, #0f2350 0%, #234da3 55%, #37a12d 130%)",
        "brand-sheen":
          "radial-gradient(1200px 500px at 15% -10%, rgba(59,150,245,0.25), transparent 60%), radial-gradient(900px 500px at 110% 10%, rgba(55,161,45,0.18), transparent 55%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "dash-fly": {
          "0%": { strokeDashoffset: "220" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        "fade-in": "fade-in 0.8s ease-out both",
        float: "float 7s ease-in-out infinite",
        "spin-slow": "spin-slow 40s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
