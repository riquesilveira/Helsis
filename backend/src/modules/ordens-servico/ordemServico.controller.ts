import { Request, Response } from "express";
import { z } from "zod";
import { ModalidadeAtendimento, StatusOS, TipoOS } from "@prisma/client";
import * as osService from "./ordemServico.service";
import { buscarFuncionarioPorUsuarioId } from "../funcionarios/funcionario.service";
import { listarNotificacoes } from "../notificacoes/notificacao.service";
import { AppError } from "../../utils/AppError";

const criarOSSchema = z.object({
  clienteId: z.string().uuid(),
  equipamentoId: z.string().uuid(),
  funcionarioId: z.string().uuid().optional(),
  tipo: z.nativeEnum(TipoOS).optional(),
  dataAgendada: z.string().refine((v) => !isNaN(Date.parse(v)), "Data inválida.").optional(),
  modalidade: z.nativeEnum(ModalidadeAtendimento),
  descricaoProblema: z.string().min(5),
});

const atualizarStatusSchema = z.object({
  status: z.nativeEnum(StatusOS),
  observacao: z.string().optional(),
  funcionarioId: z.string().uuid().optional(),
  novaTentativa: z.boolean().optional(),
  // Diagnóstico codificado preenchido no fechamento (dropdowns padronizados).
  causaId: z.string().uuid().optional(),
  defeitoId: z.string().uuid().optional(),
  solucaoId: z.string().uuid().optional(),
});

// Para TECNICO, funcionarioId é derivado do token — não aceitar do body.
// Para DONO/GESTOR, funcionarioId pode vir do body (registrar em nome de outro).
const registrarPecaSchema = z.object({
  pecaCatalogoId: z.string().uuid(),
  funcionarioId: z.string().uuid().optional(),
  tipoServico: z.string().min(2),
  quantidade: z.number().int().positive().optional(),
  resolveuProblema: z.boolean().optional(),
  garantiaMeses: z.number().int().positive().optional(),
  precoUnitario: z.number().positive().optional(),
});

const atribuirTecnicoSchema = z.object({
  funcionarioId: z.string().uuid(),
});

const atualizarFinanceiroSchema = z.object({
  valorMaoDeObra: z.number().nonnegative(),
  valorComissaoManual: z.number().nonnegative().optional(),
});

const registrarDeslocamentoSchema = z.object({
  funcionarioId: z.string().uuid(),
  modalTransporte: z.enum(["CARRO", "AVIAO"]).optional(),
  origemCidade: z.string().min(2).optional(),
  destinoCidade: z.string().min(2).optional(),
  custoPassagem: z.number().nonnegative().optional(),
  custoHospedagem: z.number().nonnegative().optional(),
  custoAlimentacao: z.number().nonnegative().optional(),
  diasViagem: z.number().int().positive().optional(),
});

const atualizarDeslocamentoSchema = z.object({
  modalTransporte: z.enum(["CARRO", "AVIAO"]).optional(),
  origemCidade: z.string().min(2).optional(),
  destinoCidade: z.string().min(2).optional(),
  custoPassagem: z.number().nonnegative().optional(),
  custoHospedagem: z.number().nonnegative().optional(),
  custoAlimentacao: z.number().nonnegative().optional(),
  diasViagem: z.number().int().positive().optional(),
});

export async function listar(req: Request, res: Response) {
  const { status, clienteId, funcionarioId, tipo } = req.query;
  const papel = req.usuario!.papel;

  let filtroClienteId = clienteId as string | undefined;
  let filtroFuncionarioId = funcionarioId as string | undefined;

  if (papel === "CLIENTE") {
    // CLIENTE só vê suas próprias OS — força o filtro pelo clienteId vinculado ao login
    const cliente = await osService.buscarClientePorUsuarioId(req.usuario!.id);
    if (!cliente) throw new AppError("Nenhum perfil de cliente associado a este usuário.", 404);
    filtroClienteId = cliente.id;
  } else if (papel === "TECNICO") {
    // TECNICO só vê as OS atribuídas a ele — força o filtro pelo funcionarioId do login
    const funcionario = await buscarFuncionarioPorUsuarioId(req.usuario!.id);
    filtroFuncionarioId = funcionario.id;
  }

  const ordens = await osService.listarOrdensServico({
    status: status as StatusOS | undefined,
    clienteId: filtroClienteId,
    funcionarioId: filtroFuncionarioId,
    tipo: tipo as TipoOS | undefined,
  });
  res.json(ordens);
}

