import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./types/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#F4F6F9",
        surface: "#FFFFFF",
        "surface-muted": "#F1F5F9",
        "surface-raised": "#FBFCFE",
        border: "#E2E8F0",
        "border-strong": "#CBD5E1",
        text: "#0F172A",
        "text-muted": "#475569",
        "text-subtle": "#64748B",
        primary: "#145C9E",
        "primary-hover": "#0F4C81",
        "primary-strong": "#0B3D6B",
        "primary-soft": "#E8F2FC",
        success: "#176B3A",
        "success-soft": "#E7F6EC",
        warning: "#8A5A00",
        "warning-soft": "#FFF4D6",
        danger: "#B42318",
        "danger-soft": "#FDECEC",
        info: "#0B5CAD",
        "info-soft": "#E7F1FB"
      },
      boxShadow: {
        focus: "0 0 0 3px rgba(20, 92, 158, 0.28)",
        xs: "0 1px 2px 0 rgba(15, 23, 42, 0.04)",
        sm: "0 1px 2px 0 rgba(15, 23, 42, 0.05), 0 1px 3px 0 rgba(15, 23, 42, 0.04)",
        card: "0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 2px 6px -1px rgba(15, 23, 42, 0.06)",
        "card-hover": "0 2px 4px -1px rgba(15, 23, 42, 0.06), 0 8px 20px -4px rgba(15, 23, 42, 0.12)",
        primary: "0 1px 2px 0 rgba(11, 61, 107, 0.30), 0 1px 1px 0 rgba(15, 23, 42, 0.06)"
      },
      backgroundImage: {
        "app-shell": "linear-gradient(180deg, #F6F8FB 0%, #F2F5F9 100%)",
        "brand-mark": "linear-gradient(135deg, #145C9E 0%, #0B3D6B 100%)",
        "primary-btn": "linear-gradient(180deg, #1A6AB0 0%, #145C9E 100%)"
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};

export default config;

