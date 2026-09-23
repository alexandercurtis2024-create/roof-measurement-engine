import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0b1220",
          900: "#111827",
          800: "#1f2937",
          700: "#374151",
        },
        copper: {
          50: "#fbf4ee",
          100: "#f4e3d4",
          400: "#d08a4c",
          500: "#c46a2b",
          600: "#a8541f",
          700: "#874318",
        },
      },
    },
  },
  plugins: [],
};

export default config;
