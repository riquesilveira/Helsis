import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Testes rodam isolados, sem tocar o banco (Neon é produção): os serviços
    // que acessam o Prisma são mockados com vi.mock nos próprios testes.
    include: ["src/**/*.test.ts"],
    globals: false,
    coverage: {
      provider: "v8",
      include: ["src/middlewares/**", "src/modules/**/*.controller.ts"],
      reporter: ["text", "html"],
    },
  },
});
