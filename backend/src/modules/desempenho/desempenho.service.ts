import { StatusOS, StatusTarefa } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

export interface DesempenhoFuncionario {
  funcionarioId: string;
  nome: string;
  cargo: string;
  totalOrdensConcluidas: number;
  resolvidasNaPrimeiraTentativa: number;
  taxaResolucaoPrimeiraTentativa: number; // 0 a 1
  mediaTentativasPorOrdem: number;
  tempoMedioResolucaoHoras: number | null;
  custoTotalDeslocamento: number;
  pecasTrocadasQueNaoResolveram: number;
  comissaoAcumulada: number;
}

/**
 * Calcula as métricas de desempenho de um técnico com base no histórico real
 * de ordens de serviço — é isso que o dono usa pra avaliar um pedido de
 * aumento de forma objetiva, em vez de "achismo".
 */
export async function calcularDesempenhoFuncionario(
  funcionarioId: string
): Promise<DesempenhoFuncionario> {
  const funcionario = await prisma.funcionario.findUnique({
    where: { id: funcionarioId },
    include: { usuario: { select: { nome: true } } },
  });

  if (!funcionario) throw new AppError("Funcionário não encontrado.", 404);

  const ordensConcluidas = await prisma.ordemServico.findMany({
    where: { funcionarioId, statusAtual: StatusOS.CONCLUIDO },
    select: {
      numeroTentativas: true,
      resolvidoNaPrimeira: true,
      dataAbertura: true,
      dataConclusao: true,
    },
  });

  const total = ordensConcluidas.length;
  const resolvidasPrimeira = ordensConcluidas.filter((o) => o.resolvidoNaPrimeira).length;

  const somaTentativas = ordensConcluidas.reduce((acc, o) => acc + o.numeroTentativas, 0);

  const temposResolucaoHoras = ordensConcluidas
    .filter((o) => o.dataConclusao)
    .map((o) => (o.dataConclusao!.getTime() - o.dataAbertura.getTime()) / 3_600_000);

  const tempoMedioResolucaoHoras =
    temposResolucaoHoras.length > 0
      ? temposResolucaoHoras.reduce((a, b) => a + b, 0) / temposResolucaoHoras.length
      : null;

  const deslocamentos = await prisma.deslocamento.aggregate({
    where: { funcionarioId },
    _sum: { custoPassagem: true, custoHospedagem: true, custoAlimentacao: true },
  });

  const custoTotalDeslocamento =
    Number(deslocamentos._sum.custoPassagem ?? 0) +
    Number(deslocamentos._sum.custoHospedagem ?? 0) +
    Number(deslocamentos._sum.custoAlimentacao ?? 0);

  const pecasQueNaoResolveram = await prisma.pecaTrocada.count({
    where: { funcionarioId, resolveuProblema: false },
  });

  const comissoes = await prisma.ordemServico.aggregate({
    where: { funcionarioId, valorComissao: { not: null } },
    _sum: { valorComissao: true },
  });
  const comissaoAcumulada = Number(comissoes._sum.valorComissao ?? 0);

  return {
    funcionarioId,
    nome: funcionario.usuario.nome,
    cargo: funcionario.cargo,
    totalOrdensConcluidas: total,
    resolvidasNaPrimeiraTentativa: resolvidasPrimeira,
    taxaResolucaoPrimeiraTentativa: total > 0 ? resolvidasPrimeira / total : 0,
    mediaTentativasPorOrdem: total > 0 ? somaTentativas / total : 0,
    tempoMedioResolucaoHoras,
    custoTotalDeslocamento,
    pecasTrocadasQueNaoResolveram: pecasQueNaoResolveram,
    comissaoAcumulada,
  };
}

/**
 * Ranking de todos os técnicos — útil pro dashboard do dono comparar
 * desempenho entre a equipe (ex: quando decide entre dois pedidos de aumento).
 */
export async function rankingDesempenho() {
  const funcionarios = await prisma.funcionario.findMany({
    where: { ativo: true },
    select: { id: true },
  });

  const resultados = await Promise.all(
    funcionarios.map((f) => calcularDesempenhoFuncionario(f.id))
  );

  return resultados.sort(
    (a, b) => b.taxaResolucaoPrimeiraTentativa - a.taxaResolucaoPrimeiraTentativa
  );
}

export interface ItemComissaoResumo {
  ordemServicoId: string;
  numero: number;
  clienteNome: string;
  dataConclusao: string;
  valorMaoDeObra: number;
  valorComissao: number;
}

export interface ResumoMensal {
  funcionarioId: string;
  nome: string;
  email: string;
  cargo: string;
  mes: number; // 1-12
  ano: number;
  salarioBase: number;
  tipoComissao: "PERCENTUAL" | "FIXO" | null;
  valorConfigComissao: number | null;
  atendimentos: ItemComissaoResumo[];
  totalComissoes: number;
  totalAPagar: number;
}

