import { Request, Response } from "express";
import { z } from "zod";
import * as configuracaoService from "./configuracao.service";

const STATUS_VALIDOS = [
  "RECEBIDO",
  "DIAGNOSTICO",
  "AGUARDANDO_PECA",
  "EM_REPARO",
  "AGUARDANDO_VALIDACAO",
  "CONCLUIDO",
  "CANCELADO",
] as const;

const etapaSchema = z.object({
  status: z.enum(STATUS_VALIDOS),
  rotulo: z.string().trim().min(1, "O rótulo da etapa não pode ficar vazio."),
  rotuloCliente: z
    .string()
    .trim()
    .min(1, "O rótulo mostrado ao cliente não pode ficar vazio."),
  ordem: z.number().int().min(0),
  ativo: z.boolean(),
});

const atualizarSchema = z.object({
  etapas: z.array(etapaSchema).min(1),
});

export async function listarEtapas(_req: Request, res: Response) {
  res.json(await configuracaoService.listarEtapas());
}

export async function atualizarEtapas(req: Request, res: Response) {
  const { etapas } = atualizarSchema.parse(req.body);
  res.json(await configuracaoService.atualizarEtapas(etapas));
}
