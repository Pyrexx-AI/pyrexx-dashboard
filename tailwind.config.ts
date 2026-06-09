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
        pastel: {
          blue: "#AEC6CF",
          light: "#EAF1F4", // Very soft tint of pastel blue for backgrounds
          dark: "#7A9CAE",
        },
        pyrexx: {
          purple: "#8952A5",
        }
      },
      boxShadow: {
        // Ultra-soft, dispersed shadow for that "expensive Apple-like" card feel
        'expensive': '0 20px 40px -15px rgba(174, 198, 207, 0.25)',
        'expensive-hover': '0 25px 50px -15px rgba(174, 198, 207, 0.4)',
      }
    },
  },
  plugins: [],
};
export default config;