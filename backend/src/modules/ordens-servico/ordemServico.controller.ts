import { Request, Response } from "express";
import { z } from "zod";
import { ModalidadeAtendimento, StatusOS, TipoOS } from "@prisma/client";
import * as osService from "./ordemServico.service";
import { listarNotificacoes } from "../notificacoes/notificacao.service";

const criarOSSchema = z.object({
  clienteId: z.string().uuid(),
  equipamentoId: z.string().uuid(),
  funcionarioId: z.string().uuid().optional(),
  tipo: z.nativeEnum(TipoOS).optional(),
  dataAgendada: z.string().optional(),
  modalidade: z.nativeEnum(ModalidadeAtendimento),
  descricaoProblema: z.string().min(5),
});

const atualizarStatusSchema = z.object({
  status: z.nativeEnum(StatusOS),
  observacao: z.string().optional(),
  funcionarioId: z.string().uuid().optional(),
  novaTentativa: z.boolean().optional(),
});

const registrarPecaSchema = z.object({
  pecaCatalogoId: z.string().uuid(),
  funcionarioId: z.string().uuid(),
  tipoServico: z.string().min(2),
  quantidade: z.number().int().positive().optional(),
  resolveuProblema: z.boolean().optional(),
  garantiaMeses: z.number().int().positive().optional(),
  precoUnitario: z.number().positive().optional(),
});

const atualizarFinanceiroSchema = z.object({
  valorMaoDeObra: z.number().nonnegative(),
  valorComissaoManual: z.number().nonnegative().optional(),
});

const registrarDeslocamentoSchema = z.object({
  funcionarioId: z.string().uuid(),
  origemCidade: z.string().min(2).optional(),
  destinoCidade: z.string().min(2).optional(),
  custoPassagem: z.number().nonnegative().optional(),
  custoHospedagem: z.number().nonnegative().optional(),
  custoAlimentacao: z.number().nonnegative().optional(),
  diasViagem: z.number().int().positive().optional(),
});

const atualizarDeslocamentoSchema = z.object({
  origemCidade: z.string().min(2).optional(),
  destinoCidade: z.string().min(2).optional(),
  custoPassagem: z.number().nonnegative().optional(),
  custoHospedagem: z.number().nonnegative().optional(),
  custoAlimentacao: z.number().nonnegative().optional(),
  diasViagem: z.number().int().positive().optional(),
});

export async function listar(req: Request, res: Response) {
  const { status, clienteId, funcionarioId, tipo } = req.query;
  const ordens = await osService.listarOrdensServico({
    status: status as StatusOS | undefined,
    clienteId: clienteId as string | undefined,
    funcionarioId: funcionarioId as string | undefined,
    tipo: tipo as TipoOS | undefined,
  });
  res.json(ordens);
}

export async function buscarPorId(req: Request, res: Response) {
  const os = await osService.buscarOrdemServicoPorId(req.params.id);
  res.json(os);
}

export async function criar(req: Request, res: Response) {
  const dados = criarOSSchema.parse(req.body);
  const os = await osService.criarOrdemServico(dados);
  res.status(201).json(os);
}

export async function atualizarStatus(req: Request, res: Response) {
  const dados = atualizarStatusSchema.parse(req.body);
  const os = await osService.atualizarStatus(req.params.id, dados);
  res.json(os);
}

export async function registrarPeca(req: Request, res: Response) {
  const dados = registrarPecaSchema.parse(req.body);
  const peca = await osService.registrarPecaTrocada(req.params.id, dados);
  res.status(201).json(peca);
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
  const deslocamento = await osService.atualizarDeslocamento(req.params.deslocamentoId, dados);
  res.json(deslocamento);
}

export async function excluirDeslocamento(req: Request, res: Response) {
  await osService.excluirDeslocamento(req.params.deslocamentoId);
  res.status(204).end();
}

export async function notificacoes(req: Request, res: Response) {
  res.json(await listarNotificacoes(req.params.id));
}
