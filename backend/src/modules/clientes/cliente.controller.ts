import { Request, Response } from "express";
import { z } from "zod";
import * as clienteService from "./cliente.service";

const clienteSchema = z.object({
  nome: z.string().min(2),
  documento: z.string().optional(),
  telefone: z.string().min(8),
  email: z.string().email().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
});

export async function listar(_req: Request, res: Response) {
  const clientes = await clienteService.listarClientes();
  res.json(clientes);
}

export async function buscarPorId(req: Request, res: Response) {
  const cliente = await clienteService.buscarClientePorId(req.params.id);
  res.json(cliente);
}

export async function criar(req: Request, res: Response) {
  const dados = clienteSchema.parse(req.body);
  const cliente = await clienteService.criarCliente(dados);
  res.status(201).json(cliente);
}

export async function atualizar(req: Request, res: Response) {
  const dados = clienteSchema.partial().parse(req.body);
  const cliente = await clienteService.atualizarCliente(req.params.id, dados);
  res.json(cliente);
}

export async function remover(req: Request, res: Response) {
  await clienteService.removerCliente(req.params.id);
  res.status(204).send();
}
