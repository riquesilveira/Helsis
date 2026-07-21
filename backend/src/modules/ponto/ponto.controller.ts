import { Request, Response } from "express";
import * as pontoService from "./ponto.service";
import { buscarFuncionarioPorUsuarioId } from "../funcionarios/funcionario.service";

// O funcionarioId é sempre derivado do token — cada um só bate o próprio ponto.
async function funcionarioDoToken(req: Request) {
  const funcionario = await buscarFuncionarioPorUsuarioId(req.usuario!.id);
  return funcionario.id;
}

export async function meuPontoAtual(req: Request, res: Response) {
  const funcionarioId = await funcionarioDoToken(req);
  res.json(await pontoService.pontoAtual(funcionarioId));
}

export async function baterEntrada(req: Request, res: Response) {
  const funcionarioId = await funcionarioDoToken(req);
  res.status(201).json(await pontoService.registrarEntrada(funcionarioId));
}

export async function baterSaida(req: Request, res: Response) {
  const funcionarioId = await funcionarioDoToken(req);
  res.json(await pontoService.registrarSaida(funcionarioId));
}

export async function meusRegistros(req: Request, res: Response) {
  const funcionarioId = await funcionarioDoToken(req);
  res.json(await pontoService.listarMeusRegistros(funcionarioId));
}

// Visão consolidada — só gerente/dono (protegida na rota).
export async function listar(req: Request, res: Response) {
  const { funcionarioId, de, ate } = req.query;
  res.json(
    await pontoService.listarRegistros({
      funcionarioId: funcionarioId as string | undefined,
      de: de as string | undefined,
      ate: ate as string | undefined,
    })
  );
}
