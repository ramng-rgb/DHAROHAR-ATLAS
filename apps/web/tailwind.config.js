/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          DEFAULT: "#F9F6F0",
          50: "#FCFBF9",
          100: "#F6F1E9",
          200: "#EFE6D8",
          300: "#E2D3BE",
          400: "#D3BDA0",
          500: "#C4A782",
          800: "#4A3E31",
          900: "#2B241C",
          950: "#1A1510"
        },
        sandstone: {
          DEFAULT: "#D8C3A5",
          warm: "#E8D8C8",
          deep: "#8E8D8A",
          dark: "#2A2421"
        },
        indigoInk: {
          DEFAULT: "#0F172A",
          light: "#1E293B",
          dark: "#090D16"
        },
        terracotta: {
          DEFAULT: "#C85A32",
          dark: "#9E3C1B",
          light: "#E07A5F"
        },
        goldLeaf: {
          DEFAULT: "#D4AF37",
          glow: "#F3C649",
          dark: "#AA820A"
        },
        indigoHeritage: {
          DEFAULT: "#1F2A44",
          dark: "#141C2E",
          light: "#2D3D60"
        },
        mutedGold: {
          DEFAULT: "#C9A24B",
          light: "#DEBA6B",
          dark: "#A68233"
        }
      },
      fontFamily: {
        serif: ["'Cinzel'", "'Playfair Display'", "Georgia", "serif"],
        sans: ["'DM Sans'", "'Inter'", "system-ui", "-apple-system", "sans-serif"],
        devanagari: ["'Noto Sans Devanagari'", "serif"],
        gujarati: ["'Noto Sans Gujarati'", "sans-serif"]
      },
      boxShadow: {
        'warm-sm': '0 2px 8px -2px rgba(15, 23, 42, 0.4)',
        'warm-md': '0 8px 24px -6px rgba(15, 23, 42, 0.6)',
        'warm-lg': '0 16px 36px -8px rgba(15, 23, 42, 0.8)',
        'gold-glow': '0 0 25px rgba(201, 162, 75, 0.5)',
      },
      backgroundImage: {
        'jaali-pattern': "radial-gradient(#d4af37 0.75px, transparent 0.75px), radial-gradient(#d4af37 0.75px, #0f172a 0.75px)",
      }
    },
  },
  plugins: [],
}
