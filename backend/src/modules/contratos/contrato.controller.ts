import { Request, Response } from "express";
import { z } from "zod";
import * as contratoService from "./contrato.service";

const contratoSchema = z.object({
  clienteId: z.string().uuid(),
  equipamentoId: z.string().uuid().nullable().optional(),
  numero: z.string().nullable().optional(),
  slaHorasResposta: z.number().int().positive(),
  vigenciaInicio: z.coerce.date(),
  vigenciaFim: z.coerce.date().nullable().optional(),
  ativo: z.boolean().optional(),
  observacoes: z.string().nullable().optional(),
});

export async function listar(req: Request, res: Response) {
  const { clienteId } = req.query;
  res.json(await contratoService.listarContratos(clienteId as string | undefined));
}

export async function buscarPorId(req: Request, res: Response) {
  res.json(await contratoService.buscarContratoPorId(req.params.id));
}

export async function criar(req: Request, res: Response) {
  const dados = contratoSchema.parse(req.body);
  res.status(201).json(await contratoService.criarContrato(dados));
}

export async function atualizar(req: Request, res: Response) {
  const dados = contratoSchema.partial().parse(req.body);
  res.json(await contratoService.atualizarContrato(req.params.id, dados));
}

export async function excluir(req: Request, res: Response) {
  await contratoService.excluirContrato(req.params.id);
  res.status(204).send();
}
