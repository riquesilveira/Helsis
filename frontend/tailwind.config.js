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
        },
        status: {
          recebido: "#8A99A6",
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
    },
  },
  plugins: [],
};
