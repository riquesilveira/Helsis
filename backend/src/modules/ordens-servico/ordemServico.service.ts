import { ModalidadeAtendimento, StatusOS, TipoOS } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { notificarClienteSobreStatus } from "../notificacoes/notificacao.service";
import { registrarManutencaoPreventivaConcluida, somarMeses } from "../equipamentos/equipamento.service";

export interface CriarOSInput {
  clienteId: string;
  equipamentoId: string;
  funcionarioId?: string;
  tipo?: TipoOS;
  dataAgendada?: string;
  modalidade: ModalidadeAtendimento;
  descricaoProblema: string;
}

export interface AtualizarStatusInput {
  status: StatusOS;
  observacao?: string;
  funcionarioId?: string;
  /**
   * Marque true quando essa mudança de status representa uma NOVA tentativa
   * de resolver o problema (ex: voltou pra "EM_REPARO" porque a peça trocada
   * não resolveu). Isso é o que alimenta a métrica de "resolveu na primeira?".
   */
  novaTentativa?: boolean;
  /**
   * Diagnóstico codificado, preenchido no fechamento por dropdowns. São
   * opcionais aqui porque só fazem sentido no fechamento (parcial ou total),
   * não em toda mudança de status.
   */
  causaId?: string;
  defeitoId?: string;
  solucaoId?: string;
}

export interface RegistrarPecaInput {
  pecaCatalogoId: string;
  funcionarioId: string;
  tipoServico: string;
  quantidade?: number;
  resolveuProblema?: boolean;
  garantiaMeses?: number;
  precoUnitario?: number;
}

export interface AtualizarFinanceiroInput {
  valorMaoDeObra: number;
  /** Se informado, sobrescreve o cálculo automático da comissão. */
  valorComissaoManual?: number;
}

export interface RegistrarDeslocamentoInput {
  funcionarioId: string;
  modalTransporte?: "CARRO" | "AVIAO";
  origemCidade?: string;
  destinoCidade?: string;
  custoPassagem?: number;
  custoHospedagem?: number;
  custoAlimentacao?: number;
  diasViagem?: number;
}

export interface AtualizarDeslocamentoInput {
  modalTransporte?: "CARRO" | "AVIAO";
  origemCidade?: string;
  destinoCidade?: string;
  custoPassagem?: number;
  custoHospedagem?: number;
  custoAlimentacao?: number;
  diasViagem?: number;
}

function filtrosBusca(query: {
  status?: StatusOS;
  clienteId?: string;
  funcionarioId?: string;
  tipo?: TipoOS;
}) {
  const where: Record<string, unknown> = {};
  if (query.status) where.statusAtual = query.status;
  if (query.clienteId) where.clienteId = query.clienteId;
  if (query.funcionarioId) where.funcionarioId = query.funcionarioId;
  if (query.tipo) where.tipo = query.tipo;
  return where;
}

export function listarOrdensServico(query: {
  status?: StatusOS;
  clienteId?: string;
  funcionarioId?: string;
  tipo?: TipoOS;
}) {
  return prisma.ordemServico.findMany({
    where: filtrosBusca(query),
    include: {
      cliente: true,
      equipamento: true,
      funcionario: { include: { usuario: true } },
      pecasTrocadas: { include: { pecaCatalogo: true } },
      deslocamentos: true,
    },
    orderBy: { criadoEm: "desc" },
  });
}

export async function buscarOrdemServicoPorId(id: string) {
  const os = await prisma.ordemServico.findUnique({
    where: { id },
    include: {
      cliente: true,
      equipamento: true,
      funcionario: { include: { usuario: true } },
      statusHistoricos: { orderBy: { criadoEm: "asc" } },
      pecasTrocadas: { include: { pecaCatalogo: true } },
      deslocamentos: true,
      causa: true,
      defeito: true,
      solucao: true,
    },
  });

  if (!os) throw new AppError("Ordem de serviço não encontrada.", 404);
  return os;
}

/**
 * Resolve o perfil de cliente a partir do id do USUÁRIO logado (vindo do token JWT).
 * Retorna null se o usuário não tiver um perfil de cliente associado.
 */
export async function buscarClientePorUsuarioId(usuarioId: string) {
  return prisma.cliente.findUnique({ where: { usuarioId } });
}

