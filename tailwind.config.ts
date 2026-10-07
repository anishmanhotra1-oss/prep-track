import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          tint: "var(--primary-tint)",
          text: "var(--primary-text)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          border: "var(--surface-border)",
        },
        text: {
          primary: "var(--text-primary)",
          muted: "var(--text-muted)",
        },
        danger: "var(--danger)",
        success: "var(--success)",
        warning: "var(--warning)",
        subject: {
          blue: "#3B82F6",
          green: "#10B981",
          orange: "#F97316",
          purple: "#8B5CF6",
          pink: "#EC4899",
          yellow: "#EAB308",
          teal: "#14B8A6",
          red: "#EF4444",
        },
      },
      borderRadius: {
        card: "24px",
        pill: "9999px",
      },
      boxShadow: {
        card: "0 8px 30px rgba(255, 140, 60, 0.10)",
        "card-hover": "0 12px 36px rgba(255, 140, 60, 0.16)",
        drawer: "0 -8px 30px rgba(0, 0, 0, 0.15)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
