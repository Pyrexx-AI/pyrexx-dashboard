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
          blue: "#48C4C6",
          purple: "#8952A5",
          darkBg: "#160B24",
          darkCard: "#221136",
        }
      },
      boxShadow: {
        'expensive': '0 8px 25px -8px rgba(72, 196, 198, 0.15)',
        'expensive-dark': '0 8px 25px -8px rgba(137, 82, 165, 0.25)',
      },
      animation: {
        'swirl-clockwise': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [],
};
export default config;