export async function criarOrdemServico(dados: CriarOSInput) {
  const os = await prisma.ordemServico.create({
    data: {
      ...dados,
      dataAgendada: dados.dataAgendada ? new Date(dados.dataAgendada) : undefined,
      statusAtual: StatusOS.RECEBIDO,
      statusHistoricos: {
        create: {
          status: StatusOS.RECEBIDO,
          tentativaNumero: 1,
          funcionarioId: dados.funcionarioId,
          observacao:
            dados.tipo === TipoOS.PREVENTIVA
              ? "Manutenção preventiva agendada."
              : "Chamado aberto.",
        },
      },
    },
    include: { statusHistoricos: true },
  });

  // Não bloqueia a resposta da API esperando o envio da notificação — e
  // qualquer falha de envio já é tratada e registrada dentro da função.
  notificarClienteSobreStatus(os.id).catch((err) =>
    console.error("Falha ao notificar cliente sobre abertura da OS:", err)
  );

  return os;
}

/**
 * Designa (ou reatribui) o técnico responsável por uma OS. É a função que o
 * Suporte (N2) usa para distribuir os chamados abertos entre os técnicos, ou
 * para passar um chamado de um técnico para outro. Registra a troca na
 * timeline pra ficar rastreável quem passou pra quem, sem mexer no status.
 */
export async function atribuirTecnico(osId: string, funcionarioId: string) {
  const os = await buscarOrdemServicoPorId(osId);

  const funcionario = await prisma.funcionario.findUnique({
    where: { id: funcionarioId },
    include: { usuario: { select: { nome: true } } },
  });
  if (!funcionario) throw new AppError("Técnico não encontrado.", 404);

  const eraReatribuicao = os.funcionarioId && os.funcionarioId !== funcionarioId;
  const observacao = eraReatribuicao
    ? `Chamado reatribuído para ${funcionario.usuario.nome}.`
    : `Chamado designado a ${funcionario.usuario.nome}.`;

  return prisma.ordemServico.update({
    where: { id: osId },
    data: {
      funcionarioId,
      statusHistoricos: {
        create: {
          status: os.statusAtual,
          observacao,
          funcionarioId,
          tentativaNumero: os.numeroTentativas + 1,
        },
      },
    },
    include: {
      cliente: true,
      equipamento: true,
      funcionario: { include: { usuario: true } },
      statusHistoricos: { orderBy: { criadoEm: "asc" } },
      pecasTrocadas: { include: { pecaCatalogo: true } },
      deslocamentos: true,
    },
  });
}

/**
 * Atualiza o status da OS e registra a entrada correspondente na timeline.
 * É essa timeline que o cliente enxerga como "acompanhamento", igual rastreio
 * de entrega.
 */
export async function atualizarStatus(osId: string, dados: AtualizarStatusInput) {
  const os = await buscarOrdemServicoPorId(osId);

  // tentativaNumero no histórico é sempre baseado em os.numeroTentativas (valor
  // ANTES de qualquer incremento nesta chamada) + 1, de forma que a primeira
  // tentativa (numeroTentativas=0) gere tentativaNumero=1, a segunda gere 2, etc.
  const tentativaNumeroHistorico = os.numeroTentativas + 1;

  // Só incrementa o contador de tentativas quando novaTentativa=true.
  const novoNumeroTentativas = dados.novaTentativa ? os.numeroTentativas + 1 : os.numeroTentativas;

  const dadosAtualizacao: Record<string, unknown> = {
    statusAtual: dados.status,
    numeroTentativas: novoNumeroTentativas,
    statusHistoricos: {
      create: {
        status: dados.status,
        observacao: dados.observacao,
        funcionarioId: dados.funcionarioId,
        tentativaNumero: tentativaNumeroHistorico,
      },
    },
  };

  // Diagnóstico codificado (Causa / Defeito / Solução) — preenchido no
  // fechamento. Só grava os campos que vieram, pra não apagar um diagnóstico
  // já registrado quando o status muda por outro motivo.
  if (dados.causaId !== undefined) dadosAtualizacao.causaId = dados.causaId;
  if (dados.defeitoId !== undefined) dadosAtualizacao.defeitoId = dados.defeitoId;
  if (dados.solucaoId !== undefined) dadosAtualizacao.solucaoId = dados.solucaoId;

  // Quando a OS é concluída, fixamos se foi resolvida já na primeira tentativa.
  // Usa os.numeroTentativas (antes do incremento) para refletir o estado REAL:
  // se o técnico nunca registrou uma nova tentativa antes deste CONCLUIDO, é primeira.
  if (dados.status === StatusOS.CONCLUIDO) {
    dadosAtualizacao.dataConclusao = new Date();
    dadosAtualizacao.resolvidoNaPrimeira = os.numeroTentativas === 0;
  }

  const osAtualizada = await prisma.ordemServico.update({
    where: { id: osId },
    data: dadosAtualizacao,
    include: { statusHistoricos: { orderBy: { criadoEm: "asc" } } },
  });

  // Quando uma manutenção PREVENTIVA é concluída, o plano do equipamento
  // avança automaticamente para a próxima data prevista — é isso que
  // mantém a agenda de manutenções preventivas sempre em dia sem trabalho
  // manual do dono.
  if (dados.status === StatusOS.CONCLUIDO && os.tipo === TipoOS.PREVENTIVA) {
    registrarManutencaoPreventivaConcluida(os.equipamentoId).catch((err) =>
      console.error("Falha ao atualizar o plano de manutenção preventiva:", err)
    );
  }

  notificarClienteSobreStatus(osId).catch((err) =>
    console.error("Falha ao notificar cliente sobre mudança de status:", err)
  );

  return osAtualizada;
}

