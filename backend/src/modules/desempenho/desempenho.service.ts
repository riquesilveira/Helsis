import { StatusOS } from "@prisma/client";
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
    _sum: { custoPassagem: true, custoHospedagem: true },
  });

  const custoTotalDeslocamento =
    Number(deslocamentos._sum.custoPassagem ?? 0) + Number(deslocamentos._sum.custoHospedagem ?? 0);

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