/**
 * Monta o resumo mensal de um técnico — salário + comissão detalhada
 * atendimento por atendimento — pra o dono gerar e imprimir/enviar como um
 * contracheque simples no fim do mês.
 */
export async function calcularResumoMensal(
  funcionarioId: string,
  mes: number,
  ano: number
): Promise<ResumoMensal> {
  const funcionario = await prisma.funcionario.findUnique({
    where: { id: funcionarioId },
    include: { usuario: { select: { nome: true, email: true } } },
  });

  if (!funcionario) throw new AppError("Funcionário não encontrado.", 404);

  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 1); // 1º dia do mês seguinte, exclusivo

  const ordens = await prisma.ordemServico.findMany({
    where: {
      funcionarioId,
      dataConclusao: { gte: inicio, lt: fim },
    },
    include: { cliente: { select: { nome: true } } },
    orderBy: { dataConclusao: "asc" },
  });

  const atendimentos: ItemComissaoResumo[] = ordens.map((o) => ({
    ordemServicoId: o.id,
    numero: o.numero,
    clienteNome: o.cliente.nome,
    dataConclusao: o.dataConclusao!.toISOString(),
    valorMaoDeObra: Number(o.valorMaoDeObra ?? 0),
    valorComissao: Number(o.valorComissao ?? 0),
  }));

  const totalComissoes = atendimentos.reduce((soma, a) => soma + a.valorComissao, 0);
  const salarioBase = Number(funcionario.salarioAtual);

  return {
    funcionarioId,
    nome: funcionario.usuario.nome,
    email: funcionario.usuario.email,
    cargo: funcionario.cargo,
    mes,
    ano,
    salarioBase,
    tipoComissao: funcionario.tipoComissao,
    valorConfigComissao: funcionario.valorComissao ? Number(funcionario.valorComissao) : null,
    atendimentos,
    totalComissoes,
    totalAPagar: salarioBase + totalComissoes,
  };
}

// ----------------------------------------------------------------------------
// TAREFAS CRONOMETRADAS — comparativo de produtividade
// ----------------------------------------------------------------------------
// Responde à pergunta do dono: "quanto cada colaborador leva na MESMA tarefa?".
// O tempo por execução já vem medido (TarefaOS.duracaoSegundos), gravado na
// conclusão. Aqui só agregamos por (tarefa × funcionário).

export interface FuncionarioNaTarefa {
  funcionarioId: string;
  nome: string;
  totalConcluidas: number;
  tempoMedioSegundos: number;
  tempoMinSegundos: number;
  tempoMaxSegundos: number;
}

export interface ComparativoTarefa {
  tarefaCatalogoId: string;
  codigo: string;
  descricao: string;
  tempoEstimadoMin: number | null;
  totalConcluidas: number;
  tempoMedioSegundos: number; // média da equipe nesta tarefa
  funcionarios: FuncionarioNaTarefa[]; // ordenado do mais rápido pro mais lento
}

interface FiltroComparativo {
  tarefaCatalogoId?: string;
  de?: Date;
  ate?: Date;
}

// Só considera execuções concluídas e com duração medida, atribuídas a alguém.
function whereExecucoesConcluidas(filtro: FiltroComparativo = {}) {
  const where: Record<string, unknown> = {
    status: StatusTarefa.CONCLUIDA,
    duracaoSegundos: { not: null },
    funcionarioId: { not: null },
  };
  if (filtro.tarefaCatalogoId) where.tarefaCatalogoId = filtro.tarefaCatalogoId;
  if (filtro.de || filtro.ate) {
    where.finalizadoEm = {
      ...(filtro.de ? { gte: filtro.de } : {}),
      ...(filtro.ate ? { lte: filtro.ate } : {}),
    };
  }
  return where;
}

function media(valores: number[]): number {
  return valores.length > 0 ? Math.round(valores.reduce((a, b) => a + b, 0) / valores.length) : 0;
}

/**
 * Comparativo de tempo por tarefa: para cada tarefa do catálogo com execuções
 * concluídas, lista cada colaborador com seu tempo médio/min/máx, ordenados do
 * mais rápido pro mais lento. É a base da tela "Comparativo de produtividade".
 */
