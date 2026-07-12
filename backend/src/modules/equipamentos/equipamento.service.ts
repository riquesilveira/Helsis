import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

export interface EquipamentoInput {
  clienteId: string;
  tipo: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  localInstalacao?: string;
  frequenciaManutencaoMeses?: number | null;
}

export function somarMeses(data: Date, meses: number): Date {
  const resultado = new Date(data);
  const diaOriginal = resultado.getDate();
  resultado.setDate(1); // evita overflow ao mudar o mês
  resultado.setMonth(resultado.getMonth() + meses);
  const ultimoDiaDoMesDestino = new Date(resultado.getFullYear(), resultado.getMonth() + 1, 0).getDate();
  resultado.setDate(Math.min(diaOriginal, ultimoDiaDoMesDestino));
  return resultado;
}

export function listarEquipamentos(clienteId?: string) {
  return prisma.equipamento.findMany({
    where: clienteId ? { clienteId } : undefined,
    include: { cliente: true },
    orderBy: { criadoEm: "desc" },
  });
}

export async function buscarEquipamentoPorId(id: string) {
  const equipamento = await prisma.equipamento.findUnique({
    where: { id },
    include: { cliente: true, ordensServico: true },
  });
  if (!equipamento) throw new AppError("Equipamento não encontrado.", 404);
  return equipamento;
}

export function criarEquipamento(dados: EquipamentoInput) {
  // Se já veio com uma frequência de manutenção preventiva definida, já
  // calculamos a primeira data prevista (a partir de hoje), pra o
  // equipamento já nascer com um plano de manutenção ativo.
  const proximaManutencaoPreventiva = dados.frequenciaManutencaoMeses
    ? somarMeses(new Date(), dados.frequenciaManutencaoMeses)
    : null;

  return prisma.equipamento.create({
    data: { ...dados, proximaManutencaoPreventiva },
  });
}

export async function atualizarEquipamento(id: string, dados: Partial<EquipamentoInput>) {
  const atual = await buscarEquipamentoPorId(id);

  const dadosAtualizacao: Record<string, unknown> = { ...dados };

  // Se a frequência mudou (ou foi definida agora pela primeira vez) e ainda
  // não existe nenhuma manutenção preventiva registrada, recalcula a
  // próxima data prevista a partir de hoje. Se a frequência foi removida,
  // limpa a próxima data também — o equipamento passa a não ter plano.
  if ("frequenciaManutencaoMeses" in dados) {
    if (!dados.frequenciaManutencaoMeses) {
      dadosAtualizacao.proximaManutencaoPreventiva = null;
    } else if (!atual.ultimaManutencaoPreventiva) {
      dadosAtualizacao.proximaManutencaoPreventiva = somarMeses(
        new Date(),
        dados.frequenciaManutencaoMeses
      );
    }
  }

  return prisma.equipamento.update({ where: { id }, data: dadosAtualizacao });
}

export type StatusManutencaoPreventiva = "ATRASADA" | "PROXIMA" | "EM_DIA";

function calcularStatusPreventiva(proximaData: Date): StatusManutencaoPreventiva {
  const hoje = new Date();
  const emTrintaDias = new Date(hoje);
  emTrintaDias.setDate(emTrintaDias.getDate() + 30);

  if (proximaData < hoje) return "ATRASADA";
  if (proximaData <= emTrintaDias) return "PROXIMA";
  return "EM_DIA";
}

/**
 * Lista todos os equipamentos que têm um plano de manutenção preventiva
 * ativo, ordenados pelos mais urgentes primeiro. É essa lista que vira a
 * tela "Manutenções preventivas" — o equivalente a uma agenda de revisões,
 * em vez de esperar o equipamento quebrar.
 */
export async function listarManutencoesPreventivas() {
  const equipamentos = await prisma.equipamento.findMany({
    where: { frequenciaManutencaoMeses: { not: null } },
    include: { cliente: true },
  });

  return equipamentos
    .map((eq) => ({
      ...eq,
      statusPreventiva: eq.proximaManutencaoPreventiva
        ? calcularStatusPreventiva(eq.proximaManutencaoPreventiva)
        : ("ATRASADA" as StatusManutencaoPreventiva),
    }))
    .sort((a, b) => {
      const dataA = a.proximaManutencaoPreventiva?.getTime() ?? 0;
      const dataB = b.proximaManutencaoPreventiva?.getTime() ?? 0;
      return dataA - dataB;
    });
}

/**
 * Chamado quando uma OS do tipo PREVENTIVA é concluída — atualiza o
 * registro da última manutenção feita e recalcula a próxima data prevista
 * a partir da frequência configurada no equipamento.
 */
export async function registrarManutencaoPreventivaConcluida(equipamentoId: string) {
  const equipamento = await prisma.equipamento.findUnique({ where: { id: equipamentoId } });
  if (!equipamento?.frequenciaManutencaoMeses) return;

  const agora = new Date();
  await prisma.equipamento.update({
    where: { id: equipamentoId },
    data: {
      ultimaManutencaoPreventiva: agora,
      proximaManutencaoPreventiva: somarMeses(agora, equipamento.frequenciaManutencaoMeses),
    },
  });
}
