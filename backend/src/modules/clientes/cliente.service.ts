import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

export interface ClienteInput {
  nome: string;
  documento?: string;
  telefone: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
}

export function listarClientes() {
  return prisma.cliente.findMany({
    orderBy: { nome: "asc" },
    include: { equipamentos: true },
  });
}

export async function buscarClientePorId(id: string) {
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: { equipamentos: true, ordensServico: true },
  });

  if (!cliente) throw new AppError("Cliente não encontrado.", 404);
  return cliente;
}

export function criarCliente(dados: ClienteInput) {
  return prisma.cliente.create({ data: dados });
}

export async function atualizarCliente(id: string, dados: Partial<ClienteInput>) {
  await buscarClientePorId(id); // garante que existe (ou lança 404)
  return prisma.cliente.update({ where: { id }, data: dados });
}

export async function removerCliente(id: string) {
  await buscarClientePorId(id);
  return prisma.cliente.delete({ where: { id } });
}
