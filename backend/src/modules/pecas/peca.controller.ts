import { Request, Response } from "express";
import { z } from "zod";
import * as pecaService from "./peca.service";

const pecaSchema = z.object({
  nome: z.string().min(2),
  categoria: z.string().optional(),
  garantiaPadraoMeses: z.number().int().positive().optional(),
  precoUnitario: z.number().positive().optional(),
});

export async function listar(_req: Request, res: Response) {
  res.json(await pecaService.listarPecas());
}

export async function criar(req: Request, res: Response) {
  const dados = pecaSchema.parse(req.body);
  res.status(201).json(await pecaService.criarPeca(dados));
}
