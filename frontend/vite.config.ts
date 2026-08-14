import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        // Separa as libs pesadas em chunks próprios pra elas serem cacheadas
        // independente do código da aplicação (só refaz o download quando a
        // própria lib muda). O recharts, em especial, era o que empurrava o
        // bundle inicial acima de 500kB.
        manualChunks: {
          recharts: ["recharts"],
          "react-vendor": ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
