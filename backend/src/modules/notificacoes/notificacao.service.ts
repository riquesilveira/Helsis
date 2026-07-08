import { CanalNotificacao, StatusNotificacao, StatusOS } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { ProvedorNotificacao } from "./notificacao.types";
import { ConsoleProvider } from "./providers/console.provider";

const ROTULOS_STATUS: Record<StatusOS, string> = {
  RECEBIDO: "Recebemos seu chamado",
  DIAGNOSTICO: "Seu equipamento está em diagnóstico",
  AGUARDANDO_PECA: "Aguardando chegada de peça",
  EM_REPARO: "Seu equipamento está em reparo",
  CONCLUIDO: "O reparo foi concluído e o equipamento já está liberado para uso",
  CANCELADO: "O atendimento foi cancelado",
};

let provedorCache: ProvedorNotificacao | null = null;

/**
 * Escolhe o provedor com base na variável de ambiente NOTIFICATION_PROVIDER.
 * Padrão é "console" (modo simulado) — assim o sistema funciona sem nenhuma
 * credencial configurada. Para produção, defina NOTIFICATION_PROVIDER=twilio
 * e as credenciais correspondentes no .env.
 *
 * O import da Twilio é feito de forma preguiçosa (só quando o provedor é
 * realmente "twilio") para o sistema não exigir as variáveis de ambiente da
 * Twilio quando estiver rodando em modo simulado.
 */
function obterProvedor(): ProvedorNotificacao {
  if (provedorCache) return provedorCache;

  const nomeProvedor = process.env.NOTIFICATION_PROVIDER || "console";

  if (nomeProvedor === "twilio") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { TwilioProvider } = require("./providers/twilio.provider");
    provedorCache = new TwilioProvider();
  } else {
    provedorCache = new ConsoleProvider();
  }

  return provedorCache as ProvedorNotificacao;
}

function montarMensagem(os: {
  id: string;
  numero: number;
  statusAtual: StatusOS;
  equipamento: { tipo: string };
}): string {
  const linkAcompanhamento = `${process.env.FRONTEND_URL || "http://localhost:5173"}/acompanhar/${
    os.id
  }`;

  return [
    `Atendimento nº ${os.numero} — ${os.equipamento.tipo}`,
    ROTULOS_STATUS[os.statusAtual] + ".",
    `Acompanhe em tempo real: ${linkAcompanhamento}`,
  ].join("\n");
}

/**
 * Notifica o cliente sobre a mudança de status de uma OS e registra o
 * resultado do envio (sucesso ou falha) no histórico de notificações.
 * Erros de envio NUNCA devem quebrar o fluxo principal da OS — por isso essa
 * função captura qualquer exceção internamente.
 */
export async function notificarClienteSobreStatus(osId: string) {
  const os = await prisma.ordemServico.findUnique({
    where: { id: osId },
    include: { cliente: true, equipamento: true },
  });

  if (!os || !os.cliente.telefone) return;

  const canal = (process.env.NOTIFICATION_CHANNEL as CanalNotificacao) || CanalNotificacao.WHATSAPP;
  const mensagem = montarMensagem(os);

  let resultado: { sucesso: boolean; erro?: string };
  try {
    resultado = await obterProvedor().enviar(os.cliente.telefone, mensagem);
  } catch (err) {
    resultado = { sucesso: false, erro: err instanceof Error ? err.message : "Erro desconhecido." };
  }

  await prisma.notificacao.create({
    data: {
      ordemServicoId: os.id,
      canal,
      destinatario: os.cliente.telefone,
      mensagem,
      status: resultado.sucesso ? StatusNotificacao.ENVIADA : StatusNotificacao.FALHOU,
      erro: resultado.erro,
    },
  });
}

export function listarNotificacoes(ordemServicoId: string) {
  return prisma.notificacao.findMany({
    where: { ordemServicoId },
    orderBy: { enviadaEm: "desc" },
  });
}
