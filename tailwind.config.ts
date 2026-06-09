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
        pyrexx: {
          blue: "#48C4C6", // Exact logo cyan/blue
          purple: "#8952A5", // Exact logo purple
          darkBg: "#160B24", // Deep purple for Dark Mode background
          darkCard: "#221136", // Elevated purple for Dark Mode cards
        }
      },
      boxShadow: {
        'expensive': '0 8px 25px -8px rgba(72, 196, 198, 0.15)',
        'expensive-dark': '0 8px 25px -8px rgba(137, 82, 165, 0.25)',
      }
    },
  },
  plugins: [],
};
export default config;