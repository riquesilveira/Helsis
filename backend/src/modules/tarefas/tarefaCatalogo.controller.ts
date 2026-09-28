import { Request, Response } from "express";
import { z } from "zod";
import * as tarefaCatalogoService from "./tarefaCatalogo.service";

const tarefaCatalogoSchema = z.object({
  codigo: z.string().min(1),
  descricao: z.string().min(2),
  tempoEstimadoMin: z.number().int().positive().optional(),
});

export async function listar(_req: Request, res: Response) {
  res.json(await tarefaCatalogoService.listarTarefasCatalogo());
}

export async function criar(req: Request, res: Response) {
  const dados = tarefaCatalogoSchema.parse(req.body);
  res.status(201).json(await tarefaCatalogoService.criarTarefaCatalogo(dados));
}

export async function atualizar(req: Request, res: Response) {
  const dados = tarefaCatalogoSchema.partial().parse(req.body);
  res.json(await tarefaCatalogoService.atualizarTarefaCatalogo(req.params.id, dados));
}

export async function desativar(req: Request, res: Response) {
  await tarefaCatalogoService.desativarTarefaCatalogo(req.params.id);
  res.status(204).send();
}
