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
          background: "#f8f8fb",
          surface: "#ffffff",

          primary: "#7d4cff",
          secondary: "#d54cff",

          text: "#151515",
          muted: "#666666",

          border: "#ececf4",

          success: "#2dbf6d",
          warning: "#f4b400",
          danger: "#ea4335",
        },
      },

      backgroundImage: {
        "kelo-gradient":
          "linear-gradient(135deg,#7d4cff,#b14fff,#ff4fa0)",
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
