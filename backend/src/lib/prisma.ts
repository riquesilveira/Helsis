import { PrismaClient } from "@prisma/client";

// Evita múltiplas instâncias do PrismaClient em ambiente de desenvolvimento
// (o ts-node-dev recarrega o módulo a cada mudança de arquivo).
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