export async function buscarPorId(req: Request, res: Response) {
  const os = await osService.buscarOrdemServicoPorId(req.params.id);
  const papel = req.usuario!.papel;

  if (papel === "TECNICO") {
    const funcionario = await buscarFuncionarioPorUsuarioId(req.usuario!.id);
    if (os.funcionarioId !== funcionario.id) {
      throw new AppError("Você não tem permissão para visualizar esta ordem de serviço.", 403);
    }
  } else if (papel === "CLIENTE") {
    const cliente = await osService.buscarClientePorUsuarioId(req.usuario!.id);
    if (!cliente || os.clienteId !== cliente.id) {
      throw new AppError("Você não tem permissão para visualizar esta ordem de serviço.", 403);
    }
  }

  res.json(os);
}

export async function criar(req: Request, res: Response) {
  const dados = criarOSSchema.parse(req.body);
  const os = await osService.criarOrdemServico(dados);
  res.status(201).json(os);
}

export async function atualizarStatus(req: Request, res: Response) {
  const dados = atualizarStatusSchema.parse(req.body);

  // TECNICO só pode alterar status de OS atribuída a ele
  if (req.usuario!.papel === "TECNICO") {
    const os = await osService.buscarOrdemServicoPorId(req.params.id);
    const funcionario = await buscarFuncionarioPorUsuarioId(req.usuario!.id);
    if (os.funcionarioId !== funcionario.id) {
      throw new AppError("Você não tem permissão para alterar esta ordem de serviço.", 403);
    }
    // Fechamento parcial × total: o técnico (N1) só faz o fechamento parcial
    // (AGUARDANDO_VALIDACAO). O fechamento total (CONCLUIDO) é validado pelo
    // Suporte (N2) para cima.
    if (dados.status === "CONCLUIDO") {
      throw new AppError(
        "Técnico faz o fechamento parcial (aguardando validação). A conclusão é feita pelo Suporte.",
        403
      );
    }
  }

  const os = await osService.atualizarStatus(req.params.id, dados);
  res.json(os);
}

export async function registrarPeca(req: Request, res: Response) {
  const dadosBrutos = registrarPecaSchema.parse(req.body);

  let funcionarioId = dadosBrutos.funcionarioId;

  if (req.usuario!.papel === "TECNICO") {
    // Para TECNICO, deriva o funcionarioId do token e verifica que a OS é dele
    const funcionario = await buscarFuncionarioPorUsuarioId(req.usuario!.id);
    const os = await osService.buscarOrdemServicoPorId(req.params.id);
    if (os.funcionarioId !== funcionario.id) {
      throw new AppError("Você não tem permissão para registrar peças nesta ordem de serviço.", 403);
    }
    funcionarioId = funcionario.id;
  }

  if (!funcionarioId) {
    throw new AppError("funcionarioId é obrigatório.", 400);
  }

  const peca = await osService.registrarPecaTrocada(req.params.id, { ...dadosBrutos, funcionarioId });
  res.status(201).json(peca);
}

export async function atribuirTecnico(req: Request, res: Response) {
  const { funcionarioId } = atribuirTecnicoSchema.parse(req.body);
  const os = await osService.atribuirTecnico(req.params.id, funcionarioId);
  res.json(os);
}

export async function atualizarFinanceiro(req: Request, res: Response) {
  const dados = atualizarFinanceiroSchema.parse(req.body);
  const os = await osService.atualizarFinanceiro(req.params.id, dados);
  res.json(os);
}

// Rota pública — é a tela que o cliente usa pra acompanhar o atendimento,
// sem precisar de login (usando o id/número da OS, tipo rastreio de entrega).
export async function acompanhamentoPublico(req: Request, res: Response) {
  const os = await osService.buscarAcompanhamentoPublico(req.params.id);
  res.json(os);
}

export async function registrarDeslocamento(req: Request, res: Response) {
  const dados = registrarDeslocamentoSchema.parse(req.body);
  const deslocamento = await osService.registrarDeslocamento(req.params.id, dados);
  res.status(201).json(deslocamento);
}

export async function atualizarDeslocamento(req: Request, res: Response) {
  const dados = atualizarDeslocamentoSchema.parse(req.body);
  const deslocamento = await osService.atualizarDeslocamento(
    req.params.deslocamentoId,
    req.params.id,
    dados
  );
  res.json(deslocamento);
}

export async function excluirDeslocamento(req: Request, res: Response) {
  await osService.excluirDeslocamento(req.params.deslocamentoId, req.params.id);
  res.status(204).end();
}

export async function notificacoes(req: Request, res: Response) {
  res.json(await listarNotificacoes(req.params.id));
}