export async function comparativoTarefas(filtro: FiltroComparativo = {}): Promise<ComparativoTarefa[]> {
  const execucoes = await prisma.tarefaOS.findMany({
    where: whereExecucoesConcluidas(filtro),
    select: {
      duracaoSegundos: true,
      tarefaCatalogoId: true,
      tarefaCatalogo: { select: { codigo: true, descricao: true, tempoEstimadoMin: true } },
      funcionarioId: true,
      funcionario: { select: { usuario: { select: { nome: true } } } },
    },
  });

  // Agrupa por tarefa → por funcionário.
  const porTarefa = new Map<
    string,
    {
      codigo: string;
      descricao: string;
      tempoEstimadoMin: number | null;
      todasDuracoes: number[];
      porFuncionario: Map<string, { nome: string; duracoes: number[] }>;
    }
  >();

  for (const ex of execucoes) {
    const dur = ex.duracaoSegundos as number;
    let tarefa = porTarefa.get(ex.tarefaCatalogoId);
    if (!tarefa) {
      tarefa = {
        codigo: ex.tarefaCatalogo.codigo,
        descricao: ex.tarefaCatalogo.descricao,
        tempoEstimadoMin: ex.tarefaCatalogo.tempoEstimadoMin ?? null,
        todasDuracoes: [],
        porFuncionario: new Map(),
      };
      porTarefa.set(ex.tarefaCatalogoId, tarefa);
    }
    tarefa.todasDuracoes.push(dur);

    const fid = ex.funcionarioId as string;
    let func = tarefa.porFuncionario.get(fid);
    if (!func) {
      func = { nome: ex.funcionario?.usuario.nome ?? "—", duracoes: [] };
      tarefa.porFuncionario.set(fid, func);
    }
    func.duracoes.push(dur);
  }

  const resultado: ComparativoTarefa[] = [];
  for (const [tarefaCatalogoId, tarefa] of porTarefa) {
    const funcionarios: FuncionarioNaTarefa[] = [...tarefa.porFuncionario.entries()]
      .map(([funcionarioId, f]) => ({
        funcionarioId,
        nome: f.nome,
        totalConcluidas: f.duracoes.length,
        tempoMedioSegundos: media(f.duracoes),
        tempoMinSegundos: Math.min(...f.duracoes),
        tempoMaxSegundos: Math.max(...f.duracoes),
      }))
      .sort((a, b) => a.tempoMedioSegundos - b.tempoMedioSegundos);

    resultado.push({
      tarefaCatalogoId,
      codigo: tarefa.codigo,
      descricao: tarefa.descricao,
      tempoEstimadoMin: tarefa.tempoEstimadoMin,
      totalConcluidas: tarefa.todasDuracoes.length,
      tempoMedioSegundos: media(tarefa.todasDuracoes),
      funcionarios,
    });
  }

  return resultado.sort((a, b) => a.codigo.localeCompare(b.codigo));
}

export interface HistoricoTarefaFuncionario {
  tarefaCatalogoId: string;
  codigo: string;
  descricao: string;
  tempoEstimadoMin: number | null;
  totalConcluidas: number;
  tempoMedioSegundos: number; // do funcionário
  tempoMedioEquipeSegundos: number; // média da equipe na mesma tarefa (referência)
}

/**
 * Histórico de tarefas cronometradas de um colaborador, com a média da equipe
 * na mesma tarefa como referência — mostra em quais tarefas ele está acima ou
 * abaixo da média. Alimenta a seção da página de desempenho do funcionário.
 */
export async function historicoTarefasFuncionario(
  funcionarioId: string
): Promise<HistoricoTarefaFuncionario[]> {
  const funcionario = await prisma.funcionario.findUnique({ where: { id: funcionarioId } });
  if (!funcionario) throw new AppError("Funcionário não encontrado.", 404);

  // Média da equipe por tarefa (reaproveita o comparativo geral).
  const comparativo = await comparativoTarefas();
  const mediaEquipePorTarefa = new Map(
    comparativo.map((c) => [c.tarefaCatalogoId, c.tempoMedioSegundos])
  );

  const execucoes = await prisma.tarefaOS.findMany({
    where: whereExecucoesConcluidas({ tarefaCatalogoId: undefined }),
    select: {
      duracaoSegundos: true,
      tarefaCatalogoId: true,
      funcionarioId: true,
      tarefaCatalogo: { select: { codigo: true, descricao: true, tempoEstimadoMin: true } },
    },
  });

  const doFuncionario = execucoes.filter((e) => e.funcionarioId === funcionarioId);

  const porTarefa = new Map<
    string,
    { codigo: string; descricao: string; tempoEstimadoMin: number | null; duracoes: number[] }
  >();
  for (const ex of doFuncionario) {
    let t = porTarefa.get(ex.tarefaCatalogoId);
    if (!t) {
      t = {
        codigo: ex.tarefaCatalogo.codigo,
        descricao: ex.tarefaCatalogo.descricao,
        tempoEstimadoMin: ex.tarefaCatalogo.tempoEstimadoMin ?? null,
        duracoes: [],
      };
      porTarefa.set(ex.tarefaCatalogoId, t);
    }
    t.duracoes.push(ex.duracaoSegundos as number);
  }

  return [...porTarefa.entries()]
    .map(([tarefaCatalogoId, t]) => ({
      tarefaCatalogoId,
      codigo: t.codigo,
      descricao: t.descricao,
      tempoEstimadoMin: t.tempoEstimadoMin,
      totalConcluidas: t.duracoes.length,
      tempoMedioSegundos: media(t.duracoes),
      tempoMedioEquipeSegundos: mediaEquipePorTarefa.get(tarefaCatalogoId) ?? media(t.duracoes),
    }))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
}
