import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      // ── Colour palette (FoTell Design System) ────────────────────────
      colors: {
        // Backgrounds
        "bg-base":     "#0d0f12",
        "bg-surface":  "#1a1d23",
        "bg-elevated": "#22262f",

        // Text
        "text-primary":   "#f0f2f5",
        "text-secondary": "#8b92a5",
        "text-muted":     "#4a5063",
        "text-inverse":   "#0d0f12",

        // Brand
        "accent-blue":     "#2196f3",
        "accent-blue-hover": "#1976d2",
        "accent-blue-dim": "rgba(33,150,243,0.12)",

        // Binary outcomes
        "yes-strong": "#00c853",
        "yes-dim":    "rgba(0,200,83,0.15)",
        "no-strong":  "#ff1744",
        "no-dim":     "rgba(255,23,68,0.15)",

        // Status
        success: "#4caf50",
        warning: "#ff9800",
        error:   "#f44336",
        info:    "#29b6f6",

        // Borders
        "border-subtle": "rgba(255,255,255,0.06)",
        "border-active": "rgba(255,255,255,0.18)",
      },

      // ── Typography ───────────────────────────────────────────────────
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "display-xl": ["3rem",     { lineHeight: "1.1",  fontWeight: "700" }],
        "display-lg": ["2.25rem",  { lineHeight: "1.15", fontWeight: "700" }],
        "heading-xl": ["1.5rem",   { lineHeight: "1.3",  fontWeight: "600" }],
        "heading-lg": ["1.25rem",  { lineHeight: "1.35", fontWeight: "600" }],
        "heading-md": ["1rem",     { lineHeight: "1.4",  fontWeight: "600" }],
        "body-lg":    ["1rem",     { lineHeight: "1.6",  fontWeight: "400" }],
        "body-md":    ["0.875rem", { lineHeight: "1.6",  fontWeight: "400" }],
        "body-sm":    ["0.75rem",  { lineHeight: "1.5",  fontWeight: "400" }],
        "label":      ["0.6875rem",{ lineHeight: "1.4",  fontWeight: "500" }],
      },

      // ── Spacing (8 px base grid) ─────────────────────────────────────
      spacing: {
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "8": "32px",
        "10": "40px",
        "12": "48px",
        "16": "64px",
        // Bottom nav height + safe area
        "bottom-nav": "56px",
      },

      // ── Border radius ────────────────────────────────────────────────
      borderRadius: {
        sm:   "4px",
        md:   "8px",
        lg:   "12px",
        xl:   "16px",
        full: "9999px",
      },

      // ── Box shadows ──────────────────────────────────────────────────
      boxShadow: {
        "elevation-1": "0 1px 3px rgba(0,0,0,0.4)",
        "elevation-2": "0 4px 12px rgba(0,0,0,0.5)",
        "elevation-3": "0 8px 24px rgba(0,0,0,0.6)",
        "elevation-4": "0 16px 48px rgba(0,0,0,0.7)",
      },

      // ── Screen breakpoints ───────────────────────────────────────────
      screens: {
        sm:  "640px",
        md:  "768px",
        lg:  "1024px",
        xl:  "1280px",
        "2xl": "1536px",
      },

      // ── Transitions ──────────────────────────────────────────────────
      transitionDuration: {
        DEFAULT: "200ms",
      },
    },
  },
  plugins: [],
};
export default config;