/**
 * Registra a troca/uso de uma peça numa OS. Guarda a tentativa em que foi
 * usada e se resolveu o problema — é isso que permite ao dono ver, por
 * exemplo, que o técnico errou a peça 2 vezes antes de acertar.
 */
export async function registrarPecaTrocada(osId: string, dados: RegistrarPecaInput) {
  const os = await buscarOrdemServicoPorId(osId);

  const garantiaAte = dados.garantiaMeses
    ? somarMeses(new Date(), dados.garantiaMeses)
    : null;

  // Se o preço não veio explícito, usa o preço padrão cadastrado no
  // catálogo (snapshot — muda o catálogo depois, essa troca já registrada
  // continua com o preço praticado na época).
  let precoUnitario = dados.precoUnitario;
  if (precoUnitario === undefined) {
    const peca = await prisma.pecaCatalogo.findUnique({ where: { id: dados.pecaCatalogoId } });
    precoUnitario = peca?.precoUnitario ? Number(peca.precoUnitario) : undefined;
  }

  return prisma.pecaTrocada.create({
    data: {
      ordemServicoId: osId,
      pecaCatalogoId: dados.pecaCatalogoId,
      funcionarioId: dados.funcionarioId,
      tipoServico: dados.tipoServico,
      quantidade: dados.quantidade ?? 1,
      resolveuProblema: dados.resolveuProblema ?? null,
      tentativaNumero: os.numeroTentativas + 1,
      garantiaAte,
      precoUnitario,
    },
  });
}

/**
 * Fecha o valor financeiro do atendimento: define a mão de obra e calcula
 * a comissão do técnico com base na configuração dele (percentual ou
 * fixo). A comissão incide SOMENTE sobre a mão de obra — peça é custo
 * repassado ao cliente, não gera comissão. Pode ser sobrescrita
 * manualmente quando um atendimento específico precisa de um ajuste.
 */
export async function atualizarFinanceiro(osId: string, dados: AtualizarFinanceiroInput) {
  const os = await prisma.ordemServico.findUnique({
    where: { id: osId },
    include: { funcionario: true },
  });
  if (!os) throw new AppError("Ordem de serviço não encontrada.", 404);

  let valorComissao: number | null = dados.valorComissaoManual ?? null;

  if (valorComissao === null && os.funcionario?.tipoComissao) {
    const valorConfig = Number(os.funcionario.valorComissao ?? 0);
    valorComissao =
      os.funcionario.tipoComissao === "PERCENTUAL"
        ? (dados.valorMaoDeObra * valorConfig) / 100
        : valorConfig;
  }

  return prisma.ordemServico.update({
    where: { id: osId },
    data: { valorMaoDeObra: dados.valorMaoDeObra, valorComissao },
    include: { pecasTrocadas: { include: { pecaCatalogo: true } } },
  });
}

/**
 * Registra um deslocamento (viagem) vinculado a uma OS. Guarda custos de
 * passagem, hospedagem e alimentação — são esses valores que alimentam as
 * métricas de despesa no dashboard.
 */
