import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15231F",
        brand: { 50: "#F0F8F5", 100: "#DCEFE8", 500: "#2A8467", 600: "#216B54", 700: "#195541" }
      },
      boxShadow: { card: "0 1px 2px rgba(16,24,20,.04), 0 8px 28px rgba(16,24,20,.04)" }
    }
  },
  plugins: []
};
export default config;
