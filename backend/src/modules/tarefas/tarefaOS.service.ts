import { StatusTarefa } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

// Execução de tarefas cronometradas DENTRO de uma OS. O cronômetro é implícito:
// não existe botão de "play/stop" com relógio visível ao técnico — ele apenas
// muda o status da tarefa (Iniciar → EM_ANDAMENTO, Concluir → CONCLUIDA) e o
// tempo é medido nos bastidores (iniciadoEm → finalizadoEm). Só o dono/gestor
// enxerga os tempos, no comparativo de produtividade.

const includeTarefa = {
  tarefaCatalogo: true,
  funcionario: { include: { usuario: { select: { nome: true } } } },
};

export function listarTarefasDaOS(ordemServicoId: string) {
  return prisma.tarefaOS.findMany({
    where: { ordemServicoId },
    include: includeTarefa,
    orderBy: { criadoEm: "asc" },
  });
}

export async function adicionarTarefa(ordemServicoId: string, tarefaCatalogoId: string) {
  const os = await prisma.ordemServico.findUnique({ where: { id: ordemServicoId } });
  if (!os) throw new AppError("Ordem de serviço não encontrada.", 404);

  const tarefa = await prisma.tarefaCatalogo.findUnique({ where: { id: tarefaCatalogoId } });
  if (!tarefa || !tarefa.ativo) throw new AppError("Tarefa do catálogo não encontrada.", 404);

  return prisma.tarefaOS.create({
    data: { ordemServicoId, tarefaCatalogoId },
    include: includeTarefa,
  });
}

/**
 * Campos de uma pausa: fecha o segmento atual (desde iniciadoEm), soma no
 * acumulado e zera o segmento aberto. Usado pelo botão "Pausar" e pela pausa
 * automática ao cancelar a OS.
 */
export function camposDePausa(
  tarefa: { duracaoAcumuladaSegundos: number | null; iniciadoEm: Date | null },
  agora: Date
) {
  const acumulada = tarefa.duracaoAcumuladaSegundos ?? 0;
  const segmentoAtual = tarefa.iniciadoEm
    ? Math.max(0, Math.round((agora.getTime() - tarefa.iniciadoEm.getTime()) / 1000))
    : 0;
  return {
    status: StatusTarefa.PAUSADO,
    duracaoAcumuladaSegundos: acumulada + segmentoAtual,
    iniciadoEm: null,
    finalizadoEm: null,
    duracaoSegundos: null,
  };
}

/**
 * Pausa todas as tarefas EM_ANDAMENTO de uma OS (decisão de 12/11/2026: ao
 * cancelar a OS, cronômetro rodando conta tempo à toa). O tempo já corrido
 * fica no acumulado; reabrir a OS e retomar continua de onde parou.
 * Devolve quantas tarefas foram pausadas.
 */
export async function pausarTarefasEmAndamento(ordemServicoId: string, agora = new Date()) {
  const emAndamento = await prisma.tarefaOS.findMany({
    where: { ordemServicoId, status: StatusTarefa.EM_ANDAMENTO },
    select: { id: true, duracaoAcumuladaSegundos: true, iniciadoEm: true },
  });
  await prisma.$transaction(
    emAndamento.map((t) =>
      prisma.tarefaOS.update({ where: { id: t.id }, data: camposDePausa(t, agora) })
    )
  );
  return emAndamento.length;
}

export interface AtualizarStatusTarefaInput {
  status: StatusTarefa;
  /**
   * Quem está executando. Resolvido no controller: se o ator é TÉCNICO, é o
   * próprio; caso contrário (DONO/GESTOR/SUPORTE marcando por ele), cai no
   * técnico designado da OS. Só é aplicado ao INICIAR a tarefa.
   */
  funcionarioId?: string;
}

/**
 * Transiciona o status de uma tarefa da OS e cronometra automaticamente:
 * - → EM_ANDAMENTO: fixa iniciadoEm (na 1ª vez) e o funcionário que executa.
 * - → CONCLUIDA: fixa finalizadoEm e a duração (finalizadoEm − iniciadoEm).
 * - → PENDENTE: zera o cronômetro (permite recomeçar do zero).
 */
export async function atualizarStatusTarefa(
  ordemServicoId: string,
  tarefaId: string,
  dados: AtualizarStatusTarefaInput
) {
  const tarefa = await prisma.tarefaOS.findUnique({ where: { id: tarefaId } });
  if (!tarefa || tarefa.ordemServicoId !== ordemServicoId) {
    throw new AppError("Tarefa não encontrada nesta ordem de serviço.", 404);
  }

  const agora = new Date();
  const data: Record<string, unknown> = { status: dados.status };

  // Tempo já acumulado em segmentos fechados (pausas anteriores) + o segmento
  // atual em andamento (se houver iniciadoEm aberto).
  const acumulada = tarefa.duracaoAcumuladaSegundos ?? 0;
  const segmentoAtual = tarefa.iniciadoEm
    ? Math.max(0, Math.round((agora.getTime() - tarefa.iniciadoEm.getTime()) / 1000))
    : 0;

  if (dados.status === StatusTarefa.EM_ANDAMENTO) {
    // Iniciar ou RETOMAR: abre um novo segmento (iniciadoEm = agora). O tempo já
    // corrido fica preservado em duracaoAcumuladaSegundos.
    data.iniciadoEm = agora;
    if (dados.funcionarioId && !tarefa.funcionarioId) data.funcionarioId = dados.funcionarioId;
    data.finalizadoEm = null;
    data.duracaoSegundos = null;
  } else if (dados.status === StatusTarefa.PAUSADO) {
    Object.assign(data, camposDePausa(tarefa, agora));
  } else if (dados.status === StatusTarefa.CONCLUIDA) {
    // Concluir: duração total = acumulado + segmento atual (0 se nunca iniciou).
    const total = acumulada + segmentoAtual;
    if (dados.funcionarioId && !tarefa.funcionarioId) data.funcionarioId = dados.funcionarioId;
    data.duracaoAcumuladaSegundos = total;
    data.iniciadoEm = null;
    data.finalizadoEm = agora;
    data.duracaoSegundos = total;
  } else {
    // Volta pra PENDENTE: zera o cronômetro (acumulado inclusive).
    data.duracaoAcumuladaSegundos = 0;
    data.iniciadoEm = null;
    data.finalizadoEm = null;
    data.duracaoSegundos = null;
  }

  return prisma.tarefaOS.update({
    where: { id: tarefaId },
    data,
    include: includeTarefa,
  });
}

export async function removerTarefa(ordemServicoId: string, tarefaId: string) {
  const tarefa = await prisma.tarefaOS.findUnique({ where: { id: tarefaId } });
  if (!tarefa || tarefa.ordemServicoId !== ordemServicoId) {
    throw new AppError("Tarefa não encontrada nesta ordem de serviço.", 404);
  }
  await prisma.tarefaOS.delete({ where: { id: tarefaId } });
  return tarefa;
}
