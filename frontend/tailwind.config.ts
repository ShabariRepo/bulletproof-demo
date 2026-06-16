import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      screens: {
        xs: "360px"
      },
      colors: {
        background: "#0a0a0a",
        foreground: "#e4e4e7",
        border: "#262626",
        input: "#262626",
        ring: "#7c3aed",
        primary: {
          DEFAULT: "#7c3aed",
          foreground: "#ffffff"
        },
        secondary: {
          DEFAULT: "#18181b",
          foreground: "#e4e4e7"
        },
        muted: {
          DEFAULT: "#141414",
          foreground: "#71717a"
        },
        accent: {
          DEFAULT: "#1f1f23",
          foreground: "#fafafa"
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#fafafa"
        },
        card: {
          DEFAULT: "#141414",
          foreground: "#e4e4e7"
        },
        popover: {
          DEFAULT: "#141414",
          foreground: "#e4e4e7"
        }
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem"
      }
    }
  },
  plugins: []
};

export default config;
