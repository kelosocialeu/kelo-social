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
        // Dégradé en 90deg (horizontal) au lieu de 135deg : les trois
        // couleurs restent visibles même sur des éléments courts/étroits
        // (items de sidebar, petits boutons), pas seulement les grands.
        "kelo-gradient":
          "linear-gradient(90deg,#7d4cff 0%,#b14fff 50%,#ff4fa0 100%)",
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
