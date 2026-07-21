import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

// Folha de ponto — entrada/saída dos funcionários. Regra central: só pode
// haver UM turno aberto (saida=null) por funcionário de cada vez.

/** Turno aberto do funcionário (saida=null), ou null se não houver. */
export function pontoAtual(funcionarioId: string) {
  return prisma.registroPonto.findFirst({
    where: { funcionarioId, saida: null },
    orderBy: { entrada: "desc" },
  });
}

export async function registrarEntrada(funcionarioId: string) {
  const aberto = await pontoAtual(funcionarioId);
  if (aberto) {
    throw new AppError("Já existe um ponto de entrada em aberto. Registre a saída primeiro.", 409);
  }
  return prisma.registroPonto.create({ data: { funcionarioId, entrada: new Date() } });
}

export async function registrarSaida(funcionarioId: string) {
  const aberto = await pontoAtual(funcionarioId);
  if (!aberto) {
    throw new AppError("Não há ponto de entrada em aberto para registrar a saída.", 409);
  }
  return prisma.registroPonto.update({
    where: { id: aberto.id },
    data: { saida: new Date() },
  });
}

/** Últimos registros do próprio funcionário (a folha dele). */
export function listarMeusRegistros(funcionarioId: string) {
  return prisma.registroPonto.findMany({
    where: { funcionarioId },
    orderBy: { entrada: "desc" },
    take: 100,
  });
}

/**
 * Visão consolidada para gerente/dono. Permite filtrar por funcionário e por
 * intervalo de datas (baseado na hora de ENTRADA).
 */
export function listarRegistros(filtros: { funcionarioId?: string; de?: string; ate?: string }) {
  const where: Record<string, unknown> = {};
  if (filtros.funcionarioId) where.funcionarioId = filtros.funcionarioId;
  if (filtros.de || filtros.ate) {
    const entrada: Record<string, Date> = {};
    if (filtros.de) entrada.gte = new Date(filtros.de);
    if (filtros.ate) entrada.lte = new Date(filtros.ate);
    where.entrada = entrada;
  }
  return prisma.registroPonto.findMany({
    where,
    orderBy: { entrada: "desc" },
    take: 500,
    include: { funcionario: { include: { usuario: { select: { nome: true } } } } },
  });
}
