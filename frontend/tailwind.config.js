/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta "oficina técnica": grafite neutro + teal (refrigeração) como
        // cor de ação, e um conjunto de cores de status objetivas (não
        // decorativas) para a timeline da OS.
        grafite: {
          950: "#12181F",
          900: "#1B232C",
          800: "#26313C",
          600: "#4B5B68",
          400: "#8A99A6",
          200: "#D3DAE0",
          100: "#EDF1F4",
          50: "#F7F9FA",
        },
        teal: {
          700: "#0B6B6D",
          600: "#0F8B8D",
          500: "#14A6A8",
          100: "#DCF3F3",
          50: "#EFFAFA",
        },
        status: {
          recebido: "#5A6B78",
          diagnostico: "#B98A2E",
          aguardando: "#C1502E",
          reparo: "#0F8B8D",
          concluido: "#3F8F5F",
          cancelado: "#9B3B3B",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Sombras suaves e frias, coerentes com a paleta grafite — dão
        // profundidade sem "peso" (nada de sombras pretas duras).
        card: "0 1px 2px rgba(18, 24, 31, 0.04), 0 1px 3px rgba(18, 24, 31, 0.06)",
        "card-hover": "0 4px 12px rgba(18, 24, 31, 0.08), 0 2px 4px rgba(18, 24, 31, 0.05)",
        dropdown: "0 8px 24px rgba(18, 24, 31, 0.12), 0 2px 6px rgba(18, 24, 31, 0.08)",
        "focus-teal": "0 0 0 3px rgba(15, 139, 141, 0.15)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
