import { Request, Response } from "express";
import * as desempenhoService from "./desempenho.service";
import { buscarFuncionarioPorUsuarioId } from "../funcionarios/funcionario.service";

export async function desempenhoPorFuncionario(req: Request, res: Response) {
  const desempenho = await desempenhoService.calcularDesempenhoFuncionario(req.params.id);
  res.json(desempenho);
}

export async function ranking(_req: Request, res: Response) {
  res.json(await desempenhoService.rankingDesempenho());
}

// Usado pelo técnico pra ver o próprio desempenho antes de pedir um aumento
// — resolve o funcionário a partir do usuário logado, nunca de um id livre.
export async function meuDesempenho(req: Request, res: Response) {
  const funcionario = await buscarFuncionarioPorUsuarioId(req.usuario!.id);
  res.json(await desempenhoService.calcularDesempenhoFuncionario(funcionario.id));
}

// Resumo mensal (salário + comissão detalhada) — o dono gera isso pra
// imprimir/enviar ao técnico no fim do mês. Sem mês/ano informado, usa o
// mês atual.
export async function resumoMensal(req: Request, res: Response) {
  const agora = new Date();
  const mes = req.query.mes ? Number(req.query.mes) : agora.getMonth() + 1;
  const ano = req.query.ano ? Number(req.query.ano) : agora.getFullYear();
  res.json(await desempenhoService.calcularResumoMensal(req.params.id, mes, ano));
}
