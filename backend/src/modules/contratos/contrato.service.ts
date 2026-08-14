import { StatusOS } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

export interface ContratoInput {
  clienteId: string;
  equipamentoId?: string | null;
  numero?: string | null;
  slaHorasResposta: number;
  vigenciaInicio: Date;
  vigenciaFim?: Date | null;
  ativo?: boolean;
  observacoes?: string | null;
}

const MS_POR_HORA = 3_600_000;

export function listarContratos(clienteId?: string) {
  return prisma.contrato.findMany({
    where: clienteId ? { clienteId } : undefined,
    include: { cliente: true, equipamento: true },
    orderBy: [{ ativo: "desc" }, { criadoEm: "desc" }],
  });
}

export async function buscarContratoPorId(id: string) {
  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: { cliente: true, equipamento: true },
  });
  if (!contrato) throw new AppError("Contrato não encontrado.", 404);
  return contrato;
}

export function criarContrato(dados: ContratoInput) {
  return prisma.contrato.create({ data: dados });
}

export async function atualizarContrato(id: string, dados: Partial<ContratoInput>) {
  await buscarContratoPorId(id);
  return prisma.contrato.update({ where: { id }, data: dados });
}

export async function excluirContrato(id: string) {
  await buscarContratoPorId(id);
  await prisma.contrato.delete({ where: { id } });
}

// ----------------------------------------------------------------------------
// SLA — resolução do prazo de resposta contratual por OS
// ----------------------------------------------------------------------------

export type StatusSla =
  | "SEM_CONTRATO" // nenhum contrato ativo cobre esse cliente/equipamento
  | "NO_PRAZO" // ainda não atendido, dentro do prazo
  | "ATRASADO" // ainda não atendido, prazo já estourou
  | "CUMPRIDO" // primeiro atendimento aconteceu dentro do prazo
  | "DESCUMPRIDO"; // primeiro atendimento aconteceu depois do prazo

export interface SlaOS {
  status: StatusSla;
  slaHorasResposta: number | null;
  prazoResposta: string | null; // ISO — abertura + SLA
  respondidoEm: string | null; // ISO do primeiro atendimento, ou null
  horasRestantes: number | null; // só quando NO_PRAZO
  contratoId: string | null;
}

type ContratoSlim = {
  id: string;
  equipamentoId: string | null;
  slaHorasResposta: number;
  vigenciaInicio: Date;
  vigenciaFim: Date | null;
  ativo: boolean;
};

type OSParaSla = {
  clienteId: string;
  equipamentoId: string;
  dataAbertura: Date;
  statusHistoricos?: { status: StatusOS; criadoEm: Date }[];
};

const SEM_CONTRATO: SlaOS = {
  status: "SEM_CONTRATO",
  slaHorasResposta: null,
  prazoResposta: null,
  respondidoEm: null,
  horasRestantes: null,
  contratoId: null,
};

/**
 * Escolhe, entre uma lista de contratos já carregada, o que se aplica a uma
 * OS numa data de referência. Regra de precedência: um contrato específico do
 * equipamento vence um contrato geral do cliente (equipamentoId nulo). Só
 * considera contratos ativos e dentro da vigência na data de referência.
 */
export function escolherContrato(
  contratos: ContratoSlim[],
  equipamentoId: string,
  referencia: Date
): ContratoSlim | null {
  const vigentes = contratos.filter(
    (c) =>
      c.ativo &&
      c.vigenciaInicio.getTime() <= referencia.getTime() &&
      (c.vigenciaFim === null || c.vigenciaFim.getTime() >= referencia.getTime())
  );
  const doEquipamento = vigentes.find((c) => c.equipamentoId === equipamentoId);
  const geral = vigentes.find((c) => c.equipamentoId === null);
  return doEquipamento ?? geral ?? null;
}

/**
 * Calcula o status de SLA de uma OS dado o contrato aplicável (ou null).
 * Função pura — não consulta o banco, pra poder ser usada tanto no detalhe
 * (1 OS) quanto em lote na listagem.
 */
export function calcularSla(os: OSParaSla, contrato: ContratoSlim | null): SlaOS {
  if (!contrato) return SEM_CONTRATO;

  const prazo = new Date(os.dataAbertura.getTime() + contrato.slaHorasResposta * MS_POR_HORA);
  const base = {
    slaHorasResposta: contrato.slaHorasResposta,
    prazoResposta: prazo.toISOString(),
    contratoId: contrato.id,
  };

  // Primeiro atendimento = primeira mudança de status que sai de RECEBIDO.
  const primeiraResposta = (os.statusHistoricos ?? [])
    .filter((h) => h.status !== StatusOS.RECEBIDO)
    .sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime())[0];

  if (primeiraResposta) {
    const cumpriu = primeiraResposta.criadoEm.getTime() <= prazo.getTime();
    return {
      ...base,
      status: cumpriu ? "CUMPRIDO" : "DESCUMPRIDO",
      respondidoEm: primeiraResposta.criadoEm.toISOString(),
      horasRestantes: null,
    };
  }

  const agora = new Date();
  const dentro = agora.getTime() <= prazo.getTime();
  return {
    ...base,
    status: dentro ? "NO_PRAZO" : "ATRASADO",
    respondidoEm: null,
    horasRestantes: dentro ? (prazo.getTime() - agora.getTime()) / MS_POR_HORA : null,
  };
}

/** Resolve o SLA de UMA OS consultando os contratos do cliente. */
export async function resolverSlaDaOS(os: OSParaSla): Promise<SlaOS> {
  const contratos = await prisma.contrato.findMany({
    where: { clienteId: os.clienteId, ativo: true },
  });
  return calcularSla(os, escolherContrato(contratos, os.equipamentoId, os.dataAbertura));
}

/**
 * Resolve o SLA de uma LISTA de OS com uma única consulta de contratos
 * (evita N+1). Cada OS precisa trazer statusHistoricos (status + criadoEm)
 * pra distinguir CUMPRIDO/DESCUMPRIDO de NO_PRAZO/ATRASADO.
 */
export async function anexarSlaEmLista<T extends OSParaSla>(
  oss: T[]
): Promise<(T & { sla: SlaOS })[]> {
  const clienteIds = [...new Set(oss.map((o) => o.clienteId))];
  const contratos = clienteIds.length
    ? await prisma.contrato.findMany({ where: { clienteId: { in: clienteIds }, ativo: true } })
    : [];
  const porCliente = new Map<string, ContratoSlim[]>();
  for (const c of contratos) {
    const lista = porCliente.get(c.clienteId) ?? [];
    lista.push(c);
    porCliente.set(c.clienteId, lista);
  }
  return oss.map((os) => ({
    ...os,
    sla: calcularSla(os, escolherContrato(porCliente.get(os.clienteId) ?? [], os.equipamentoId, os.dataAbertura)),
  }));
}
