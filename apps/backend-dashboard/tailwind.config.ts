import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dashboard: {
          bg: "#0f1117",
          surface: "#1a1d2e",
          border: "#2a2d3e",
          primary: "#6366f1",
          primaryLight: "#818cf8",
          success: "#22c55e",
          warning: "#f59e0b",
          danger: "#ef4444",
          muted: "#9ca3af",
        },
      },
    },
  },
  plugins: [],
};

export default config;
