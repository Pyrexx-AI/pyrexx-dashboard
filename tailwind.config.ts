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
        pyrexx: {
          cyan: "#48C4C6",
          purple: "#8952A5",
          light: "#F0FAFA", // Soft cyan-tinted background
          dark: "#2A1838", // Deep complementary purple for dark text
          glow: "#CBECEE",
        }
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [],
};
export default config;