import { Request, Response } from "express";
import { z } from "zod";
import * as equipamentoService from "./equipamento.service";

const equipamentoSchema = z.object({
  clienteId: z.string().uuid(),
  tipo: z.string().min(2),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  numeroSerie: z.string().optional(),
  localInstalacao: z.string().optional(),
  frequenciaManutencaoMeses: z.number().int().positive().nullable().optional(),
});

export async function listar(req: Request, res: Response) {
  const { clienteId } = req.query;
  const equipamentos = await equipamentoService.listarEquipamentos(clienteId as string | undefined);
  res.json(equipamentos);
}

// Precisa vir antes de "/:id" nas rotas para não colidir com o parâmetro.
export async function manutencoesPreventivas(_req: Request, res: Response) {
  res.json(await equipamentoService.listarManutencoesPreventivas());
}

export async function buscarPorId(req: Request, res: Response) {
  const equipamento = await equipamentoService.buscarEquipamentoPorId(req.params.id);
  res.json(equipamento);
}

export async function criar(req: Request, res: Response) {
  const dados = equipamentoSchema.parse(req.body);
  const equipamento = await equipamentoService.criarEquipamento(dados);
  res.status(201).json(equipamento);
}

export async function atualizar(req: Request, res: Response) {
  const dados = equipamentoSchema.partial().parse(req.body);
  const equipamento = await equipamentoService.atualizarEquipamento(req.params.id, dados);
  res.json(equipamento);
}
