import { StatusOS } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

// Etapas cujo `ativo` é sempre true e não pode ser desligado: a de entrada
// (RECEBIDO) e os dois desfechos (CONCLUIDO/CANCELADO). Sem elas o fluxo não
// fecha. As intermediárias podem ser desativadas por empresa que não as usa.
const ETAPAS_OBRIGATORIAS: StatusOS[] = ["RECEBIDO", "CONCLUIDO", "CANCELADO"];

// Configuração padrão de cada etapa — espelha os rótulos que já estavam
// espalhados no código (StatusBadge / ETAPAS_STATUS no frontend e ROTULOS_STATUS
// na notificação). É a partir daqui que a tabela é semeada na primeira leitura.
interface EtapaPadrao {
  status: StatusOS;
  rotulo: string;
  rotuloCliente: string;
  ordem: number;
}

export const ETAPAS_PADRAO: EtapaPadrao[] = [
  { status: "RECEBIDO", ordem: 0, rotulo: "Recebido", rotuloCliente: "Recebemos seu chamado" },
  {
    status: "DIAGNOSTICO",
    ordem: 1,
    rotulo: "Em diagnóstico",
    rotuloCliente: "Seu equipamento está em diagnóstico",
  },
  {
    status: "AGUARDANDO_PECA",
    ordem: 2,
    rotulo: "Aguardando peça",
    rotuloCliente: "Aguardando chegada de peça",
  },
  {
    status: "EM_REPARO",
    ordem: 3,
    rotulo: "Em reparo",
    rotuloCliente: "Seu equipamento está em reparo",
  },
  {
    status: "AGUARDANDO_VALIDACAO",
    ordem: 4,
    rotulo: "Aguardando validação",
    rotuloCliente: "O reparo foi finalizado e está passando pela validação final",
  },
  {
    status: "CONCLUIDO",
    ordem: 5,
    rotulo: "Concluído",
    rotuloCliente: "O reparo foi concluído e o equipamento já está liberado para uso",
  },
  { status: "CANCELADO", ordem: 6, rotulo: "Cancelado", rotuloCliente: "O atendimento foi cancelado" },
];

/**
 * Garante que existe uma linha de configuração para cada valor do enum StatusOS.
 * É idempotente (upsert) — pode rodar quantas vezes precisar sem duplicar nem
 * sobrescrever customizações já feitas (o upsert só CRIA quando falta; quando
 * já existe, não mexe). Isso é o que permite a tabela se popular sozinha na
 * primeira leitura, sem depender de rodar o seed contra o banco de produção.
 */
export async function garantirEtapasPadrao() {
  await Promise.all(
    ETAPAS_PADRAO.map((etapa) =>
      prisma.configuracaoEtapa.upsert({
        where: { status: etapa.status },
        update: {},
        create: {
          status: etapa.status,
          rotulo: etapa.rotulo,
          rotuloCliente: etapa.rotuloCliente,
          ordem: etapa.ordem,
          ativo: true,
        },
      })
    )
  );
}

/** Lista as etapas na ordem configurada, semeando os defaults se faltar. */
export async function listarEtapas() {
  const total = await prisma.configuracaoEtapa.count();
  if (total < ETAPAS_PADRAO.length) {
    await garantirEtapasPadrao();
  }
  return prisma.configuracaoEtapa.findMany({ orderBy: { ordem: "asc" } });
}

export interface AtualizarEtapaInput {
  status: StatusOS;
  rotulo: string;
  rotuloCliente: string;
  ordem: number;
  ativo: boolean;
}

/**
 * Atualiza em lote a configuração das etapas. Recebe a lista completa (uma
 * entrada por status) e grava cada uma numa transação — assim a reordenação
 * nunca deixa o banco num estado meio-atualizado. As etapas obrigatórias têm
 * `ativo` forçado a true, independente do que vier do cliente.
 */
export async function atualizarEtapas(etapas: AtualizarEtapaInput[]) {
  if (!etapas.length) {
    throw new AppError("Envie ao menos uma etapa para atualizar.", 400);
  }

  await garantirEtapasPadrao();

  await prisma.$transaction(
    etapas.map((etapa) =>
      prisma.configuracaoEtapa.update({
        where: { status: etapa.status },
        data: {
          rotulo: etapa.rotulo.trim(),
          rotuloCliente: etapa.rotuloCliente.trim(),
          ordem: etapa.ordem,
          ativo: ETAPAS_OBRIGATORIAS.includes(etapa.status) ? true : etapa.ativo,
        },
      })
    )
  );

  return prisma.configuracaoEtapa.findMany({ orderBy: { ordem: "asc" } });
}

/**
 * Mapa status -> rótulo mostrado ao cliente, usado pela notificação. Lê da
 * config; se a tabela ainda não existir/estiver vazia (ex: migration não
 * aplicada), cai no default para nunca quebrar o envio da notificação.
 */
export async function obterRotulosCliente(): Promise<Record<StatusOS, string>> {
  const fallback = Object.fromEntries(
    ETAPAS_PADRAO.map((e) => [e.status, e.rotuloCliente])
  ) as Record<StatusOS, string>;

  try {
    const etapas = await prisma.configuracaoEtapa.findMany();
    if (!etapas.length) return fallback;
    const mapa = { ...fallback };
    for (const etapa of etapas) mapa[etapa.status] = etapa.rotuloCliente;
    return mapa;
  } catch {
    return fallback;
  }
}
