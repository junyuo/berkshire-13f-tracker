/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#17211a",
        paper: "#f7f8f4",
        moss: "#46624a",
        brass: "#a37633",
      },
    },
  },
  plugins: [],
};
