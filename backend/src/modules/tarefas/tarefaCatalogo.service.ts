import { prisma } from "../../lib/prisma";

// Catálogo de tarefas nomeadas e cronometráveis (ex: "Trocar bobina",
// "Calibrar"). É o vocabulário padronizado que o técnico executa dentro de uma
// OS. tempoEstimadoMin é um alvo opcional usado no comparativo (realizado vs.
// esperado). Segue o mesmo padrão do catálogo de diagnóstico.

export interface TarefaCatalogoInput {
  codigo: string;
  descricao: string;
  tempoEstimadoMin?: number;
}

export function listarTarefasCatalogo() {
  return prisma.tarefaCatalogo.findMany({
    where: { ativo: true },
    orderBy: { codigo: "asc" },
  });
}

export function criarTarefaCatalogo(dados: TarefaCatalogoInput) {
  return prisma.tarefaCatalogo.create({ data: dados });
}

export function atualizarTarefaCatalogo(id: string, dados: Partial<TarefaCatalogoInput>) {
  return prisma.tarefaCatalogo.update({ where: { id }, data: dados });
}

// Desativação lógica: a tarefa é referenciada por execuções (TarefaOS), então
// não pode ser apagada de fato (quebraria o histórico/comparativo).
// `ativo: false` remove do catálogo sem afetar execuções antigas.
export function desativarTarefaCatalogo(id: string) {
  return prisma.tarefaCatalogo.update({ where: { id }, data: { ativo: false } });
}
