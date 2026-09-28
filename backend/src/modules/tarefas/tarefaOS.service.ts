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

  if (dados.status === StatusTarefa.EM_ANDAMENTO) {
    // Só marca o início na primeira vez que entra em andamento — reabrir uma
    // tarefa já iniciada não reinicia o relógio (o tempo total é acumulado a
    // partir do primeiro início).
    if (!tarefa.iniciadoEm) data.iniciadoEm = agora;
    if (dados.funcionarioId) data.funcionarioId = dados.funcionarioId;
    data.finalizadoEm = null;
    data.duracaoSegundos = null;
  } else if (dados.status === StatusTarefa.CONCLUIDA) {
    // Concluir sem ter iniciado (ex: tarefa relâmpago) — trata início = agora,
    // duração 0, pra nunca gravar duração negativa/nula inconsistente.
    const inicio = tarefa.iniciadoEm ?? agora;
    if (!tarefa.iniciadoEm) data.iniciadoEm = agora;
    if (dados.funcionarioId && !tarefa.funcionarioId) data.funcionarioId = dados.funcionarioId;
    data.finalizadoEm = agora;
    data.duracaoSegundos = Math.max(0, Math.round((agora.getTime() - inicio.getTime()) / 1000));
  } else {
    // Volta pra PENDENTE: zera o cronômetro.
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
