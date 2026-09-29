import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    // OVERRIDDEN (not extended): enforces "fewer curves" and removes soft glow shadows sitewide.
    borderRadius: { none: "0", sm: "2px", DEFAULT: "4px", md: "4px", lg: "6px", xl: "6px", "2xl": "6px", "3xl": "6px", full: "9999px" },
    boxShadow: {
      none: "none",
      sticky: "0 1px 0 #d6dce6, 0 8px 20px -16px rgba(7,18,43,.22)",
      pop: "0 0 0 1px #d6dce6, 0 16px 32px -12px rgba(7,18,43,.22)",
      overlay: "-16px 0 48px -12px rgba(7,18,43,.30)",
    },
    extend: {
      colors: {
        ink: "#07122b",
        navy: { 50: "#eef2f8", 100: "#dfe6f2", 600: "#234da3", 700: "#1c3e85", 800: "#17336b", 900: "#0f2350", 925: "#0b1a3d", 950: "#07122b", DEFAULT: "#0f2350" },
        leaf: { 50: "#e8f5e5", 300: "#7fd174", 500: "#37a12d", 700: "#23701d", 800: "#1f6419", DEFAULT: "#23701d" },
        paper: { DEFAULT: "#f4f6f9", 2: "#eaeef4" },
        rule: { DEFAULT: "#d6dce6", strong: "#7b879c" },
        fg: { DEFAULT: "#26324d", strong: "#0f2350", muted: "#4a5670", subtle: "#56627a" },
        "on-dark": { DEFAULT: "#ffffff", muted: "#c9d3e6", subtle: "#aab7cf" },
        danger: { DEFAULT: "#b42318", 50: "#fdf0ee" },
      },
      // Tailwind joins these verbatim, so multi-word families carry their own quotes: an unquoted
      // `Source Serif 4` (the "4" is not an identifier) invalidates the whole font-family declaration.
      fontFamily: {
        sans: ["var(--font-sans)", '"IBM Plex Sans"', "system-ui", "-apple-system", '"Segoe UI"', "Roboto", "Arial", "sans-serif"],
        serif: ["var(--font-serif)", '"Source Serif 4"', "Georgia", "Cambria", "serif"],
        display: ["var(--font-serif)", '"Source Serif 4"', "Georgia", "serif"],
        mono: ["var(--font-mono)", '"IBM Plex Mono"', "ui-monospace", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        xs: ["0.875rem", { lineHeight: "1.45" }],   // 14px: the floor, nothing renders smaller
        sm: ["0.9375rem", { lineHeight: "1.5" }],   // 15px
        base: ["1rem", { lineHeight: "1.625" }],    // 16px
        md: ["1.0625rem", { lineHeight: "1.625" }], // 17px
        lead: ["clamp(1.125rem, 1.07rem + 0.25vw, 1.25rem)", { lineHeight: "1.6" }],
        h4: ["clamp(1.125rem, 1.08rem + 0.2vw, 1.25rem)", { lineHeight: "1.4", fontWeight: "600" }],
        h3: ["clamp(1.375rem, 1.3rem + 0.3vw, 1.5rem)", { lineHeight: "1.3", letterSpacing: "-0.005em", fontWeight: "600" }],
        h2: ["clamp(1.75rem, 1.4rem + 1.5vw, 2.5rem)", { lineHeight: "1.15", letterSpacing: "-0.012em", fontWeight: "600" }],
        h1: ["clamp(2.25rem, 1.6rem + 2.4vw, 3.5rem)", { lineHeight: "1.08", letterSpacing: "-0.012em", fontWeight: "600" }],
        display: ["clamp(2.5rem, 1.7rem + 3.2vw, 4rem)", { lineHeight: "1.06", letterSpacing: "-0.015em", fontWeight: "600" }],
      },
      spacing: { tap: "2.75rem", header: "var(--header-h)" },
      minHeight: { tap: "2.75rem" },
      minWidth: { tap: "2.75rem" },
      maxWidth: { page: "80rem", measure: "68ch" },
      transitionTimingFunction: { out: "cubic-bezier(.2,0,0,1)", std: "cubic-bezier(.4,0,.2,1)", exit: "cubic-bezier(.4,0,1,1)" },
      transitionDuration: { 120: "120ms", 280: "280ms", 480: "480ms" },
      zIndex: { toolbar: "30", header: "50", overlay: "60", toast: "70" },
    },
  },
  plugins: [],
};
export default config;
