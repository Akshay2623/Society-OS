/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#4F46E5",
          secondary: "#10B981",
          bg: "#F9FAFB",
        },
      },
      boxShadow: {
        soft: "0 8px 30px rgba(79, 70, 229, 0.08)",
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(circle at top right, rgba(79,70,229,0.18), transparent 45%), radial-gradient(circle at bottom left, rgba(16,185,129,0.12), transparent 40%)",
      },
    },
  },
  plugins: [],
};
