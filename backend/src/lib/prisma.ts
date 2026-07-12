import { PrismaClient, Prisma } from "@prisma/client";

// Campos monetários (salário, comissão, valorMaoDeObra, custos de
// deslocamento etc.) são Prisma.Decimal no banco. Por padrão, Decimal
// serializa como STRING em JSON.stringify (via seu próprio toJSON) — e
// o frontend, que trata esses campos como number, acaba fazendo
// concatenação de string em vez de soma (ex: 0 + "3500.00" + "3200.00"
// = "03500.003200.00"), o que aparecia como um "número gigante" nos
// cards do dashboard. Sobrescrevemos toJSON pra sempre devolver number.
(Prisma.Decimal.prototype as unknown as { toJSON: () => number }).toJSON = function (this: Prisma.Decimal) {
  return this.toNumber();
};

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
