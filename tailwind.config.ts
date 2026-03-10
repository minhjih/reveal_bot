import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0f",
        "card-bg": "#12121a",
        "card-hover": "#1a1a2e",
        foreground: "#e0e0e0",
        cyan: "#00d4ff",
        purple: "#7c3aed",
        "purple-light": "#a78bfa",
        "cyan-dark": "#0099cc",
        muted: "#6b7280",
      },
      boxShadow: {
        glow: "0 0 20px rgba(0, 212, 255, 0.15)",
        "glow-purple": "0 0 20px rgba(124, 58, 237, 0.15)",
      },
    },
  },
  plugins: [],
};
export default config;
