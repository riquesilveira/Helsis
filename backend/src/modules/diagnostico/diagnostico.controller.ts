import { Request, Response } from "express";
import { z } from "zod";
import * as diagnosticoService from "./diagnostico.service";

const causaSchema = z.object({
  codigo: z.string().min(1),
  descricao: z.string().min(2),
});

const defeitoSchema = z.object({
  codigo: z.string().min(1),
  descricao: z.string().min(2),
  tempoEstimadoMin: z.number().int().positive().optional(),
});

const solucaoSchema = z.object({
  codigo: z.string().min(1),
  descricao: z.string().min(2),
  tempoEstimadoMin: z.number().int().positive().optional(),
});

export async function listarCausas(_req: Request, res: Response) {
  res.json(await diagnosticoService.listarCausas());
}

export async function criarCausa(req: Request, res: Response) {
  const dados = causaSchema.parse(req.body);
  res.status(201).json(await diagnosticoService.criarCausa(dados));
}

export async function listarDefeitos(_req: Request, res: Response) {
  res.json(await diagnosticoService.listarDefeitos());
}

export async function criarDefeito(req: Request, res: Response) {
  const dados = defeitoSchema.parse(req.body);
  res.status(201).json(await diagnosticoService.criarDefeito(dados));
}

export async function listarSolucoes(_req: Request, res: Response) {
  res.json(await diagnosticoService.listarSolucoes());
}

export async function criarSolucao(req: Request, res: Response) {
  const dados = solucaoSchema.parse(req.body);
  res.status(201).json(await diagnosticoService.criarSolucao(dados));
}
