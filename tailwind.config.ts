import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      colors: {
        kelo: {
          background: "rgb(var(--background-rgb) / <alpha-value>)",
          surface: "rgb(var(--surface-rgb) / <alpha-value>)",
          primary: "rgb(var(--primary-rgb) / <alpha-value>)",
          secondary: "rgb(var(--secondary-rgb) / <alpha-value>)",
          text: "rgb(var(--text-rgb) / <alpha-value>)",
          muted: "rgb(var(--text-light-rgb) / <alpha-value>)",
          border: "rgb(var(--border-rgb) / <alpha-value>)",
          success: "rgb(var(--success-rgb) / <alpha-value>)",
          warning: "rgb(var(--warning-rgb) / <alpha-value>)",
          danger: "rgb(var(--danger-rgb) / <alpha-value>)",
        },
      },

      backgroundImage: {
        "kelo-gradient": "var(--gradient)",
      },

      borderRadius: {
        xl2: "24px",
      },

      boxShadow: {
        kelo: "0 10px 35px rgba(0,0,0,.06)",
      },
    },
  },

  plugins: [],
};

export default config;
