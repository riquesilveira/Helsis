import { StatusOS } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

// ----------------------------------------------------------------------------
// Dados da empresa (PT3): uma linha só, id fixo "empresa".
// ----------------------------------------------------------------------------

export interface DadosEmpresa {
  nome: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
}

const EMPRESA_VAZIA: DadosEmpresa = { nome: null, telefone: null, whatsapp: null, email: null };

export async function obterEmpresa(): Promise<DadosEmpresa> {
  try {
    const e = await prisma.empresa.findUnique({ where: { id: "empresa" } });
    if (!e) return EMPRESA_VAZIA;
    return { nome: e.nome, telefone: e.telefone, whatsapp: e.whatsapp, email: e.email };
  } catch (err) {
    // O build e o start não rodam "prisma migrate deploy". Se o código chegar
    // a um banco sem a migração 20261124145658_empresa (tabela ausente, P2021),
    // o portal público segue funcionando, só sem os dados da empresa.
    if ((err as { code?: string })?.code === "P2021") {
      console.error("Tabela 'empresa' ausente: aplique a migração com prisma migrate deploy.");
      return EMPRESA_VAZIA;
    }
    throw err;
  }
}

export async function salvarEmpresa(dados: DadosEmpresa): Promise<DadosEmpresa> {
  const e = await prisma.empresa.upsert({
    where: { id: "empresa" },
    create: { id: "empresa", ...dados },
    update: dados,
  });
  return { nome: e.nome, telefone: e.telefone, whatsapp: e.whatsapp, email: e.email };
}

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
  ativo?: boolean; // default true; false = etapa desligada do fluxo padrão
}

export const ETAPAS_PADRAO: EtapaPadrao[] = [
  { status: "RECEBIDO", ordem: 0, rotulo: "Recebido", rotuloCliente: "Recebemos seu chamado" },
  {
    status: "DIAGNOSTICO",
    ordem: 1,
    rotulo: "Em diagnóstico",
    rotuloCliente: "Seu equipamento está em diagnóstico",
    ativo: false,
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
    ativo: false,
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
          ativo: etapa.ativo ?? true,
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