export async function registrarDeslocamento(osId: string, dados: RegistrarDeslocamentoInput) {
  await buscarOrdemServicoPorId(osId);

  return prisma.deslocamento.create({
    data: {
      ordemServicoId: osId,
      funcionarioId: dados.funcionarioId,
      modalTransporte: dados.modalTransporte,
      origemCidade: dados.origemCidade,
      destinoCidade: dados.destinoCidade,
      custoPassagem: dados.custoPassagem,
      custoHospedagem: dados.custoHospedagem,
      custoAlimentacao: dados.custoAlimentacao,
      diasViagem: dados.diasViagem,
    },
  });
}

export async function atualizarDeslocamento(
  deslocamentoId: string,
  ordemServicoId: string,
  dados: AtualizarDeslocamentoInput
) {
  const deslocamento = await prisma.deslocamento.findUnique({ where: { id: deslocamentoId } });
  if (!deslocamento || deslocamento.ordemServicoId !== ordemServicoId) {
    throw new AppError("Deslocamento não encontrado nesta ordem de serviço.", 404);
  }

  return prisma.deslocamento.update({
    where: { id: deslocamentoId },
    data: {
      modalTransporte: dados.modalTransporte,
      origemCidade: dados.origemCidade,
      destinoCidade: dados.destinoCidade,
      custoPassagem: dados.custoPassagem,
      custoHospedagem: dados.custoHospedagem,
      custoAlimentacao: dados.custoAlimentacao,
      diasViagem: dados.diasViagem,
    },
  });
}

export async function excluirDeslocamento(deslocamentoId: string, ordemServicoId: string) {
  const deslocamento = await prisma.deslocamento.findUnique({ where: { id: deslocamentoId } });
  if (!deslocamento || deslocamento.ordemServicoId !== ordemServicoId) {
    throw new AppError("Deslocamento não encontrado nesta ordem de serviço.", 404);
  }

  return prisma.deslocamento.delete({ where: { id: deslocamentoId } });
}

/**
 * Monta a "rota do dia" de um técnico: as OS agendadas pra data pedida, mais
 * qualquer outra OS em aberto atribuída a ele (mesmo sem data definida) —
 * assim nada fica escondido só porque ninguém marcou uma data ainda.
 * Cada OS já vem com cliente, equipamento, peças trocadas e histórico de
 * status, pra tela mostrar "o que foi pedido" e "o que já foi feito" sem
 * precisar de uma segunda consulta por OS.
 */
export async function buscarRotaFuncionario(funcionarioId: string, data: Date) {
  const inicioDia = new Date(data);
  inicioDia.setHours(0, 0, 0, 0);
  const fimDia = new Date(inicioDia);
  fimDia.setDate(fimDia.getDate() + 1);

  const includeComum = {
    cliente: true,
    equipamento: true,
    pecasTrocadas: { include: { pecaCatalogo: true } },
    statusHistoricos: { orderBy: { criadoEm: "asc" as const } },
  };

  const agendadasParaData = await prisma.ordemServico.findMany({
    where: { funcionarioId, dataAgendada: { gte: inicioDia, lt: fimDia } },
    include: includeComum,
    orderBy: { dataAgendada: "asc" },
  });

  const idsJaListados = agendadasParaData.map((os) => os.id);

  const outrasEmAberto = await prisma.ordemServico.findMany({
    where: {
      funcionarioId,
      id: { notIn: idsJaListados },
      statusAtual: { notIn: [StatusOS.CONCLUIDO, StatusOS.CANCELADO] },
    },
    include: includeComum,
    orderBy: { dataAbertura: "asc" },
  });

  return { agendadasParaData, outrasEmAberto };
}

/**
 * Versão enxuta da OS pensada pra tela pública de acompanhamento do cliente
 * (não expõe dados internos como quem é o técnico ou peças/custos).
 */
export async function buscarAcompanhamentoPublico(id: string) {
  const os = await prisma.ordemServico.findUnique({
    where: { id },
    select: {
      numero: true,
      statusAtual: true,
      tipo: true,
      modalidade: true,
      dataAbertura: true,
      dataConclusao: true,
      equipamento: { select: { tipo: true, marca: true, modelo: true } },
      statusHistoricos: {
        orderBy: { criadoEm: "asc" },
        select: { status: true, observacao: true, criadoEm: true },
      },
    },
  });

  if (!os) throw new AppError("Ordem de serviço não encontrada.", 404);
  return os;
}
