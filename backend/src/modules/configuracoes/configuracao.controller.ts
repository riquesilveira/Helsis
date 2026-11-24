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

// Texto vazio vira null (campo limpo). WhatsApp guarda só dígitos.
const textoOpcional = z
  .string()
  .trim()
  .max(120)
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

const empresaSchema = z.object({
  nome: textoOpcional,
  telefone: textoOpcional,
  whatsapp: textoOpcional
    .transform((v) => (v ? v.replace(/\D/g, "") || null : null))
    .refine((v) => v == null || (v.length >= 10 && v.length <= 15), "WhatsApp: informe DDI + DDD + número, só dígitos."),
  email: textoOpcional.refine((v) => v == null || z.string().email().safeParse(v).success, "E-mail inválido."),
});

export async function obterEmpresa(_req: Request, res: Response) {
  res.json(await configuracaoService.obterEmpresa());
}

export async function salvarEmpresa(req: Request, res: Response) {
  const dados = empresaSchema.parse(req.body);
  res.json(await configuracaoService.salvarEmpresa(dados));
}

export async function listarEtapas(_req: Request, res: Response) {
  res.json(await configuracaoService.listarEtapas());
}

export async function atualizarEtapas(req: Request, res: Response) {
  const { etapas } = atualizarSchema.parse(req.body);
  res.json(await configuracaoService.atualizarEtapas(etapas));
}
