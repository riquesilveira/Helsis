import { Request, Response } from "express";
import { z } from "zod";
import * as funcionarioService from "./funcionario.service";
import { buscarRotaFuncionario } from "../ordens-servico/ordemServico.service";

const criarFuncionarioSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6),
  cargo: z.string().min(2),
  salarioAtual: z.number().positive(),
  dataAdmissao: z.string(),
  especialidades: z.array(z.string()).optional(),
});

const atualizarSalarioSchema = z.object({
  salarioAtual: z.number().positive(),
});

const atualizarComissaoSchema = z.object({
  tipoComissao: z.enum(["PERCENTUAL", "FIXO"]).nullable(),
  valorComissao: z.number().positive().nullable(),
});

export async function listar(_req: Request, res: Response) {
  res.json(await funcionarioService.listarFuncionarios());
}

export async function buscarPorId(req: Request, res: Response) {
  res.json(await funcionarioService.buscarFuncionarioPorId(req.params.id));
}

export async function criar(req: Request, res: Response) {
  const dados = criarFuncionarioSchema.parse(req.body);
  const funcionario = await funcionarioService.criarFuncionario(dados);
  res.status(201).json(funcionario);
}

export async function atualizarSalario(req: Request, res: Response) {
  const { salarioAtual } = atualizarSalarioSchema.parse(req.body);
  res.json(await funcionarioService.atualizarSalario(req.params.id, salarioAtual));
}

export async function atualizarComissao(req: Request, res: Response) {
  const dados = atualizarComissaoSchema.parse(req.body);
  res.json(await funcionarioService.atualizarComissao(req.params.id, dados));
}

// Rota do dia: quais clientes o técnico precisa atender, o que cada um
// pediu, e o que já foi feito em cada visita. Aceita ?data=AAAA-MM-DD;
// sem o parâmetro, assume hoje.
export async function rota(req: Request, res: Response) {
  const dataParam = req.query.data as string | undefined;
  const data = dataParam ? new Date(dataParam) : new Date();
  res.json(await buscarRotaFuncionario(req.params.id, data));
}

// Mesma coisa, mas resolvendo o técnico a partir do próprio login — usado
// pela tela "minha rota" do lado do técnico.
export async function minhaRota(req: Request, res: Response) {
  const funcionario = await funcionarioService.buscarFuncionarioPorUsuarioId(req.usuario!.id);
  const dataParam = req.query.data as string | undefined;
  const data = dataParam ? new Date(dataParam) : new Date();
  res.json(await buscarRotaFuncionario(funcionario.id, data));
}
